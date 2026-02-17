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
const TransactionCorrection = require('./TransactionCorrection');
const Achievement = require('./Achievement');
const UserAchievement = require('./UserAchievement');
const BudgetAlert = require('./BudgetAlert');
const AlertNotification = require('./AlertNotification');
const Notification = require('./Notification');
const Recurring = require('./Recurring');
const { Challenge, UserChallenge } = require('./Challenge');
const PushSubscription = require('./PushSubscription');
const UserConfig = require('./UserConfig');

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

User.hasMany(TransactionCorrection, { foreignKey: 'user_id' });
TransactionCorrection.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(UserAchievement, { foreignKey: 'user_id' });
UserAchievement.belongsTo(User, { foreignKey: 'user_id' });

Achievement.hasMany(UserAchievement, { foreignKey: 'achievement_id' });
UserAchievement.belongsTo(Achievement, { foreignKey: 'achievement_id' });

User.hasMany(BudgetAlert, { foreignKey: 'user_id' });
BudgetAlert.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(AlertNotification, { foreignKey: 'user_id' });
AlertNotification.belongsTo(User, { foreignKey: 'user_id' });

BudgetAlert.hasMany(AlertNotification, { foreignKey: 'alert_id' });
AlertNotification.belongsTo(BudgetAlert, { foreignKey: 'alert_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Recurring, { foreignKey: 'user_id' });
Recurring.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(PushSubscription, { foreignKey: 'user_id' });
PushSubscription.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(UserConfig, { foreignKey: 'user_id' });
UserConfig.belongsTo(User, { foreignKey: 'user_id' });

// Goal & Transaction (Event Buckets)
Goal.hasMany(Transaction, { foreignKey: 'goal_id' });
Transaction.belongsTo(Goal, { foreignKey: 'goal_id' });

// Challenges
User.hasMany(UserChallenge, { foreignKey: 'user_id' });
UserChallenge.belongsTo(User, { foreignKey: 'user_id' });

Challenge.hasMany(UserChallenge, { foreignKey: 'challenge_id' });
UserChallenge.belongsTo(Challenge, { foreignKey: 'challenge_id' });

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
    Loan,
    TransactionCorrection,
    Achievement,
    UserAchievement,
    BudgetAlert,
    AlertNotification,
    Notification,
    Recurring,
    Challenge,
    UserChallenge,
    PushSubscription,
    UserConfig
};
