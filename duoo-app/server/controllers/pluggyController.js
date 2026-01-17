const pluggyService = require('../services/pluggyService');
const { Wallet, Transaction, Goal, CreditCard, CreditCardInvoice, CreditCardPurchase } = require('../models');
const { Op } = require('sequelize');
const categorizerService = require('../services/transactionCategorizer');

/**
 * Generate connect token for user
 */
const getConnectToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const connectToken = await pluggyService.createConnectToken(userId);

        res.json({ connectToken });
    } catch (error) {
        console.error('Failed to generate connect token:', error);
        res.status(500).json({ error: 'Failed to generate connect token' });
    }
};

/**
 * Sync item data (accounts and transactions)
 */
const syncItem = async (req, res) => {
    try {
        const { itemId } = req.body;
        const userId = req.user.id;

        if (!itemId) {
            return res.status(400).json({ error: 'itemId is required' });
        }

        // Get item details
        const item = await pluggyService.getItem(itemId);
        console.log('Syncing item:', item);

        // Get all accounts for this item
        const accounts = await pluggyService.getAccounts(itemId);
        console.log(`Found ${accounts.length} accounts`);

        let totalTransactions = 0;
        let totalGoals = 0;

        for (const account of accounts) {
            // Create or update wallet
            const [wallet] = await Wallet.findOrCreate({
                where: {
                    user_id: userId,
                    pluggy_account_id: account.id
                },
                defaults: {
                    name: account.name || `${item.connector.name} - ${account.type}`,
                    balance: account.balance || 0,
                    type: mapAccountType(account.type),
                    pluggy_item_id: itemId,
                    pluggy_account_id: account.id,
                    bank_name: item.connector.name,
                    last_sync: new Date()
                }
            });

            // Update balance if wallet exists
            if (wallet) {
                await wallet.update({
                    balance: account.balance || 0,
                    last_sync: new Date()
                });
            }

            // Get transactions for this account
            try {
                const transactions = await pluggyService.getTransactions(account.id, {
                    pageSize: 200 // Last 200 transactions
                });

                console.log(`Found ${transactions.length} transactions for account ${account.id}`);

                // Save transactions
                for (const trans of transactions) {
                    const amount = trans.amount || 0;
                    const description = trans.description || 'Transação';

                    // Usar categorizador inteligente
                    const categorizer = categorizerService.getInstance();
                    let category = categorizer.categorize(description, trans.category);

                    // Skip investment transactions (they're handled separately)
                    if (category === 'Investimento') {
                        console.log(`⏭️  Skipping investment transaction: ${description}`);
                        continue;
                    }

                    // Determine type - credit card purchases are always expenses
                    let type = amount >= 0 ? 'income' : 'expense';
                    let finalAmount = amount;
                    let finalCategory = category;

                    // Se a conta é gold (cartão de crédito), todas são despesas
                    const accountType = account.type?.toLowerCase() || '';
                    const accountSubtype = account.subtype?.toLowerCase() || '';
                    const isCreditAccount = accountType.includes('credit') ||
                        accountSubtype.includes('credit') ||
                        account.name?.toLowerCase().includes('gold');

                    // Se é "Pagamento recebido" ou "Pagamento de fatura" em conta crédito:
                    // 1. Processa a fatura (marca como paga)
                    // 2. Salva como Transferência (para controle, sem impactar Receita)
                    const isInvoicePayment = description.toLowerCase().includes('pagamento recebido') ||
                        description.toLowerCase().includes('pagamento de fatura');

                    if (isCreditAccount && isInvoicePayment) {
                        console.log(`💳 Processando pagamento de fatura: ${description} - R$ ${amount}`);

                        // Marca fatura como paga
                        try {
                            const paymentDate = new Date(trans.date);
                            const month = paymentDate.getMonth() + 1;
                            const year = paymentDate.getFullYear();
                            const paymentAmount = Math.abs(amount);
                            const possibleMonths = [
                                { month, year },
                                { month: month - 1 === 0 ? 12 : month - 1, year: month - 1 === 0 ? year - 1 : year }
                            ];

                            for (const period of possibleMonths) {
                                const invoices = await CreditCardInvoice.findAll({
                                    where: {
                                        month: period.month,
                                        year: period.year,
                                        paid: false
                                    }
                                });

                                for (const invoice of invoices) {
                                    if (Math.abs(paymentAmount - parseFloat(invoice.amount)) < 5.0) {
                                        await invoice.update({ paid: true, paid_date: paymentDate });
                                        console.log(`✅ Fatura ${period.month}/${period.year} marcada como paga!`);
                                    }
                                }
                            }
                        } catch (err) {
                            console.error('Erro no processamento da fatura:', err);
                        }

                        // Define como Transferência e continua para salvar
                        finalCategory = 'Transferência';
                        type = 'transfer'; // Tipo neutro
                        finalAmount = Math.abs(amount); // Positivo pois entra no cartão
                    }
                    // Compras de cartão são SEMPRE despesas (valor negativo)
                    else if (isCreditAccount || description.toLowerCase().match(/compra\s*(no|em)\s*(debito|d[eé]bito|credito|cr[eé]dito)|pagamento\s*efetuado/i)) {
                        type = 'expense';
                        finalAmount = -Math.abs(amount); // Força negativo
                    }
                    // Receitas devem ser positivas
                    else if (category === 'Receita') {
                        type = 'income';
                        finalAmount = Math.abs(amount); // Força positivo
                    }
                    // Transferências mantém sinal original
                    else if (category === 'Transferência') {
                        // Mantém como está
                    }
                    // Outras categorias (Alimentação, Transporte, etc) são despesas
                    else if (category !== 'Outros') {
                        type = 'expense';
                        finalAmount = -Math.abs(amount); // Força negativo
                    }

                    await Transaction.findOrCreate({
                        where: {
                            pluggy_transaction_id: trans.id
                        },
                        defaults: {
                            user_id: userId,
                            wallet_id: wallet.id,
                            title: description,
                            amount: finalAmount,
                            category: finalCategory,
                            type: type,
                            date: trans.date || new Date(),
                            pluggy_transaction_id: trans.id,
                            pluggy_account_id: account.id
                        }
                    });

                    totalTransactions++;
                }
            } catch (error) {
                console.error(`Failed to sync transactions for account ${account.id}:`, error);
                // Continue with other accounts even if one fails
            }
        }

        // Sync Investments (Caixinhas, etc) as Goals
        try {
            console.log(`🔍 Attempting to fetch investments for item ${itemId}...`);
            const investments = await pluggyService.getInvestments(itemId);
            console.log(`📊 Found ${investments.length} investments for item ${itemId}`);

            if (investments.length > 0) {
                console.log('📋 Investment details:', JSON.stringify(investments, null, 2));
            }

            for (const investment of investments) {
                // Map investment to Goal
                const goalName = investment.name || investment.code || 'Investimento';
                const goalAmount = investment.balance || investment.amount || 0;
                const goalType = detectGoalType(goalName);

                console.log(`💰 Creating goal: ${goalName} - R$ ${goalAmount}`);

                await Goal.findOrCreate({
                    where: {
                        user_id: userId,
                        pluggy_investment_id: investment.id
                    },
                    defaults: {
                        user_id: userId,
                        title: goalName,  // Usar 'title' ao invés de 'name'
                        target_amount: goalAmount * 1.5,
                        current_amount: goalAmount,
                        deadline: calculateDeadline(investment),
                        category: goalType,
                        pluggy_investment_id: investment.id,
                        pluggy_item_id: itemId
                    }
                });

                totalGoals++;
                console.log(`✅ Goal created successfully`);
            }
        } catch (error) {
            console.error('❌ Failed to sync investments:', error.message);
            console.error('Full error:', error);
            // Investments might not be available for all connectors
        }

        // Sync Credit Cards and Invoices
        const { CreditCard, CreditCardInvoice, CreditCardPurchase } = require('../models');
        let totalCreditCards = 0;
        let totalInvoices = 0;

        try {
            const creditCards = await pluggyService.getCreditCards(itemId);
            console.log(`Found ${creditCards.length} credit cards for item ${itemId}`);

            for (const card of creditCards) {
                // Create or update credit card
                const [creditCard] = await CreditCard.findOrCreate({
                    where: {
                        user_id: userId,
                        pluggy_account_id: card.id
                    },
                    defaults: {
                        user_id: userId,
                        name: card.name || `${item.connector.name} - Cartão`,
                        limit: card.creditLimit || 0,
                        due_day: card.bankData?.dueDay || 10,
                        closing_day: card.bankData?.closingDay || 5,
                        pluggy_account_id: card.id,
                        pluggy_item_id: itemId,
                        bank_name: item.connector.name,
                        last_sync: new Date()
                    }
                });

                // Update if exists
                if (creditCard) {
                    await creditCard.update({
                        limit: card.creditLimit || creditCard.limit,
                        last_sync: new Date()
                    });
                }

                totalCreditCards++;

                // Get credit card transactions
                try {
                    const transactions = await pluggyService.getCreditCardTransactions(card.id, {
                        pageSize: 200
                    });

                    console.log(`Found ${transactions.length} credit card transactions`);

                    // Group transactions by month/year to create invoices
                    const invoiceMap = {};

                    for (const trans of transactions) {
                        const transDate = new Date(trans.date);
                        const month = transDate.getMonth() + 1;
                        const year = transDate.getFullYear();
                        const key = `${year}-${month}`;

                        if (!invoiceMap[key]) {
                            invoiceMap[key] = {
                                month,
                                year,
                                amount: 0,
                                transactions: []
                            };
                        }

                        invoiceMap[key].amount += Math.abs(trans.amount || 0);
                        invoiceMap[key].transactions.push(trans);
                    }

                    // Create/update invoices
                    for (const [key, invoiceData] of Object.entries(invoiceMap)) {
                        const dueDate = new Date(invoiceData.year, invoiceData.month - 1, creditCard.due_day);

                        const [invoice] = await CreditCardInvoice.findOrCreate({
                            where: {
                                credit_card_id: creditCard.id,
                                month: invoiceData.month,
                                year: invoiceData.year
                            },
                            defaults: {
                                credit_card_id: creditCard.id,
                                month: invoiceData.month,
                                year: invoiceData.year,
                                amount: invoiceData.amount,
                                due_date: dueDate,
                                paid: false
                            }
                        });

                        // Update amount if invoice exists
                        if (invoice) {
                            await invoice.update({
                                amount: invoiceData.amount
                            });
                        }

                        totalInvoices++;

                        // Save purchases
                        for (const trans of invoiceData.transactions) {
                            const transAmount = Math.abs(trans.amount || 0);

                            await CreditCardPurchase.findOrCreate({
                                where: {
                                    credit_card_id: creditCard.id,
                                    description: trans.description || 'Compra',
                                    purchase_date: trans.date
                                },
                                defaults: {
                                    credit_card_id: creditCard.id,
                                    description: trans.description || 'Compra',
                                    total_amount: transAmount,
                                    installments: trans.installments || 1,
                                    installment_amount: transAmount / (trans.installments || 1),
                                    remaining_installments: trans.installments || 1,
                                    purchase_date: trans.date
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Failed to sync credit card transactions:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to sync credit cards:', error);
        }

        res.json({
            success: true,
            message: `Sincronizado com sucesso! ${accounts.length} conta(s), ${totalTransactions} transação(ões), ${totalGoals} objetivo(s), ${totalCreditCards} cartão(ões) e ${totalInvoices} fatura(s).`,
            accountsCount: accounts.length,
            transactionsCount: totalTransactions,
            goalsCount: totalGoals,
            creditCardsCount: totalCreditCards,
            invoicesCount: totalInvoices
        });

    } catch (error) {
        console.error('Failed to sync item:', error);
        res.status(500).json({ error: 'Failed to sync item data' });
    }
};

/**
 * Get user's connected items
 */
const getConnectedItems = async (req, res) => {
    try {
        const userId = req.user.id;

        const { Op } = require('sequelize');

        const wallets = await Wallet.findAll({
            where: {
                user_id: userId,
                pluggy_item_id: { [Op.ne]: null }
            },
            attributes: ['id', 'name', 'bank_name', 'balance', 'last_sync', 'pluggy_item_id']
        });

        res.json(wallets);
    } catch (error) {
        console.error('Failed to get connected items:', error);
        res.status(500).json({ error: 'Failed to get connected items' });
    }
};

/**
 * Disconnect item (delete from Pluggy and remove from database)
 */
const disconnectItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user.id;

        // Delete from Pluggy
        await pluggyService.deleteItem(itemId);

        // Remove wallets and transactions
        const wallets = await Wallet.findAll({
            where: {
                user_id: userId,
                pluggy_item_id: itemId
            }
        });

        for (const wallet of wallets) {
            // Delete transactions
            await Transaction.destroy({
                where: { wallet_id: wallet.id }
            });

            // Delete wallet
            await wallet.destroy();
        }

        res.json({ success: true, message: 'Conexão removida com sucesso' });
    } catch (error) {
        console.error('Failed to disconnect item:', error);
        res.status(500).json({ error: 'Failed to disconnect item' });
    }
};

/**
 * Webhook handler for Pluggy events
 */
const handleWebhook = async (req, res) => {
    try {
        const event = req.body;
        console.log('Pluggy webhook received:', event);

        // Handle different event types
        switch (event.event) {
            case 'item/updated':
            case 'item/login':
                // Re-sync item data
                // You can trigger background sync here
                console.log('Item updated, consider re-syncing:', event.data.itemId);
                break;

            case 'item/error':
                console.error('Item error:', event.data);
                break;

            default:
                console.log('Unhandled webhook event:', event.event);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

/**
 * Map Pluggy account type to our wallet type
 */
function mapAccountType(pluggyType) {
    const typeMap = {
        'CHECKING_ACCOUNT': 'Conta Corrente',
        'SAVINGS_ACCOUNT': 'Poupança',
        'CREDIT_CARD': 'Cartão de Crédito',
        'INVESTMENT': 'Investimento',
        'LOAN': 'Empréstimo'
    };

    return typeMap[pluggyType] || 'Outra';
}

/**
 * Map transaction description to category with Pluggy support
 */
function mapCategory(description, pluggyCategory) {
    if (!description) return 'Outros';

    // Try Pluggy category first
    if (pluggyCategory) {
        const categoryMap = {
            'Food and Drink': 'Alimentação',
            'Shopping': 'Compras',
            'Entertainment': 'Lazer',
            'Transportation': 'Transporte',
            'Healthcare': 'Saúde',
            'Bills and Utilities': 'Contas',
            'Home': 'Moradia',
            'Education': 'Educação',
            'Transfer': 'Transferência',
            'Income': 'Receita',
            'Investment': 'Investimento'
        };

        if (categoryMap[pluggyCategory]) {
            return categoryMap[pluggyCategory];
        }
    }

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
}

/**
 * Detect goal type from investment name
 */
function detectGoalType(name) {
    if (!name) return 'Outros';

    const nameLower = name.toLowerCase();

    if (nameLower.includes('casa') || nameLower.includes('imovel') || nameLower.includes('imóvel')) {
        return 'Casa';
    }
    if (nameLower.includes('carro') || nameLower.includes('veículo') || nameLower.includes('veiculo')) {
        return 'Carro';
    }
    if (nameLower.includes('viagem') || nameLower.includes('férias') || nameLower.includes('ferias')) {
        return 'Viagem';
    }
    if (nameLower.includes('emergência') || nameLower.includes('emergencia') || nameLower.includes('reserva')) {
        return 'Reserva de Emergência';
    }
    if (nameLower.includes('estudo') || nameLower.includes('educação') || nameLower.includes('educacao') || nameLower.includes('curso')) {
        return 'Educação';
    }
    if (nameLower.includes('casamento') || nameLower.includes('festa')) {
        return 'Casamento';
    }

    return 'Outros';
}

/**
 * Calculate deadline for investment/goal
 */
function calculateDeadline(investment) {
    // If investment has a maturity date, use it
    if (investment.maturityDate) {
        return investment.maturityDate;
    }

    // Otherwise, set deadline to 1 year from now
    const deadline = new Date();
    deadline.setFullYear(deadline.getFullYear() + 1);
    return deadline;
}

module.exports = {
    getConnectToken,
    syncItem,
    getConnectedItems,
    disconnectItem,
    handleWebhook
};
