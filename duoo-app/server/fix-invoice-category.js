const { Transaction, Wallet } = require('./models');

/**
 * Recategoriza pagamentos de fatura na conta gold como Transferência
 */
async function fixInvoicePaymentCategory() {
    try {
        console.log('🔄 Corrigindo categoria de pagamentos de fatura...\n');

        const transactions = await Transaction.findAll({
            include: [{
                model: Wallet,
                as: 'Wallet'
            }],
            where: {
                [require('sequelize').Op.or]: [
                    { title: { [require('sequelize').Op.like]: '%Pagamento recebido%' } },
                    { title: { [require('sequelize').Op.like]: '%Pagamento de fatura%' } }
                ]
            }
        });

        console.log(`📊 Encontradas ${transactions.length} transações\n`);

        let updated = 0;

        for (const trans of transactions) {
            const walletName = trans.Wallet?.name?.toLowerCase() || '';

            // Se é da conta gold (cartão) e está como Receita
            if (walletName.includes('gold')) {
                console.log(`📝 ${trans.title} - R$ ${trans.amount}`);
                console.log(`   Antes: ${trans.category} (${trans.type})`);

                await trans.update({
                    category: 'Transferência',
                    type: 'transfer' // Tipo neutro para não somar como receita
                });

                console.log(`   Depois: Transferência (transfer)`);
                updated++;
            }
        }

        console.log(`\n✅ Correção concluída!`);
        console.log(`   - ${updated} transações atualizadas para Transferência`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

fixInvoicePaymentCategory();
