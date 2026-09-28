const multer = require('multer');
const { Op } = require('sequelize');
const { sequelize, CreditCard, CreditCardPurchase, CreditCardInvoice, User } = require('../models');
const { parseCSV, parseOFX, detectCategory } = require('./importController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const accepted = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'];
        if (accepted.includes(file.mimetype) || /\.(csv|ofx)$/i.test(file.originalname)) return cb(null, true);
        return cb(new Error('Apenas arquivos CSV e OFX são permitidos'));
    }
});

const normalizeHeader = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const parseBrazilianAmount = (value) => {
    const normalized = String(value || '').replace(/\s/g, '').replace(/R\$/i, '');
    if (normalized.includes(',') && normalized.includes('.')) return Number(normalized.replace(/\./g, '').replace(',', '.'));
    if (normalized.includes(',')) return Number(normalized.replace(',', '.'));
    return Number(normalized);
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
    const findKey = (candidates) => keys.find((key) => candidates.some((candidate) => normalizeHeader(key) === candidate || normalizeHeader(key).includes(candidate)));
    const dateKey = findKey(['data', 'date', 'dtposted', 'compra', 'lancamento']);
    const descriptionKey = findKey(['descricao', 'description', 'historico', 'memo', 'estabelecimento', 'merchant']);
    const amountKey = findKey(['valor', 'amount', 'trnamt', 'debito', 'credito', 'total']);
    return {
        date: parseStatementDate(dateKey ? row[dateKey] : ''),
        description: descriptionKey ? row[descriptionKey] : 'Compra importada',
        amount: parseBrazilianAmount(amountKey ? row[amountKey] : '')
    };
});

const parseFile = async (file) => {
    const extension = file.originalname.split('.').pop().toLowerCase();
    if (extension === 'csv') return normalizeCSVRows(await parseCSV(file.buffer));
    if (extension === 'ofx') return parseOFX(file.buffer);
    throw new Error('Formato de arquivo não suportado');
};

const normalizeRows = (rows) => rows
    .map((row) => {
        const amount = Math.abs(Number(row.amount));
        const description = String(row.description || 'Compra importada').trim().slice(0, 255);
        const date = String(row.date || '').slice(0, 10);
        if (!description || !date || !Number.isFinite(amount) || amount <= 0) return null;
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
