const sequelize = require('./config/database');
const { User, Wallet, Transaction, Goal } = require('./models');
const bcrypt = require('bcryptjs');

const seed = async () => {
    try {
        await sequelize.sync({ force: true }); // Reset database

        // Create Users
        const passwordHash = await bcrypt.hash('123456', 10);

        const ana = await User.create({
            name: 'Ana',
            email: 'ana@duoo.com',
            password_hash: passwordHash
        });

        const bruno = await User.create({
            name: 'Bruno',
            email: 'bruno@duoo.com',
            password_hash: passwordHash
        });

        console.log('Users created');

        // Create Wallets
        const jointWallet = await Wallet.create({
            name: 'Conta Principal',
            type: 'checking',
            balance: 12500.50,
            user_id: ana.id // Primary owner for now
        });

        const anaWallet = await Wallet.create({
            name: 'Carteira da Ana',
            type: 'checking',
            balance: 3200.00,
            user_id: ana.id
        });

        const brunoWallet = await Wallet.create({
            name: 'Investimentos Bruno',
            type: 'investment',
            balance: 9300.50,
            user_id: bruno.id
        });

        console.log('Wallets created');

        // Create Transactions (Mirroring the mock data)
        const transactions = [
            { title: "Supermercado", category: "Alimentação", amount: -450.00, date: "2023-10-25", type: 'expense', wallet_id: jointWallet.id, user_id: ana.id },
            { title: "Assinatura Netflix", category: "Lazer", amount: -55.90, date: "2023-10-24", type: 'expense', wallet_id: anaWallet.id, user_id: ana.id },
            { title: "Dividendos PETR4", category: "Investimento", amount: 120.00, date: "2023-10-23", type: 'income', wallet_id: brunoWallet.id, user_id: bruno.id },
            { title: "Aluguel", category: "Moradia", amount: -2800.00, date: "2023-10-01", type: 'expense', wallet_id: jointWallet.id, user_id: ana.id },
            { title: "Freelance Design", category: "Renda", amount: 1500.00, date: "2023-10-20", type: 'income', wallet_id: anaWallet.id, user_id: ana.id },
            { title: "Conta de Luz", category: "Contas", amount: -180.00, date: "2023-10-05", type: 'expense', wallet_id: jointWallet.id, user_id: bruno.id }, // Bruno paid joint bill
            { title: "Jantar Fora", category: "Lazer", amount: -210.00, date: "2023-10-22", type: 'expense', wallet_id: jointWallet.id, user_id: ana.id },
            { title: "Farmácia", category: "Saúde", amount: -85.50, date: "2023-10-25", type: 'expense', wallet_id: jointWallet.id, user_id: ana.id },
            { title: "Uber", category: "Transporte", amount: -24.90, date: "2023-10-24", type: 'expense', wallet_id: brunoWallet.id, user_id: bruno.id },
        ];

        for (const t of transactions) {
            await Transaction.create(t);
        }

        console.log('Transactions created');

        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
};

seed();
