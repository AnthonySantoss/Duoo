const { Transaction } = require('./models');

/**
 * Corrige valores de transações (positivo/negativo)
 */
async function fixTransactionAmounts() {
    try {
        console.log('🔄 Corrigindo valores de transações...\n');

        const { Wallet } = require('./models');
        const transactions = await Transaction.findAll({
            include: [{
                model: Wallet,
                as: 'Wallet'
            }]
        });

        console.log(`📊 Encontradas ${transactions.length} transações\n`);

        let fixed = 0;

        for (const trans of transactions) {
            const description = (trans.title || '').toLowerCase();
            const category = trans.category;
            const walletName = trans.Wallet?.name?.toLowerCase() || '';
            let currentAmount = parseFloat(trans.amount);
            let newAmount = currentAmount;
            let shouldUpdate = false;

            // Transações da conta "gold" (cartão) devem ser negativas
            const isGoldAccount = walletName.includes('gold');

            if (isGoldAccount && currentAmount > 0) {
                // Exceção: "Pagamento recebido" é entrada
                if (!description.includes('pagamento recebido')) {
                    newAmount = -Math.abs(currentAmount);
                    trans.type = 'expense';
                    shouldUpdate = true;
                    console.log(`💳 GOLD: ${trans.title}: R$ ${currentAmount} → R$ ${newAmount}`);
                }
            }
            // Compras de cartão devem ser negativas
            else if (description.match(/compra\s*(no|em)\s*(debito|d[eé]bito|credito|cr[eé]dito)|pagamento\s*efetuado/i)) {
                if (currentAmount > 0) {
                    newAmount = -Math.abs(currentAmount);
                    trans.type = 'expense';
                    shouldUpdate = true;
                    console.log(`💳 ${trans.title}: R$ ${currentAmount} → R$ ${newAmount}`);
                }
            }
            // Receitas devem ser positivas
            else if (category === 'Receita') {
                if (currentAmount < 0) {
                    newAmount = Math.abs(currentAmount);
                    trans.type = 'income';
                    shouldUpdate = true;
                    console.log(`💰 ${trans.title}: R$ ${currentAmount} → R$ ${newAmount}`);
                }
            }
            // Transferências mantém sinal
            else if (category === 'Transferência') {
                // Não altera
            }
            // Alimentação, Transporte, etc devem ser negativas
            else if (category !== 'Outros' && category !== 'Transferência') {
                if (currentAmount > 0) {
                    newAmount = -Math.abs(currentAmount);
                    trans.type = 'expense';
                    shouldUpdate = true;
                    console.log(`📝 ${trans.title} (${category}): R$ ${currentAmount} → R$ ${newAmount}`);
                }
            }

            if (shouldUpdate) {
                await trans.update({ amount: newAmount, type: trans.type });
                fixed++;
            }
        }

        console.log(`\n✅ Correção concluída!`);
        console.log(`   - ${fixed} transações corrigidas`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

fixTransactionAmounts();
