const { Transaction, Wallet, User } = require('../models');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Readable } = require('stream');

// Configure multer for file upload
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

// Parse CSV file
const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const results = [];
        let content = buffer.toString();
        // Remove BOM if present
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        const stream = Readable.from(content);

        stream
            .pipe(csv({
                separator: separator,
                mapHeaders: ({ header }) => header.trim(),
                skipLines: 0
            }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

// Parse OFX file (simplified - basic support)
const parseOFX = (buffer) => {
    const content = buffer.toString('utf-8');
    const transactions = [];

    // Simple regex-based OFX parsing
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    while ((match = transactionRegex.exec(content)) !== null) {
        const transBlock = match[1];

        const dateMatch = /<DTPOSTED>(\d{8})/i.exec(transBlock);
        const amountMatch = /<TRNAMT>([-\d.]+)/i.exec(transBlock);
        const memoMatch = /<MEMO>(.*?)</i.exec(transBlock);

        if (dateMatch && amountMatch) {
            const dateStr = dateMatch[1];
            const date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;

            transactions.push({
                date: date,
                amount: parseFloat(amountMatch[1]),
                description: memoMatch ? memoMatch[1].trim() : 'Transação importada'
            });
        }
    }

    return transactions;
};

// Detect category based on description (Enhanced version matched with Pluggy)
const detectCategory = (description) => {
    if (!description) return 'Outros';
    const desc = description.toLowerCase();

    // Investimentos (aplicação, resgate, RDB, CDB, etc) - PRIORIDADE
    if (desc.match(/aplicacao|aplica[cç][aã]o|resgate|rdb|cdb|lci|lca|tesouro|fundo|cdi|poupanca|poupan[cç]a|investimento|renda\s*fixa|corretora|xp|btg|rico|nuinvest/i)) {
        return 'Investimento';
    }

    // PIX e Transferências - MELHORADO (evitar falsos positivos)
    if (desc.match(/^pix|^transf|^ted|^doc|transfer[eê]ncia|valor\s*adicionado/i) && !desc.match(/uber|99|raizen|shell|ipiranga/i)) {
        return 'Transferência';
    }

    // Receitas
    if (desc.match(/salario|sal[aá]rio|pagamento\s*recebido|rendimento|dividendo|cashback|estorno|reembolso/i)) return 'Receita';

    // Alimentação - MUITO MELHORADO
    if (desc.match(/mercado|supermercado|padaria|a[cç]ougue|feira|restaurante|lanchonete|pizzaria|hamburgu|mc\s*donald|burger|bk\s|bk$|\sbk\s|filial\s*bk|ifood|rappi|uber\s*eats|99\s*food|sushi|bar\s+|cafe\s+|cafeteria|starbucks|pao\s*de\s*acucar|carrefour|extra|walmart|atacadao|barreto|anchietao|compreaki|dogao|sorvete|lanches|pizz|hambur/i)) return 'Alimentação';

    // Transporte - EXPANDIDO
    if (desc.match(/uber|99|cabify|taxi|onibus|metro|trem|estacionamento|combustivel|gasolina|etanol|posto|shell|ipiranga|ped[aá]gio|multa|detran|ipva|seguro\s*auto|carro/i)) return 'Transporte';

    // Lazer - EXPANDIDO
    if (desc.match(/cinema|teatro|show|netflix|spotify|amazon\s*prime|disney|hbo|youtube|game|playstation|xbox|parque|festa|livro|livraria/i)) return 'Lazer';

    // Moradia - EXPANDIDO
    if (desc.match(/aluguel|condominio|iptu|energia|luz|[aá]gua|esgoto|gas|limpeza|reparo|reforma|m[oó]vel|eletrodom[eé]stico/i)) return 'Moradia';

    // Saúde - EXPANDIDO
    if (desc.match(/farm[aá]cia|drogaria|medicamento|hospital|cl[íi]nica|m[eé]dico|doutor|exame|consulta|dentista|psic|fisio|plano\s*sa[uú]de|unimed|amil/i)) return 'Saúde';

    // Contas - com exclusões
    if (desc.match(/fatura|cart[aã]o\s*cr[eé]dito|anuidade|boleto|telefone|vivo|tim|claro|seguro|taxa/i) && !desc.match(/mercado|restaurante|farmacia/i)) return 'Contas';

    // Educação
    if (desc.match(/escola|faculdade|curso|apostila|mensalidade\s*escolar/i)) return 'Educação';

    return 'Outros';
};

exports.uploadMiddleware = (req, res, next) => {
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

exports.importFile = async (req, res) => {
    try {
        console.log('Import request received');
        console.log('Body:', req.body);
        console.log('File:', req.file);

        if (!req.file) {
            console.log('Error: No file received');
            return res.status(400).json({ error: 'Nenhum arquivo enviado. Verifique se o arquivo é um CSV ou OFX válido e se não excede 5MB.' });
        }

        const { wallet_id } = req.body;

        if (!wallet_id) {
            return res.status(400).json({ error: 'Carteira não especificada' });
        }

        // Verify wallet ownership
        const wallet = await Wallet.findByPk(wallet_id);
        if (!wallet) {
            return res.status(404).json({ error: 'Carteira não encontrada' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(wallet.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para usar esta carteira' });
        }

        let parsedTransactions = [];
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

        // Parse based on file type
        if (fileExtension === 'csv') {
            const csvData = await parseCSV(req.file.buffer);

            // Try to map CSV columns (flexible mapping)
            parsedTransactions = csvData.map(row => {
                // Common CSV column names - Case insensitive search
                const keys = Object.keys(row);

                const findKey = (candidates) => {
                    return keys.find(k => candidates.includes(k.toLowerCase()) || candidates.includes(k));
                };

                const dateKey = findKey(['data', 'date', 'dtposted']);
                const descKey = findKey(['descrição', 'descricao', 'description', 'histórico', 'historico', 'memo', 'estabelecimento']);
                const amountKey = findKey(['valor', 'amount', 'trnamt', 'débito', 'debito', 'crédito', 'credito']);

                const date = dateKey ? row[dateKey] : null;
                const description = descKey ? row[descKey] : null;
                const amount = amountKey ? row[amountKey] : null;

                if (!date || !amount) {
                    return null;
                }

                // Parse date (support multiple formats)
                let parsedDate;
                if (date.includes('/')) {
                    const parts = date.split('/');
                    // DD/MM/YYYY
                    parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else if (date.includes('-')) {
                    parsedDate = date;
                } else {
                    try {
                        parsedDate = new Date(date).toISOString().split('T')[0];
                    } catch (e) {
                        parsedDate = new Date().toISOString().split('T')[0];
                    }
                }

                // Parse amount (handle different formats)
                let parsedAmount = amount.toString();
                // If brazilian format 1.000,00 -> remove dot, replace comma
                if (parsedAmount.includes(',') && parsedAmount.includes('.')) {
                    parsedAmount = parsedAmount.replace(/\./g, '').replace(',', '.');
                } else if (parsedAmount.includes(',')) {
                    parsedAmount = parsedAmount.replace(',', '.');
                }

                parsedAmount = parseFloat(parsedAmount);
                if (isNaN(parsedAmount)) return null;

                return {
                    date: parsedDate,
                    description: description || 'Transação importada',
                    amount: parsedAmount
                };
            }).filter(t => t !== null);

        } else if (fileExtension === 'ofx') {
            parsedTransactions = parseOFX(req.file.buffer);
        } else {
            return res.status(400).json({ error: 'Formato de arquivo não suportado' });
        }

        if (parsedTransactions.length === 0) {
            return res.status(400).json({ error: 'Nenhuma transação encontrada no arquivo' });
        }

        // Create transactions
        const createdTransactions = [];
        let currentBalance = parseFloat(wallet.balance);

        for (const trans of parsedTransactions) {
            const category = detectCategory(trans.description);
            const amount = trans.amount;

            const transaction = await Transaction.create({
                title: trans.description,
                amount: amount,
                category: category,
                date: trans.date,
                type: amount > 0 ? 'income' : 'expense',
                wallet_id: wallet_id,
                user_id: req.user.id
            });

            currentBalance += amount;
            createdTransactions.push(transaction);
        }

        // Update wallet balance
        wallet.balance = currentBalance;
        await wallet.save();

        res.json({
            message: `${createdTransactions.length} transações importadas com sucesso`,
            count: createdTransactions.length,
            transactions: createdTransactions
        });

    } catch (error) {
        console.error('Error in importFile:', error);
        res.status(500).json({ error: error.message });
    }
};
