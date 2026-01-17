const { Transaction, Wallet } = require('./models');
const { Op } = require('sequelize');

async function listPayments() {
    try {
        const payments = await Transaction.findAll({
            include: [{
                model: Wallet,
                as: 'Wallet'
            }],
            where: {
                [Op.or]: [
                    { title: { [Op.like]: '%Pagamento recebido%' } },
                    { title: { [Op.like]: '%Pagamento de fatura%' } }
                ]
            },
            order: [['date', 'DESC']]
        });

        console.log(`\n💳 Total de pagamentos: ${payments.length}\n`);

        for (const payment of payments) {
            const date = new Date(payment.date);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();

            console.log(`📅 ${date.toLocaleDateString('pt-BR')} (${month}/${year})`);
            console.log(`   ${payment.title}`);
            console.log(`   R$ ${Math.abs(parseFloat(payment.amount)).toFixed(2)}`);
            console.log(`   Conta: ${payment.Wallet?.name || 'N/A'}`);
            console.log('');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

listPayments();
