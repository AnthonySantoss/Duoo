const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, User, Wallet, Transaction, CapturedTransaction } = require('../models');

test.beforeEach(async () => {
    await sequelize.sync({ force: true });
});

async function userWithWallet(label) {
    const user = await User.create({
        name: label,
        email: `${label.toLowerCase()}@example.com`,
        password_hash: 'hashed-password'
    });
    const wallet = await Wallet.create({ name: `${label} wallet`, balance: 0, user_id: user.id });
    return { user, wallet };
}

test('notification ids are unique per user instead of globally', async () => {
    const first = await userWithWallet('First');
    const second = await userWithWallet('Second');
    const values = owner => ({
        title: 'Compra capturada', amount: -10, type: 'expense', date: '2026-10-26',
        wallet_id: owner.wallet.id, user_id: owner.user.id,
        capture_source: 'android_notification', source_external_id: 'same-bank-notification-id'
    });

    await Transaction.create(values(first));
    await Transaction.create(values(second));
    await assert.rejects(Transaction.create(values(first)), { name: 'SequelizeUniqueConstraintError' });
});

test('credit card capture markers are unique per user', async () => {
    const first = await userWithWallet('CardFirst');
    const second = await userWithWallet('CardSecond');
    const values = user => ({ user_id: user.id, notification_hash: 'same-card-notification-id', status: 'processed' });

    await CapturedTransaction.create(values(first.user));
    await CapturedTransaction.create(values(second.user));
    await assert.rejects(CapturedTransaction.create(values(first.user)), { name: 'SequelizeUniqueConstraintError' });
});
