const multer = require('multer');
const { Op } = require('sequelize');
const { sequelize, CreditCard, CreditCardPurchase, CreditCardInvoice, User } = require('../models');
const { parseCSV, parseOFX, detectCategory } = require('./importController');
const parsePDF = require('pdf-parse');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const accepted = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'];
        if (accepted.includes(file.mimetype) || /\.(csv|ofx|pdf)$/i.test(file.originalname)) return cb(null, true);
        return cb(new Error('Apenas arquivos CSV, OFX e PDF são permitidos'));
    }
});

const normalizeHeader = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const parseBrazilianAmount = (value) => {
    let normalized = String(value || '').trim().replace(/\s/g, '').replace(/R\$/i, '');
    if (!normalized) return NaN;
    const negativeByParentheses = /^\(.*\)$/.test(normalized);
    normalized = normalized.replace(/[()]/g, '').replace(/[^\d,\.\-+]/g, '');
    if (normalized.includes(',') && normalized.includes('.')) {
        const decimalSeparator = normalized.lastIndexOf(',') > normalized.lastIndexOf('.') ? ',' : '.';
        normalized = normalized.replace(decimalSeparator === ',' ? /\./g : /,/g, '').replace(decimalSeparator, '.');
    } else if (normalized.includes(',')) {
        normalized = normalized.replace(/,/g, '.');
    }
    const amount = Number(normalized);
    return negativeByParentheses ? -Math.abs(amount) : amount;
};

const parseStatementDate = (value) => {
    const date = String(value || '').trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const normalizeCSVRows = (rows) => rows.map((row) => {
    const keys = Object.keys(row);
    const findKey = (candidates) => keys.find((key) => {
        const header = normalizeHeader(key).replace(/[^a-z0-9]/g, '');
        return candidates.includes(header) || candidates.some((candidate) => ['valor', 'amount', 'total'].includes(candidate) && header.startsWith(candidate));
    });
    const dateKey = findKey(['data', 'date', 'dtposted', 'compra', 'lancamento', 'datadacompra']);
    const descriptionKey = findKey(['descricao', 'description', 'historico', 'memo', 'estabelecimento', 'merchant', 'title', 'lancamento', 'transacao']);
    const amountKey = findKey(['valor', 'amount', 'trnamt', 'debito', 'credito', 'total']);
    return {
        date: parseStatementDate(dateKey ? row[dateKey] : ''),
        description: descriptionKey ? row[descriptionKey] : 'Compra importada',
        amount: parseBrazilianAmount(amountKey ? row[amountKey] : '')
    };
});

const portugueseMonths = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };

const parseInterInvoicePDF = async (buffer) => {
    const { text } = await parsePDF(buffer);
    if (!/Despesas da fatura/i.test(text) || !/Total da sua fatura/i.test(text)) {
        throw new Error('PDF não reconhecido como fatura do Inter ou sem texto selecionável');
    }

    const sectionStart = text.search(/Despesas da fatura/i);
    const nextInvoice = text.search(/Próxima fatura/i);
    const section = text.slice(sectionStart, nextInvoice > sectionStart ? nextInvoice : undefined);
    const datePattern = /(?:^|\n)\s*(\d{1,2})\s+de\s+([a-zç]{3})\.?\s+(\d{4})/gim;
    const dates = [...section.matchAll(datePattern)];
    const rows = [];

    for (let index = 0; index < dates.length; index += 1) {
        const match = dates[index];
        const start = match.index + match[0].indexOf(match[1]);
        const end = index + 1 < dates.length ? dates[index + 1].index : section.length;
        const record = section.slice(start, end).replace(/\s+/g, ' ').trim();
        const month = portugueseMonths[match[2].toLowerCase().slice(0, 3)];
        if (!month) continue;

        // The Inter PDF marks purchases with "- R$" and settlements with "+ R$".
        // A few card installment rows have no sign, so use their trailing amount.
        const amounts = [...record.matchAll(/([+-])?\s*R\$\s*((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})/g)];
        const amountMatch = amounts[amounts.length - 1];
        if (!amountMatch) continue;
        const sign = amountMatch[1];
        const description = record.slice(0, amountMatch.index).replace(/\s*[+-]?\s*$/, '').trim();
        if (!description || /pagamento\s+(?:on\s+line|de\s+fatura)|pagto/i.test(description)) continue;

        rows.push({
            date: `${match[3]}-${month}-${match[1].padStart(2, '0')}`,
            description,
            amount: sign === '+' && /estorno|devolu[cç][aã]o|cancelamento/i.test(description)
                ? -parseBrazilianAmount(amountMatch[2])
                : Math.abs(parseBrazilianAmount(amountMatch[2]))
        });
    }

    if (!rows.length) throw new Error('Nenhuma compra encontrada no PDF da fatura do Inter');
    return rows;
};

const parseFile = async (file) => {
    const extension = file.originalname.split('.').pop().toLowerCase();
    if (extension === 'csv') return normalizeCSVRows(await parseCSV(file.buffer));
    if (extension === 'ofx') return parseOFX(file.buffer);
    if (extension === 'pdf') return parseInterInvoicePDF(file.buffer);
    throw new Error('Formato de arquivo não suportado');
};

const isInvoicePayment = (description) => /\b(pagamento\s+recebido|pagamento.*fatura|pagamento.*cart[aã]o|pagto\.?\s*.*fatura|pagto\.?\s*.*cart[aã]o)\b/i.test(description);

const normalizeRows = (rows) => rows
    .map((row) => {
        const amount = Number(row.amount);
        const description = String(row.description || 'Compra importada').trim().slice(0, 255);
        const date = String(row.date || '').slice(0, 10);
        if (!description || !date || !Number.isFinite(amount) || amount === 0 || isInvoicePayment(description)) return null;
        return { date, description, amount: Number(amount.toFixed(2)), category: detectCategory(description) };
    })
    .filter(Boolean)
    .slice(0, 500);

const getAllowedCard = async (req, creditCardId) => {
    const user = await User.findByPk(req.user.id);
    const allowedUsers = [req.user.id];
    if (user?.partner_id) allowedUsers.push(user.partner_id);
    return CreditCard.findOne({ where: { id: creditCardId, user_id: { [Op.in]: allowedUsers } } });
};

exports.uploadMiddleware = (req, res, next) => {
    upload.single('file')(req, res, (error) => {
        if (error) return res.status(400).json({ error: error.message });
        next();
    });
};

exports.preview = async (req, res) => {
    try {
        const card = await getAllowedCard(req, req.params.credit_card_id);
        if (!card) return res.status(404).json({ error: 'Cartão não encontrado ou sem permissão' });
        if (!req.file) return res.status(400).json({ error: 'Selecione um arquivo CSV ou OFX' });

        const rows = normalizeRows(await parseFile(req.file));
        if (!rows.length) return res.status(400).json({ error: 'Nenhuma compra válida encontrada no arquivo' });
        res.json({ card: { id: card.id, name: card.name }, count: rows.length, total: Number(rows.reduce((sum, row) => sum + row.amount, 0).toFixed(2)), rows });
    } catch (error) {
        console.error('Error previewing credit card invoice:', error);
        res.status(400).json({ error: error.message || 'Não foi possível ler o arquivo' });
    }
};

exports.confirm = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const card = await getAllowedCard(req, req.params.credit_card_id);
        if (!card) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Cartão não encontrado ou sem permissão' });
        }

        const { rows, month, year, due_date, amount } = req.body;
        const normalizedRows = normalizeRows(Array.isArray(rows) ? rows : []);
        const invoiceMonth = Number(month);
        const invoiceYear = Number(year);
        if (!normalizedRows.length || invoiceMonth < 1 || invoiceMonth > 12 || !Number.isInteger(invoiceYear) || !due_date) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Informe compras, mês, ano e vencimento da fatura' });
        }

        let imported = 0;
        let duplicated = 0;
        for (const row of normalizedRows) {
            const existing = await CreditCardPurchase.findOne({
                where: {
                    credit_card_id: card.id,
                    purchase_date: row.date,
                    description: row.description,
                    total_amount: row.amount
                },
                transaction
            });
            if (existing) {
                duplicated += 1;
                continue;
            }
            await CreditCardPurchase.create({
                description: row.description,
                category: row.category,
                total_amount: row.amount,
                installments: 1,
                installment_amount: row.amount,
                remaining_installments: 1,
                purchase_date: row.date,
                credit_card_id: card.id,
                notes: 'Importado de fatura'
            }, { transaction });
            imported += 1;
        }

        const invoiceAmount = Number(amount) > 0 ? Number(Number(amount).toFixed(2)) : Number(normalizedRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2));
        const [invoice] = await CreditCardInvoice.findOrCreate({
            where: { credit_card_id: card.id, month: invoiceMonth, year: invoiceYear },
            defaults: { amount: invoiceAmount, due_date, paid: false },
            transaction
        });
        if (invoice.amount !== invoiceAmount || invoice.due_date !== due_date) {
            invoice.amount = invoiceAmount;
            invoice.due_date = due_date;
            await invoice.save({ transaction });
        }

        await transaction.commit();
        res.status(201).json({ message: `${imported} compras importadas.`, imported, duplicated, invoice });
    } catch (error) {
        await transaction.rollback();
        console.error('Error importing credit card invoice:', error);
        res.status(500).json({ error: 'Não foi possível importar a fatura' });
    }
};
