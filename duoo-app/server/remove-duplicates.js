const { Transaction } = require('./models');
const { Op } = require('sequelize');

/**
 * Remove transações duplicadas (mesmo título, data e valor)
 */
async function removeDuplicates() {
    try {
        console.log('🔄 Procurando transações duplicadas...\n');

        const allTransactions = await Transaction.findAll({
            order: [['date', 'DESC'], ['id', 'ASC']]
        });

        console.log(`📊 Total de transações: ${allTransactions.length}\n`);

        const seen = new Map();
        const duplicates = [];

        for (const trans of allTransactions) {
            const key = `${trans.title}_${trans.date}_${trans.amount}_${trans.wallet_id}`;

            if (seen.has(key)) {
                duplicates.push(trans);
            } else {
                seen.set(key, trans.id);
            }
        }

        console.log(`🔍 Encontradas ${duplicates.length} transações duplicadas\n`);

        if (duplicates.length === 0) {
            console.log('✅ Nenhuma duplicata encontrada!');
            process.exit(0);
        }

        for (const dup of duplicates) {
            console.log(`🗑️  Deletando: ${dup.title} - R$ ${dup.amount} (${dup.date})`);
            await dup.destroy();
        }

        console.log(`\n✅ Limpeza concluída!`);
        console.log(`   - ${duplicates.length} transações duplicadas removidas`);
        console.log(`   - ${allTransactions.length - duplicates.length} transações mantidas`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

removeDuplicates();
