const pluggyService = require('../services/pluggyService');
const { Wallet, Transaction, Goal, CreditCard, CreditCardInvoice, CreditCardPurchase, sequelize } = require('../models');
const { Op } = require('sequelize');
// Certifique-se que o caminho do seu serviço de categorização está correto:
const categorizerService = require('../services/transactionCategorizer');

/**
 * 1. GET CONNECT TOKEN
 * Gera o token para abrir o Widget da Pluggy no Frontend
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
 * 2. SYNC ITEM (ESCRITA)
 * Sincroniza contas, transações, investimentos e cartões.
 * Correções aplicadas: Paginação total, Upsert (atualização) e fix de saldo de metas.
 */
const syncItem = async (req, res) => {
    try {
        const { itemId } = req.body;
        const userId = req.user.id;

        if (!itemId) {
            return res.status(400).json({ error: 'itemId is required' });
        }

        // 1. Obter detalhes do Item e Contas
        const item = await pluggyService.getItem(itemId);
        const accounts = await pluggyService.getAccounts(itemId);
        console.log(`🔄 Syncing Item: ${item.connector.name} | Found ${accounts.length} accounts`);

        let stats = {
            transactions: 0,
            goals: 0,
            creditCards: 0,
            invoices: 0
        };

        // 2. Processar Contas e Transações (Extrato Unificado)
        for (const account of accounts) {

            // --- A. Criar ou Atualizar Wallet ---
            // Usamos findOrCreate e depois update para garantir que o saldo esteja sempre fresco
            const [wallet, created] = await Wallet.findOrCreate({
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

            // Atualiza saldo sempre
            await wallet.update({
                balance: account.balance || 0,
                last_sync: new Date()
            });

            // --- B. Buscar Transações (Com Paginação Automática) ---
            try {
                // Busca TODAS as páginas disponíveis no último ano
                const transactions = await fetchAllTransactions(account.id);
                console.log(`   📄 Conta ${account.name}: ${transactions.length} transações recuperadas.`);

                for (const trans of transactions) {
                    await processTransaction(trans, account, wallet, userId);
                    stats.transactions++;
                }
            } catch (error) {
                console.error(`❌ Failed to sync transactions for account ${account.id}:`, error.message);
            }
        }

        // 3. Processar Investimentos (Goals)
        try {
            const investments = await pluggyService.getInvestments(itemId);
            console.log(`📊 Found ${investments.length} investments`);

            for (const investment of investments) {
                const goalName = investment.name || investment.code || 'Investimento';
                const goalAmount = investment.balance || investment.amount || 0;
                const goalType = detectGoalType(goalName);

                // CORREÇÃO: Atualizar saldo se já existir
                const [goal, created] = await Goal.findOrCreate({
                    where: {
                        user_id: userId,
                        pluggy_investment_id: investment.id
                    },
                    defaults: {
                        user_id: userId,
                        title: goalName,
                        target_amount: goalAmount * 1.5,
                        current_amount: goalAmount,
                        deadline: calculateDeadline(investment),
                        category: goalType,
                        pluggy_item_id: itemId,
                        pluggy_investment_id: investment.id
                    }
                });

                // Se já existia, atualiza o saldo atual
                if (!created) {
                    await goal.update({
                        current_amount: goalAmount,
                        // last_sync: new Date() // Descomente se tiver essa coluna em Goal
                    });
                }
                stats.goals++;
            }
        } catch (error) {
            // Alguns conectores não suportam investimentos, então é um aviso, não erro crítico
            console.warn('⚠️ Investments sync skipped or failed (might not be available):', error.message);
        }

        // 4. Processar Cartões de Crédito e Faturas (Detalhamento)
        // Isso roda separado para popular as tabelas específicas de CreditCardInvoice/Purchase
        try {
            const creditCards = await pluggyService.getCreditCards(itemId);

            for (const card of creditCards) {
                // Create or update credit card
                const [creditCard, created] = await CreditCard.findOrCreate({
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

                // Sempre atualizar limite
                await creditCard.update({
                    limit: card.creditLimit || creditCard.limit,
                    last_sync: new Date()
                });

                stats.creditCards++;

                // Processar Faturas e Compras do Cartão
                await processCreditCardInvoices(card, creditCard);
                stats.invoices++;
            }
        } catch (error) {
            console.error('❌ Failed to sync credit card details:', error.message);
        }

        res.json({
            success: true,
            message: `Sincronização concluída!`,
            stats
        });

    } catch (error) {
        console.error('❌ Critical error in syncItem:', error);
        res.status(500).json({ error: 'Failed to sync item data' });
    }
};

/**
 * 3. GET TRANSACTIONS (LEITURA)
 * Lista as transações para o Frontend com filtros e paginação.
 * Isso resolve o problema da tela vazia.
 */
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            page = 1,
            limit = 20,
            month,
            year,
            search,
            type,
            walletId
        } = req.query;

        const offset = (page - 1) * limit;

        const whereClause = {
            user_id: userId
        };

        // Filtro de Data
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            whereClause.date = { [Op.between]: [startDate, endDate] };
        }

        // Filtro de Busca
        if (search) {
            whereClause.title = { [Op.iLike]: `%${search}%` };
        }

        // Filtro por Tipo
        if (type) whereClause.type = type;

        // Filtro por Carteira
        if (walletId) whereClause.wallet_id = walletId;

        const { count, rows } = await Transaction.findAndCountAll({
            where: whereClause,
            include: [{
                model: Wallet,
                as: 'wallet',
                attributes: ['id', 'name', 'bank_name', 'type']
            }],
            order: [['date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            transactions: rows,
            meta: {
                total: count,
                page: parseInt(page),
                totalPages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        console.error('Erro ao listar transações:', error);
        res.status(500).json({ error: 'Erro interno ao buscar transações' });
    }
};

/**
 * 4. GET CONNECTED ITEMS
 * Lista os bancos conectados para mostrar na tela de "Contas".
 */
const getConnectedItems = async (req, res) => {
    try {
        const userId = req.user.id;

        const wallets = await Wallet.findAll({
            where: {
                user_id: userId,
                pluggy_item_id: { [Op.ne]: null }
            },
            attributes: ['id', 'name', 'bank_name', 'balance', 'last_sync', 'pluggy_item_id', 'pluggy_account_id', 'type'],
            order: [['last_sync', 'DESC']]
        });

        res.json(wallets);
    } catch (error) {
        console.error('Failed to get connected items:', error);
        res.status(500).json({ error: 'Failed to get connected items' });
    }
};

/**
 * 5. DISCONNECT ITEM
 * Remove a conexão da Pluggy e limpa os dados locais.
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
            await Transaction.destroy({ where: { wallet_id: wallet.id } });
            await wallet.destroy();
        }

        res.json({ success: true, message: 'Conexão removida com sucesso' });
    } catch (error) {
        console.error('Failed to disconnect item:', error);
        res.status(500).json({ error: 'Failed to disconnect item' });
    }
};

/**
 * 6. WEBHOOK HANDLER
 */
const handleWebhook = async (req, res) => {
    try {
        const event = req.body;
        console.log('Pluggy webhook received:', event.event);
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};


// =======================================================
// HELPER FUNCTIONS (AUXILIARES INTERNAS)
// =======================================================

/**
 * Busca TODAS as páginas de transações da Pluggy (Paginação)
 */
async function fetchAllTransactions(accountId) {
    let allResults = [];
    let page = 1;
    let totalPages = 1;

    // Configura filtro de data: últimos 12 meses
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 1);
    const fromString = fromDate.toISOString().split('T')[0];

    try {
        do {
            const response = await pluggyService.getTransactions(accountId, {
                from: fromString,
                pageSize: 500,
                page: page
            });

            if (response.results && response.results.length > 0) {
                allResults = allResults.concat(response.results);
            }

            totalPages = response.totalPages || 0;
            page++;
        } while (page <= totalPages);

    } catch (error) {
        console.error(`Error fetching pages for account ${accountId}:`, error.message);
    }

    return allResults;
}

/**
 * Processa uma única transação: Categoriza e faz Upsert
 */
async function processTransaction(trans, account, wallet, userId) {
    const amount = trans.amount || 0;
    const description = trans.description || 'Transação';

    // 1. Categorização
    const categorizer = categorizerService.getInstance();
    let category = categorizer.categorize(description, trans.category);

    // Pular transações de investimento no feed principal
    if (category === 'Investimento') return;

    // 2. Definição de Tipo e Valor
    let type = amount >= 0 ? 'income' : 'expense';
    let finalAmount = amount;
    let finalCategory = category;

    const accountType = account.type?.toLowerCase() || '';
    const accountSubtype = account.subtype?.toLowerCase() || '';
    const isCreditAccount = accountType.includes('credit') || accountSubtype.includes('credit') || account.name?.toLowerCase().includes('gold');

    // Lógica Específica: Pagamento de Fatura
    const isInvoicePayment = description.toLowerCase().includes('pagamento recebido') ||
        description.toLowerCase().includes('pagamento de fatura');

    if (isCreditAccount && isInvoicePayment) {
        // Tenta marcar a fatura como paga
        await handleInvoicePayment(trans, amount);

        // Define como Transferência (Entrada no cartão, saída da conta)
        finalCategory = 'Transferência';
        type = 'transfer';
        finalAmount = Math.abs(amount);
    }
    // Lógica Específica: Compras no Crédito (sempre despesa)
    else if (isCreditAccount || description.toLowerCase().match(/compra\s*(no|em)\s*(debito|d[eé]bito|credito|cr[eé]dito)|pagamento\s*efetuado/i)) {
        type = 'expense';
        finalAmount = -Math.abs(amount);
    }
    else if (category === 'Receita') {
        type = 'income';
        finalAmount = Math.abs(amount);
    }
    else if (category === 'Transferência') {
        // Mantém sinal original
    }
    else if (category !== 'Outros') {
        type = 'expense';
        finalAmount = -Math.abs(amount);
    }

    // 3. Salvar (Upsert)
    // Usa findOrCreate + update para garantir atualização de dados antigos
    const [transaction, created] = await Transaction.findOrCreate({
        where: { pluggy_transaction_id: trans.id },
        defaults: {
            user_id: userId,
            wallet_id: wallet.id,
            title: description,
            amount: finalAmount,
            category: finalCategory,
            type: type,
            date: trans.date || new Date(),
            pluggy_transaction_id: trans.id,
            pluggy_account_id: account.id,
            status: trans.status || 'COMPLETED'
        }
    });

    if (!created) {
        await transaction.update({
            title: description,
            amount: finalAmount,
            category: finalCategory,
            type: type,
            date: trans.date,
            status: trans.status || 'COMPLETED'
        });
    }
}

/**
 * Marca faturas como pagas baseado no valor do pagamento
 */
async function handleInvoicePayment(trans, amount) {
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
                // Margem de erro de R$ 5,00
                if (Math.abs(paymentAmount - parseFloat(invoice.amount)) < 5.0) {
                    await invoice.update({ paid: true, paid_date: paymentDate });
                    console.log(`✅ Fatura ${period.month}/${period.year} marcada como paga!`);
                }
            }
        }
    } catch (err) {
        console.error('Erro ao processar pagamento de fatura:', err.message);
    }
}

/**
 * Processa Faturas e Compras (Para as tabelas CreditCard*)
 */
async function processCreditCardInvoices(card, creditCard) {
    try {
        const transactions = await pluggyService.getCreditCardTransactions(card.id, {
            pageSize: 500,
            from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
        });

        // Agrupar transações por Mês/Ano
        const invoiceMap = {};

        for (const trans of transactions) {
            const transDate = new Date(trans.date);
            const month = transDate.getMonth() + 1;
            const year = transDate.getFullYear();
            const key = `${year}-${month}`;

            if (!invoiceMap[key]) {
                invoiceMap[key] = { month, year, amount: 0, transactions: [] };
            }

            invoiceMap[key].amount += Math.abs(trans.amount || 0);
            invoiceMap[key].transactions.push(trans);
        }

        // Criar/Atualizar Faturas
        for (const [key, invoiceData] of Object.entries(invoiceMap)) {
            const dueDate = new Date(invoiceData.year, invoiceData.month - 1, creditCard.due_day);

            const [invoice] = await CreditCardInvoice.findOrCreate({
                where: {
                    credit_card_id: creditCard.id,
                    month: invoiceData.month,
                    year: invoiceData.year
                },
                defaults: {
                    amount: invoiceData.amount,
                    due_date: dueDate,
                    paid: false
                }
            });

            // Atualiza valor da fatura sempre
            await invoice.update({ amount: invoiceData.amount });

            // Salvar compras (Purchase)
            for (const trans of invoiceData.transactions) {
                const transAmount = Math.abs(trans.amount || 0);
                const installments = trans.paymentData?.installments || 1;

                await CreditCardPurchase.findOrCreate({
                    where: {
                        credit_card_id: creditCard.id,
                        description: trans.description || 'Compra',
                        purchase_date: trans.date,
                        total_amount: transAmount
                    },
                    defaults: {
                        category: trans.category,
                        installments: installments,
                        installment_amount: transAmount / installments,
                        remaining_installments: installments,
                        credit_card_id: creditCard.id,
                        description: trans.description,
                        purchase_date: trans.date,
                        total_amount: transAmount
                    }
                });
            }
        }
    } catch (error) {
        console.error(`Error processing credit card invoices for card ${card.id}:`, error.message);
    }
}

// =======================================================
// HELPERS PUROS
// =======================================================

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

function detectGoalType(name) {
    if (!name) return 'Outros';
    const n = name.toLowerCase();
    if (n.includes('casa') || n.includes('imovel')) return 'Casa';
    if (n.includes('carro') || n.includes('veiculo')) return 'Carro';
    if (n.includes('viagem') || n.includes('ferias')) return 'Viagem';
    if (n.includes('reserva') || n.includes('emergencia')) return 'Reserva de Emergência';
    if (n.includes('estudo') || n.includes('curso') || n.includes('educacao')) return 'Educação';
    if (n.includes('casamento')) return 'Casamento';
    return 'Outros';
}

function calculateDeadline(investment) {
    if (investment.maturityDate) return investment.maturityDate;
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
}

// =======================================================
// EXPORTS
// =======================================================

module.exports = {
    getConnectToken,
    syncItem,
    getTransactions,    // Endpoint novo de leitura
    getConnectedItems,  // Endpoint novo de leitura
    disconnectItem,     // Endpoint novo de remoção
    handleWebhook
};
