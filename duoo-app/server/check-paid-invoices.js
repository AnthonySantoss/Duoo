const { Transaction, CreditCardInvoice, Wallet } = require('./models');
const { Op } = require('sequelize');

/**
 * Verifica faturas existentes e marca como pagas se houver pagamento correspondente
 */
async function checkAndMarkPaidInvoices() {
    try {
        console.log('🔄 Verificando faturas pendentes...\n');

        // Buscar todas as faturas não pagas
        const unpaidInvoices = await CreditCardInvoice.findAll({
            where: {
                paid: false
            }
        });

        console.log(`📊 Encontradas ${unpaidInvoices.length} faturas pendentes\n`);

        // Buscar todos os pagamentos de fatura (gold)
        const payments = await Transaction.findAll({
            include: [{
                model: Wallet,
                as: 'Wallet',
                where: {
                    name: {
                        [Op.like]: '%gold%'
                    }
                }
            }],
            where: {
                [Op.or]: [
                    { title: { [Op.like]: '%Pagamento recebido%' } },
                    { title: { [Op.like]: '%Pagamento de fatura%' } }
                ]
            }
        });

        console.log(`💳 Encontrados ${payments.length} pagamentos de fatura\n`);

        // Agrupar pagamentos por mês/ano (apenas conta gold)
        const paymentsByMonth = {};
        for (const payment of payments) {
            // Filtrar apenas conta gold
            if (!payment.Wallet?.name?.toLowerCase().includes('gold')) continue;

            const paymentDate = new Date(payment.date);
            const month = paymentDate.getMonth() + 1;
            const year = paymentDate.getFullYear();
            const key = `${month}/${year}`;

            if (!paymentsByMonth[key]) {
                paymentsByMonth[key] = {
                    month,
                    year,
                    date: paymentDate,
                    total: 0,
                    payments: []
                };
            }

            const amount = Math.abs(parseFloat(payment.amount));
            paymentsByMonth[key].total += amount;
            paymentsByMonth[key].payments.push({ amount, title: payment.title });
        }

        console.log('📊 Pagamentos agrupados por mês:');
        for (const [key, data] of Object.entries(paymentsByMonth)) {
            console.log(`   ${key}: R$ ${data.total.toFixed(2)} (${data.payments.length} pagamento(s))`);
        }
        console.log('');

        let markedAsPaid = 0;

        for (const invoice of unpaidInvoices) {
            const invoiceAmount = Math.abs(parseFloat(invoice.amount));
            const invoiceMonth = invoice.month;
            const invoiceYear = invoice.year;

            console.log(`\n📋 Fatura ${invoiceMonth}/${invoiceYear} - R$ ${invoiceAmount.toFixed(2)}`);

            // Procurar pagamento correspondente no mesmo mês ou mês seguinte
            const possibleKeys = [
                `${invoiceMonth}/${invoiceYear}`,
                `${(invoiceMonth % 12) + 1}/${invoiceMonth === 12 ? invoiceYear + 1 : invoiceYear}`
            ];

            let found = false;
            for (const key of possibleKeys) {
                const paymentData = paymentsByMonth[key];
                if (!paymentData) continue;

                const difference = Math.abs(paymentData.total - invoiceAmount);

                // Tolerância de R$ 1000,00
                if (difference < 1000.0) {
                    await invoice.update({
                        paid: true,
                        paid_date: paymentData.date
                    });

                    console.log(`   ✅ PAGA em ${paymentData.date.toLocaleDateString('pt-BR')}`);
                    console.log(`      Valor fatura: R$ ${invoiceAmount.toFixed(2)}`);
                    console.log(`      Valor pago: R$ ${paymentData.total.toFixed(2)}`);
                    console.log(`      Diferença: R$ ${difference.toFixed(2)}`);

                    markedAsPaid++;
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.log(`   ⚠️  Ainda PENDENTE - Nenhum pagamento correspondente encontrado`);
            }
        }

        console.log(`\n✅ Verificação concluída!`);
        console.log(`   - ${markedAsPaid} faturas marcadas como pagas`);
        console.log(`   - ${unpaidInvoices.length - markedAsPaid} faturas ainda pendentes`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

checkAndMarkPaidInvoices();
