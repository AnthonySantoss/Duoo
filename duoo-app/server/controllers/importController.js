const { sequelize, Transaction, Wallet } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Readable } = require('stream');

// Configure multer for file upload (memory storage with 5MB limit)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.ofx')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV e OFX são permitidos'));
        }
    }
});

const uploadMiddleware = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

// Parse CSV file content from buffer
const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const results = [];
        let content = buffer.toString();
        // Remove BOM if present
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        // Excel may prepend a separator hint (sep=;) before the CSV header.
        content = content.replace(/^sep\s*=\s*[;,]\s*\r?\n/i, '');
        const headerLine = content.split(/\r?\n/, 1)[0];
        const separator = headerLine.includes(';') ? ';' : ',';

        const stream = Readable.from(content);

        stream
            .pipe(csv({
                separator: separator,
                mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim(),
                skipLines: 0
            }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

// Parse OFX file (extracting date, amount, description and FITID as external_id)
const parseOFXSimple = (buffer) => {
    const content = buffer.toString('utf-8');
    const transactions = [];

    // Regex supporting OFX tags with or without closing </STMTTRN>
    const transactionRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi;
    let match;

    while ((match = transactionRegex.exec(content)) !== null) {
        const transBlock = match[1];
        if (!transBlock || !transBlock.trim()) continue;

        const dateMatch = /<DTPOSTED>(\d{8})/i.exec(transBlock);
        const amountMatch = /<TRNAMT>([-\d.]+)/i.exec(transBlock);
        const memoMatch = /<MEMO>(.*?)(?:<|\r|\n)/i.exec(transBlock);
        const nameMatch = /<NAME>(.*?)(?:<|\r|\n)/i.exec(transBlock);
        const fitidMatch = /<FITID>(.*?)(?:<|\r|\n)/i.exec(transBlock);

        if (dateMatch && amountMatch) {
            const dateStr = dateMatch[1];
            const date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            const rawDescription = memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Transação importada');
            const description = rawDescription.trim();
            const external_id = fitidMatch ? fitidMatch[1].trim() : null;

            transactions.push({
                date: date,
                amount: parseFloat(amountMatch[1]),
                description: description || 'Transação importada',
                external_id: external_id || null
            });
        }
    }

    return transactions;
};

const parseOFX = parseOFXSimple;

// Detect category based on description
const detectCategory = (description) => {
    if (!description) return 'Outros';
    const desc = description.toLowerCase();

    // Investimentos (aplicação, resgate, RDB, CDB, etc) - PRIORIDADE
    if (desc.match(/aplicacao|aplica[cç][aã]o|resgate|rdb|cdb|lci|lca|tesouro|fundo|cdi|poupanca|poupan[cç]a|investimento|renda\s*fixa|corretora|xp|btg|rico|nuinvest/i)) {
        return 'Investimento';
    }

    // PIX e Transferências
    if (desc.match(/^pix|^transf|^ted|^doc|transfer[eê]ncia|valor\s*adicionado/i) && !desc.match(/uber|99|raizen|shell|ipiranga/i)) {
        return 'Transferência';
    }

    // Receitas
    if (desc.match(/salario|sal[aá]rio|pagamento\s*recebido|rendimento|dividendo|cashback|estorno|reembolso/i)) return 'Receita';

    // Alimentação
    if (desc.match(/mercado|supermercado|padaria|a[cç]ougue|feira|restaurante|lanchonete|pizzaria|hamburgu|mc\s*donald|burger|bk\s|bk$|\sbk\s|filial\s*bk|ifood|rappi|uber\s*eats|99\s*food|sushi|bar\s+|cafe\s+|cafeteria|starbucks|pao\s*de\s*acucar|carrefour|extra|walmart|atacadao|barreto|anchietao|compreaki|dogao|sorvete|lanches|pizz|hambur/i)) return 'Alimentação';

    // Transporte
    if (desc.match(/uber|99|cabify|taxi|onibus|metro|trem|estacionamento|combustivel|gasolina|etanol|posto|shell|ipiranga|ped[aá]gio|multa|detran|ipva|seguro\s*auto|carro/i)) return 'Transporte';

    // Lazer
    if (desc.match(/cinema|teatro|show|netflix|spotify|amazon\s*prime|disney|hbo|youtube|game|playstation|xbox|parque|festa|livro|livraria/i)) return 'Lazer';

    // Moradia
    if (desc.match(/aluguel|condominio|iptu|energia|luz|[aá]gua|esgoto|gas|limpeza|reparo|reforma|m[oó]vel|eletrodom[eé]stico/i)) return 'Moradia';

    // Saúde
    if (desc.match(/farm[aá]cia|drogaria|medicamento|hospital|cl[íi]nica|m[eé]dico|doutor|exame|consulta|dentista|psic|fisio|plano\s*sa[uú]de|unimed|amil/i)) return 'Saúde';

    // Contas
    if (desc.match(/fatura|cart[aã]o\s*cr[eé]dito|anuidade|boleto|telefone|vivo|tim|claro|seguro|taxa/i) && !desc.match(/mercado|restaurante|farmacia/i)) return 'Contas';

    // Educação
    if (desc.match(/escola|faculdade|curso|apostila|mensalidade\s*escolar/i)) return 'Educação';

    return 'Outros';
};

const normalizeTitle = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const parseBrazilianAmount = (value) => {
    let normalized = String(value || '').trim().replace(/\s/g, '').replace(/R\$/i, '');
    if (!normalized) return NaN;
    const negativeByParentheses = /^\(.*\)$/.test(normalized);
    const negativeByTrailingD = /D$/i.test(normalized);
    normalized = normalized.replace(/[()]/g, '').replace(/[^\d,\.\-+]/g, '');
    if (normalized.includes(',') && normalized.includes('.')) {
        const decimalSeparator = normalized.lastIndexOf(',') > normalized.lastIndexOf('.') ? ',' : '.';
        normalized = normalized.replace(decimalSeparator === ',' ? /\./g : /,/g, '').replace(decimalSeparator, '.');
    } else if (normalized.includes(',')) {
        normalized = normalized.replace(/,/g, '.');
    }
    const amount = Number(normalized);
    if (isNaN(amount)) return NaN;
    return (negativeByParentheses || negativeByTrailingD) ? -Math.abs(amount) : amount;
};

const parseStatementDate = (value) => {
    const date = String(value || '').trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const normalizeCSVTransactions = (csvData) => {
    return csvData.map(row => {
        const keys = Object.keys(row);
        const findKey = (candidates) => keys.find(k => {
            const normalizedKey = k.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return candidates.some(c => normalizedKey === c || normalizedKey.startsWith(c));
        });

        const dateKey = findKey(['data', 'date', 'dtposted', 'dia']);
        const descKey = findKey(['descricao', 'description', 'historico', 'memo', 'estabelecimento', 'title', 'transacao', 'detalhes', 'lancamento']);
        const amountKey = findKey(['valor', 'amount', 'trnamt', 'total']);
        const debitKey = findKey(['debito', 'saida', 'debit']);
        const creditKey = findKey(['credito', 'entrada', 'credit']);
        const typeKey = findKey(['tipo', 'type', 'natureza', 'operacao', 'd/c', 'dc']);
        const idKey = findKey(['fitid', 'id', 'external_id', 'identificador', 'documento']);

        const rawDate = dateKey ? row[dateKey] : null;
        const parsedDate = parseStatementDate(rawDate);
        if (!parsedDate) return null;

        const description = descKey ? row[descKey] : 'Transação importada';

        let amount = NaN;

        if (debitKey && row[debitKey] && !creditKey) {
            const val = parseBrazilianAmount(row[debitKey]);
            if (!isNaN(val) && val !== 0) amount = -Math.abs(val);
        } else if (creditKey && row[creditKey] && !debitKey) {
            const val = parseBrazilianAmount(row[creditKey]);
            if (!isNaN(val) && val !== 0) amount = Math.abs(val);
        } else if (debitKey && creditKey) {
            const debVal = parseBrazilianAmount(row[debitKey]);
            const credVal = parseBrazilianAmount(row[creditKey]);
            if (!isNaN(debVal) && debVal > 0) {
                amount = -Math.abs(debVal);
            } else if (!isNaN(credVal) && credVal > 0) {
                amount = Math.abs(credVal);
            }
        }

        if (isNaN(amount) && amountKey) {
            amount = parseBrazilianAmount(row[amountKey]);
        }

        if (isNaN(amount)) return null;

        // Se houver coluna explícita de tipo (D ou C, etc.)
        if (typeKey && row[typeKey]) {
            const typeStr = String(row[typeKey]).toLowerCase().trim();
            if (/^(d|deb|debito|débito|expense|saida|saída|pagamento)/i.test(typeStr)) {
                amount = -Math.abs(amount);
            } else if (/^(c|cred|credito|crédito|income|entrada|recebimento)/i.test(typeStr)) {
                amount = Math.abs(amount);
            }
        }

        const external_id = idKey && row[idKey] ? String(row[idKey]).trim() : null;

        return {
            date: parsedDate,
            description: String(description || 'Transação importada').trim(),
            amount: amount,
            external_id: external_id || null
        };
    }).filter(Boolean);
};

// Normalize extracted transactions into structured preview format with finalAmount calculated
const normalizeTransactions = (rawTransactions) => {
    return rawTransactions.map(item => {
        const rawAmount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount);
        const title = normalizeTitle(item.description || item.title || 'Transação importada');
        const type = item.type || (rawAmount < 0 ? 'expense' : 'income');
        let finalAmount = type === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
        finalAmount = Number(finalAmount.toFixed(2));
        const category = item.category || detectCategory(title);
        const external_id = item.external_id ? String(item.external_id).trim() : null;

        return {
            date: item.date,
            title,
            description: title,
            amount: finalAmount,
            finalAmount,
            type,
            category,
            external_id
        };
    });
};

const cleanupTempFile = (file) => {
    if (file && file.path) {
        try {
            fs.unlinkSync(file.path);
        } catch (cleanupErr) {
            console.warn('Failed to clean up temp file:', cleanupErr.message);
        }
    }
};

// POST /api/import/preview
exports.previewStatement = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado. Selecione um arquivo CSV ou OFX válido.' });
        }

        const { wallet_id } = req.body;
        if (!wallet_id) {
            cleanupTempFile(req.file);
            return res.status(400).json({ error: 'Carteira não especificada' });
        }

        const wallet = await Wallet.findByPk(wallet_id);
        if (!wallet) {
            cleanupTempFile(req.file);
            return res.status(404).json({ error: 'Carteira não encontrada' });
        }

        if (wallet.user_id !== req.user.id) {
            cleanupTempFile(req.file);
            return res.status(403).json({ error: 'Você não tem permissão para usar esta carteira' });
        }

        const fileBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
        if (!fileBuffer) {
            cleanupTempFile(req.file);
            return res.status(400).json({ error: 'Não foi possível ler o arquivo enviado.' });
        }

        let parsedTransactions = [];
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

        if (fileExtension === 'csv') {
            const csvRows = await parseCSV(fileBuffer);
            parsedTransactions = normalizeCSVTransactions(csvRows);
        } else if (fileExtension === 'ofx') {
            parsedTransactions = parseOFXSimple(fileBuffer);
        } else {
            cleanupTempFile(req.file);
            return res.status(400).json({ error: 'Formato de arquivo não suportado. Apenas CSV e OFX são permitidos.' });
        }

        if (parsedTransactions.length === 0) {
            cleanupTempFile(req.file);
            return res.status(400).json({ error: 'Nenhuma transação encontrada no arquivo' });
        }

        const normalizedItems = normalizeTransactions(parsedTransactions);

        // Buscar transações existentes no banco para deduplicação
        const externalIds = normalizedItems.map(i => i.external_id).filter(Boolean);
        const dates = normalizedItems.map(i => i.date).filter(Boolean).sort();

        const whereOr = [];
        if (externalIds.length > 0) {
            whereOr.push({ source_external_id: { [Op.in]: externalIds } });
        }
        if (dates.length > 0) {
            whereOr.push({
                date: {
                    [Op.gte]: dates[0],
                    [Op.lte]: dates[dates.length - 1]
                }
            });
        }

        const existingTransactions = await Transaction.findAll({
            where: {
                wallet_id: wallet.id,
                ...(whereOr.length > 0 ? { [Op.or]: whereOr } : {})
            },
            attributes: ['id', 'title', 'amount', 'date', 'source_external_id']
        });

        const seenFileExternalIds = new Set();
        const itemsWithDedup = [];

        for (let index = 0; index < normalizedItems.length; index++) {
            const item = normalizedItems[index];
            let isDuplicate = false;
            let duplicateReason = null;

            // 1. Detectar duplicatas dentro do próprio arquivo se tiverem mesmo external_id
            if (item.external_id) {
                if (seenFileExternalIds.has(item.external_id)) {
                    isDuplicate = true;
                    duplicateReason = 'fitid';
                } else {
                    seenFileExternalIds.add(item.external_id);
                }
            }

            // 2. Verificar duplicata no banco por FITID (source_external_id)
            if (!isDuplicate && item.external_id) {
                const matchByFitId = existingTransactions.find(t =>
                    t.source_external_id && t.source_external_id === item.external_id
                );
                if (matchByFitId) {
                    isDuplicate = true;
                    duplicateReason = 'fitid';
                }
            }

            // 3. Verificar duplicata no banco por mesma date, mesmo amount (finalAmount) e mesmo title normalizado (case-insensitive)
            if (!isDuplicate) {
                const itemTitleNorm = item.title.trim().replace(/\s+/g, ' ').toLowerCase();
                const matchByDateAmountTitle = existingTransactions.find(t => {
                    const tDate = String(t.date || '').slice(0, 10);
                    const tAmount = Number(parseFloat(t.amount).toFixed(2));
                    const tTitleNorm = (t.title || '').trim().replace(/\s+/g, ' ').toLowerCase();

                    return tDate === item.date &&
                           Math.abs(tAmount - item.finalAmount) < 0.001 &&
                           tTitleNorm === itemTitleNorm;
                });

                if (matchByDateAmountTitle) {
                    isDuplicate = true;
                    duplicateReason = 'same_date_amount_title';
                }
            }

            itemsWithDedup.push({
                id: `preview_${index + 1}`,
                ...item,
                isDuplicate,
                duplicateReason
            });
        }

        cleanupTempFile(req.file);

        const duplicateCount = itemsWithDedup.filter(i => i.isDuplicate).length;
        const newCount = itemsWithDedup.length - duplicateCount;

        return res.json({
            items: itemsWithDedup,
            summary: {
                total: itemsWithDedup.length,
                newCount,
                duplicateCount
            }
        });

    } catch (error) {
        cleanupTempFile(req.file);
        console.error('Error in previewStatement:', error);
        return res.status(500).json({ error: 'Não foi possível processar a pré-visualização do extrato.' });
    }
};

// POST /api/import/confirm
exports.confirmStatement = async (req, res) => {
    const { wallet_id, transactions } = req.body;

    if (!wallet_id) {
        return res.status(400).json({ error: 'Carteira não especificada' });
    }

    const wallet = await Wallet.findByPk(wallet_id);
    if (!wallet) {
        return res.status(404).json({ error: 'Carteira não encontrada' });
    }

    if (wallet.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para usar esta carteira' });
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: 'Nenhuma transação selecionada para importação' });
    }

    const t = await sequelize.transaction();
    try {
        const createdTransactions = [];
        let totalAmount = 0;

        for (const item of transactions) {
            const rawAmount = parseFloat(item.finalAmount !== undefined ? item.finalAmount : item.amount);
            if (isNaN(rawAmount)) continue;

            const finalAmount = Number(rawAmount.toFixed(2));
            const title = normalizeTitle(item.title || item.description || 'Transação importada');
            const type = item.type || (finalAmount < 0 ? 'expense' : 'income');
            const category = item.category || detectCategory(title);
            const date = String(item.date || '').slice(0, 10);
            const external_id = item.external_id ? String(item.external_id).trim() : null;

            const created = await Transaction.create({
                title,
                amount: finalAmount,
                category,
                date,
                type,
                wallet_id: wallet.id,
                user_id: req.user.id,
                source_external_id: external_id,
                notes: 'Importado de extrato'
            }, { transaction: t });

            createdTransactions.push(created);
            totalAmount += finalAmount;
        }

        const currentBalance = parseFloat(wallet.balance || 0);
        wallet.balance = Number((currentBalance + totalAmount).toFixed(2));
        await wallet.save({ transaction: t });

        await t.commit();

        return res.status(201).json({
            message: `${createdTransactions.length} transações importadas com sucesso`,
            imported: createdTransactions.length,
            count: createdTransactions.length,
            newBalance: wallet.balance,
            transactions: createdTransactions
        });
    } catch (error) {
        await t.rollback();
        console.error('Error confirming statement import:', error);
        return res.status(500).json({ error: 'Erro ao confirmar importação de extrato' });
    }
};

// POST /api/import/upload (Retrocompatibilidade com deduplicação corrigida)
exports.uploadStatement = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado. Verifique se o arquivo é um CSV ou OFX válido e se não excede 5MB.' });
        }

        const { wallet_id } = req.body;
        if (!wallet_id) {
            cleanupTempFile(req.file);
            return res.status(400).json({ error: 'Carteira não especificada' });
        }

        const wallet = await Wallet.findByPk(wallet_id);
        if (!wallet) {
            cleanupTempFile(req.file);
            return res.status(404).json({ error: 'Carteira não encontrada' });
        }

        if (wallet.user_id !== req.user.id) {
            cleanupTempFile(req.file);
            return res.status(403).json({ error: 'Você não tem permissão para usar esta carteira' });
        }

        const fileBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
        if (!fileBuffer) {
            cleanupTempFile(req.file);
            return res.status(400).json({ error: 'Não foi possível ler o arquivo enviado.' });
        }

        let parsedTransactions = [];
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

        if (fileExtension === 'csv') {
            const csvRows = await parseCSV(fileBuffer);
            parsedTransactions = normalizeCSVTransactions(csvRows);
        } else if (fileExtension === 'ofx') {
            parsedTransactions = parseOFXSimple(fileBuffer);
        } else {
            cleanupTempFile(req.file);
            return res.status(400).json({ error: 'Formato de arquivo não suportado' });
        }

        if (parsedTransactions.length === 0) {
            cleanupTempFile(req.file);
            return res.status(400).json({ error: 'Nenhuma transação encontrada no arquivo' });
        }

        const normalizedItems = normalizeTransactions(parsedTransactions);

        const externalIds = normalizedItems.map(i => i.external_id).filter(Boolean);
        const dates = normalizedItems.map(i => i.date).filter(Boolean).sort();

        const whereOr = [];
        if (externalIds.length > 0) {
            whereOr.push({ source_external_id: { [Op.in]: externalIds } });
        }
        if (dates.length > 0) {
            whereOr.push({
                date: {
                    [Op.gte]: dates[0],
                    [Op.lte]: dates[dates.length - 1]
                }
            });
        }

        const existingTransactions = await Transaction.findAll({
            where: {
                wallet_id: wallet.id,
                ...(whereOr.length > 0 ? { [Op.or]: whereOr } : {})
            },
            attributes: ['id', 'title', 'amount', 'date', 'source_external_id']
        });

        const seenFileExternalIds = new Set();
        const toInsert = [];
        let duplicatedCount = 0;

        for (const item of normalizedItems) {
            let isDuplicate = false;

            if (item.external_id) {
                if (seenFileExternalIds.has(item.external_id)) {
                    isDuplicate = true;
                } else {
                    seenFileExternalIds.add(item.external_id);
                }
            }

            if (!isDuplicate && item.external_id) {
                const matchByFitId = existingTransactions.find(t =>
                    t.source_external_id && t.source_external_id === item.external_id
                );
                if (matchByFitId) isDuplicate = true;
            }

            if (!isDuplicate) {
                const itemTitleNorm = item.title.trim().replace(/\s+/g, ' ').toLowerCase();
                const matchByDateAmountTitle = existingTransactions.find(t => {
                    const tDate = String(t.date || '').slice(0, 10);
                    const tAmount = Number(parseFloat(t.amount).toFixed(2));
                    const tTitleNorm = (t.title || '').trim().replace(/\s+/g, ' ').toLowerCase();

                    return tDate === item.date &&
                           Math.abs(tAmount - item.finalAmount) < 0.001 &&
                           tTitleNorm === itemTitleNorm;
                });
                if (matchByDateAmountTitle) isDuplicate = true;
            }

            if (isDuplicate) {
                duplicatedCount++;
            } else {
                toInsert.push(item);
            }
        }

        cleanupTempFile(req.file);

        const t = await sequelize.transaction();
        try {
            const createdTransactions = [];
            let totalAmount = 0;

            for (const item of toInsert) {
                const created = await Transaction.create({
                    title: item.title,
                    amount: item.finalAmount,
                    category: item.category,
                    date: item.date,
                    type: item.type,
                    wallet_id: wallet.id,
                    user_id: req.user.id,
                    source_external_id: item.external_id,
                    notes: 'Importado de extrato'
                }, { transaction: t });

                createdTransactions.push(created);
                totalAmount += item.finalAmount;
            }

            const currentBalance = parseFloat(wallet.balance || 0);
            wallet.balance = Number((currentBalance + totalAmount).toFixed(2));
            await wallet.save({ transaction: t });

            await t.commit();

            return res.json({
                message: duplicatedCount > 0
                    ? `${createdTransactions.length} transações importadas; ${duplicatedCount} duplicadas ignoradas`
                    : `${createdTransactions.length} transações importadas`,
                count: createdTransactions.length,
                duplicated: duplicatedCount,
                transactions: createdTransactions
            });
        } catch (txError) {
            await t.rollback();
            throw txError;
        }

    } catch (error) {
        cleanupTempFile(req.file);
        console.error('Error in uploadStatement:', error);
        return res.status(500).json({ error: 'Não foi possível concluir a importação. Verifique o arquivo e tente novamente.' });
    }
};

// Aliases for compatibility
exports.importFile = exports.uploadStatement;
exports.parseCSV = parseCSV;
exports.parseOFX = parseOFX;
exports.parseOFXSimple = parseOFXSimple;
exports.detectCategory = detectCategory;
exports.upload = upload;
exports.uploadMiddleware = uploadMiddleware;
