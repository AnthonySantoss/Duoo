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
        const stream = Readable.from(buffer.toString());

        stream
            .pipe(csv({
                separator: [',', ';'], // Support both separators
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

// Detect category based on description
const detectCategory = (description) => {
    const desc = description.toLowerCase();

    if (desc.includes('mercado') || desc.includes('supermercado') || desc.includes('padaria') || desc.includes('restaurante') || desc.includes('ifood') || desc.includes('uber eats')) {
        return 'Alimentação';
    }
    if (desc.includes('cinema') || desc.includes('netflix') || desc.includes('spotify') || desc.includes('jogo') || desc.includes('lazer')) {
        return 'Lazer';
    }
    if (desc.includes('aluguel') || desc.includes('condominio') || desc.includes('luz') || desc.includes('agua') || desc.includes('gas')) {
        return 'Moradia';
    }
    if (desc.includes('internet') || desc.includes('telefone') || desc.includes('celular') || desc.includes('conta')) {
        return 'Contas';
    }
    if (desc.includes('farmacia') || desc.includes('medic') || desc.includes('hospital') || desc.includes('saude')) {
        return 'Saúde';
    }
    if (desc.includes('uber') || desc.includes('99') || desc.includes('gasolina') || desc.includes('combustivel') || desc.includes('onibus')) {
        return 'Transporte';
    }
    if (desc.includes('escola') || desc.includes('curso') || desc.includes('livro') || desc.includes('educacao')) {
        return 'Educação';
    }

    return 'Outros';
};

exports.uploadMiddleware = upload.single('file');

exports.importFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
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
                // Common CSV column names
                const date = row['Data'] || row['data'] || row['DATE'] || row['Date'];
                const description = row['Descrição'] || row['Descricao'] || row['descrição'] || row['descricao'] || row['DESCRIPTION'] || row['Description'] || row['Histórico'] || row['Historico'];
                const amount = row['Valor'] || row['valor'] || row['AMOUNT'] || row['Amount'] || row['Débito'] || row['Crédito'];

                if (!date || !amount) return null;

                // Parse date (support multiple formats)
                let parsedDate;
                if (date.includes('/')) {
                    const parts = date.split('/');
                    parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else if (date.includes('-')) {
                    parsedDate = date;
                } else {
                    parsedDate = new Date().toISOString().split('T')[0];
                }

                // Parse amount (handle different formats)
                let parsedAmount = amount.toString()
                    .replace('R$', '')
                    .replace(/\s/g, '')
                    .replace('.', '')
                    .replace(',', '.');
                parsedAmount = parseFloat(parsedAmount);

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
