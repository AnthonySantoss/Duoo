
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');

// Initialize Sequelize (Mocking the setup to avoid loading the whole app)
// Assuming standard sqlite path or config
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'server/database.sqlite'), // adjust path if needed
    logging: false
});

const Transaction = sequelize.define('Transaction', {
    amount: DataTypes.DECIMAL,
    type: DataTypes.STRING,
    date: DataTypes.DATE,
    user_id: DataTypes.INTEGER
}, { tableName: 'Transactions' }); // Check table name casing if fails

const Wallet = sequelize.define('Wallet', {
    balance: DataTypes.DECIMAL,
    user_id: DataTypes.INTEGER
}, { tableName: 'Wallets' });

async function debug() {
    try {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        console.log(`Checking for Month: ${currentMonth + 1}, Year: ${currentYear}`);

        const transactions = await Transaction.findAll();
        let income = 0;
        let spent = 0;

        transactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const amt = parseFloat(t.amount);
                if (t.type === 'expense') spent += Math.abs(amt);
                if (t.type === 'income') income += amt;
            }
        });

        const wallets = await Wallet.findAll();
        let balance = 0;
        wallets.forEach(w => balance += parseFloat(w.balance || 0));

        const netChange = income - spent;
        const startBalance = balance - netChange;

        let balanceVariation = 0;
        if (startBalance !== 0) {
            balanceVariation = ((balance - startBalance) / Math.abs(startBalance)) * 100;
        } else if (balance !== 0) {
            balanceVariation = 100;
        }

        console.log('--- DEBUG RESULTS ---');
        console.log(`Current Balance: ${balance}`);
        console.log(`Month Income: ${income}`);
        console.log(`Month Spent: ${spent}`);
        console.log(`Net Change: ${netChange}`);
        console.log(`Start Balance (Calculated): ${startBalance}`);
        console.log(`Variation %: ${balanceVariation}`);

    } catch (e) {
        console.error(e);
    }
}

debug();
