const { Transaction, Wallet } = require('./models');

/**
 * Remove transações de "Pagamento recebido" da conta gold (são apenas registros de pagamento de fatura)
 */
async function removeInvoicePaymentRecords() {
    try {
        console.log('🔄 Removendo registros de pagamento de fatura...\n');

        const transactions = await Transaction.findAll({
            include: [{
                model: Wallet,
                as: 'Wallet'
            }],
            where: {
                title: {
                    [require('sequelize').Op.like]: '%Pagamento recebido%'
                }
            }
        });

        console.log(`📊 Encontradas ${transactions.length} transações de "Pagamento recebido"\n`);

        let deleted = 0;

        for (const trans of transactions) {
            const walletName = trans.Wallet?.name?.toLowerCase() || '';

            // Se é da conta gold (cartão), deletar
            if (walletName.includes('gold')) {
                console.log(`🗑️  Deletando: ${trans.title} - R$ ${trans.amount} (${trans.date})`);
                await trans.destroy();
                deleted++;
            } else {
                console.log(`✅ Mantendo: ${trans.title} - R$ ${trans.amount} (conta: ${trans.Wallet?.name})`);
            }
        }

        console.log(`\n✅ Limpeza concluída!`);
        console.log(`   - ${deleted} registros de pagamento deletados`);
        console.log(`   - ${transactions.length - deleted} transações mantidas (outras contas)`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

removeInvoicePaymentRecords();
