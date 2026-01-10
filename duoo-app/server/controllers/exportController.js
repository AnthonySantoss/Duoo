const { Transaction, Wallet, User } = require('../models');
const { Op } = require('sequelize');

exports.exportCSV = async (req, res) => {
    try {
        const { viewMode, startDate, endDate } = req.query;
        const userId = req.user.id;

        // Get user and partner IDs
        const user = await User.findByPk(userId);
        const allowedUsers = [userId];
        if (user.partner_id) {
            allowedUsers.push(user.partner_id);
        }

        // Filter by viewMode
        let userFilter = allowedUsers;
        if (viewMode === 'user1' || viewMode === 'user2') {
            userFilter = [userId];
        }

        // Build where clause
        let whereClause = {
            user_id: { [Op.in]: userFilter }
        };

        // Add date filters if provided
        if (startDate && endDate) {
            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        }

        const transactions = await Transaction.findAll({
            where: whereClause,
            include: [
                { model: Wallet, attributes: ['name', 'type'] },
                { model: User, attributes: ['name'] }
            ],
            order: [['date', 'DESC']]
        });

        // Generate CSV
        const csvHeader = 'Data,Descrição,Categoria,Valor,Tipo,Carteira,Usuário\n';
        const csvRows = transactions.map(t => {
            const date = new Date(t.date).toLocaleDateString('pt-BR');
            const amount = parseFloat(t.amount).toFixed(2);
            const type = parseFloat(t.amount) > 0 ? 'Receita' : 'Despesa';
            return `${date},"${t.title}","${t.category}",${amount},${type},"${t.Wallet?.name || 'N/A'}","${t.User?.name || 'N/A'}"`;
        }).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=extrato-duoo.csv');
        res.send('\uFEFF' + csv); // BOM for Excel UTF-8 support
    } catch (error) {
        console.error('Error in exportCSV:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.exportPDF = async (req, res) => {
    try {
        const { viewMode, startDate, endDate } = req.query;
        const userId = req.user.id;

        // Get user and partner IDs
        const user = await User.findByPk(userId);
        const allowedUsers = [userId];
        if (user.partner_id) {
            allowedUsers.push(user.partner_id);
        }

        // Filter by viewMode
        let userFilter = allowedUsers;
        if (viewMode === 'user1' || viewMode === 'user2') {
            userFilter = [userId];
        }

        // Build where clause
        let whereClause = {
            user_id: { [Op.in]: userFilter }
        };

        // Add date filters if provided
        if (startDate && endDate) {
            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        }

        const transactions = await Transaction.findAll({
            where: whereClause,
            include: [
                { model: Wallet, attributes: ['name', 'type'] },
                { model: User, attributes: ['name'] }
            ],
            order: [['date', 'DESC']]
        });

        // Simple HTML-based PDF (for now, can be enhanced with a PDF library later)
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Extrato Duoo</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #10b981; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #10b981; color: white; }
        .income { color: #10b981; font-weight: bold; }
        .expense { color: #ef4444; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Extrato Financeiro - Duoo</h1>
    <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
    ${startDate && endDate ? `<p>Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}</p>` : ''}
    
    <table>
        <thead>
            <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Carteira</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            ${transactions.map(t => `
                <tr>
                    <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td>${t.title}</td>
                    <td>${t.category}</td>
                    <td>${t.Wallet?.name || 'N/A'}</td>
                    <td class="${parseFloat(t.amount) > 0 ? 'income' : 'expense'}">
                        R$ ${Math.abs(parseFloat(t.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666;">
        Total de transações: ${transactions.length}
    </p>
</body>
</html>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', 'inline; filename=extrato-duoo.html');
        res.send(html);
    } catch (error) {
        console.error('Error in exportPDF:', error);
        res.status(500).json({ error: error.message });
    }
};
