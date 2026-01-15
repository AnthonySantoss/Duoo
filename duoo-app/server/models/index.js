const sequelize = require('../config/database');
const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Goal = require('./Goal');
const CreditCard = require('./CreditCard');
const CreditCardPurchase = require('./CreditCardPurchase');
const Simulation = require('./Simulation');
const CreditCardInvoice = require('./CreditCardInvoice');
const Loan = require('./Loan');

// Associations
User.hasMany(Wallet, { foreignKey: 'user_id' });
Wallet.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Transaction, { foreignKey: 'user_id' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

Wallet.hasMany(Transaction, { foreignKey: 'wallet_id' });
Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id' });

User.hasMany(Goal, { foreignKey: 'user_id' });
Goal.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(CreditCard, { foreignKey: 'user_id' });
CreditCard.belongsTo(User, { foreignKey: 'user_id' });

CreditCard.hasMany(CreditCardPurchase, { foreignKey: 'credit_card_id' });
CreditCardPurchase.belongsTo(CreditCard, { foreignKey: 'credit_card_id' });

User.hasMany(Simulation, { foreignKey: 'user_id' });
Simulation.belongsTo(User, { foreignKey: 'user_id' });

CreditCard.hasMany(CreditCardInvoice, { foreignKey: 'credit_card_id' });
CreditCardInvoice.belongsTo(CreditCard, { foreignKey: 'credit_card_id' });

User.hasMany(Loan, { foreignKey: 'user_id' });
Loan.belongsTo(User, { foreignKey: 'user_id' });

Goal.hasMany(Loan, { foreignKey: 'goal_id' });
Loan.belongsTo(Goal, { foreignKey: 'goal_id' });

module.exports = {
    sequelize,
    User,
    Wallet,
    Transaction,
    Goal,
    CreditCard,
    CreditCardPurchase,
    Simulation,
    CreditCardInvoice,
    Loan
};
