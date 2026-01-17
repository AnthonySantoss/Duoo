const { Transaction, CreditCardInvoice, CreditCard } = require('./models');
const { Op } = require('sequelize');

/**
 * Marca faturas como pagas baseado em transações de "Pagamento recebido"
 */
async function markInvoicesAsPaid() {
    try {
        console.log('🔄 Processando pagamentos de faturas de cartão...\n');

        // Buscar todas as transações de "Pagamento recebido"
        const payments = await Transaction.findAll({
            where: {
                title: {
                    [Op.like]: '%Pagamento recebido%'
                }
            }
        });

        console.log(`💳 Encontrados ${payments.length} pagamentos de cartão\n`);

        let markedAsPaid = 0;

        for (const payment of payments) {
            const paymentDate = new Date(payment.date);
            const month = paymentDate.getMonth() + 1; // 1-12
            const year = paymentDate.getFullYear();
            const amount = Math.abs(parseFloat(payment.amount));

            console.log(`📅 Pagamento: ${paymentDate.toLocaleDateString('pt-BR')} - R$ ${amount.toFixed(2)}`);

            // Buscar fatura do mês correspondente
            // O pagamento pode ser da fatura do mês anterior ou atual
            const possibleMonths = [
                { month: month, year: year },
                { month: month - 1 === 0 ? 12 : month - 1, year: month - 1 === 0 ? year - 1 : year }
            ];

            let invoiceFound = false;

            for (const period of possibleMonths) {
                const invoices = await CreditCardInvoice.findAll({
                    where: {
                        month: period.month,
                        year: period.year,
                        paid: false
                    }
                });

                for (const invoice of invoices) {
                    const invoiceAmount = Math.abs(parseFloat(invoice.amount));
                    const difference = Math.abs(amount - invoiceAmount);

                    // Se o valor é próximo (diferença menor que R$ 1)
                    if (difference < 1.0) {
                        console.log(`   ✅ Marcando fatura ${period.month}/${period.year} como paga`);
                        console.log(`      Valor fatura: R$ ${invoiceAmount.toFixed(2)}`);

                        await invoice.update({
                            paid: true,
                            paid_date: paymentDate
                        });

                        markedAsPaid++;
                        invoiceFound = true;
                        break;
                    }
                }

                if (invoiceFound) break;
            }

            if (!invoiceFound) {
                console.log(`   ⚠️  Fatura não encontrada para este pagamento`);
            }

            console.log('');
        }

        console.log(`✅ Processamento concluído!`);
        console.log(`   - ${markedAsPaid} faturas marcadas como pagas`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

markInvoicesAsPaid();
