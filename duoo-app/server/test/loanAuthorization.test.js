const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, User, Wallet, Goal, Loan, Transaction } = require('../models');
const loanController = require('../controllers/loanController');

function responseRecorder() {
    const result = { statusCode: 200, body: null };
    result.response = {
        status(code) {
            result.statusCode = code;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        }
    };
    return result;
}

async function createUser(name) {
    return User.create({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '-')}@example.com`,
        password_hash: 'hashed-password'
    });
}

test.beforeEach(async () => {
    await sequelize.sync({ force: true });
});

test('loan creation accepts a shared partner goal and rejects goals outside the couple', async () => {
    const currentUser = await createUser('Current User');
    const partner = await createUser('Partner User');
    const outsider = await createUser('Outside User');
    await currentUser.update({ partner_id: partner.id });
    await partner.update({ partner_id: currentUser.id });

    const wallet = await Wallet.create({ name: 'Current wallet', balance: 100, user_id: currentUser.id });
    const sharedPartnerGoal = await Goal.create({
        title: 'Shared reserve', target_amount: 1000, current_amount: 500,
        is_joint: true, user_id: partner.id
    });
    const outsideGoal = await Goal.create({
        title: 'Outside reserve', target_amount: 1000, current_amount: 500,
        is_joint: true, user_id: outsider.id
    });

    const allowed = responseRecorder();
    await loanController.createLoan({
        user: { id: currentUser.id },
        body: { goal_id: sharedPartnerGoal.id, wallet_id: wallet.id, amount: 100, installments: 2, interest_rate: 0 }
    }, allowed.response);

    assert.equal(allowed.statusCode, 201);
    assert.equal(allowed.body.user_id, currentUser.id);
    await sharedPartnerGoal.reload();
    await wallet.reload();
    assert.equal(Number(sharedPartnerGoal.current_amount), 400);
    assert.equal(Number(wallet.balance), 200);

    const denied = responseRecorder();
    await loanController.createLoan({
        user: { id: currentUser.id },
        body: { goal_id: outsideGoal.id, wallet_id: wallet.id, amount: 100, installments: 2, interest_rate: 0 }
    }, denied.response);

    assert.equal(denied.statusCode, 404);
    await outsideGoal.reload();
    assert.equal(Number(outsideGoal.current_amount), 500);
});

test('loan creation rejects a private goal owned by the partner', async () => {
    const currentUser = await createUser('Private Current');
    const partner = await createUser('Private Partner');
    await currentUser.update({ partner_id: partner.id });
    await partner.update({ partner_id: currentUser.id });
    const wallet = await Wallet.create({ name: 'Current wallet', balance: 100, user_id: currentUser.id });
    const privateGoal = await Goal.create({
        title: 'Private reserve', target_amount: 1000, current_amount: 500,
        is_joint: false, user_id: partner.id
    });

    const denied = responseRecorder();
    await loanController.createLoan({
        user: { id: currentUser.id },
        body: { goal_id: privateGoal.id, wallet_id: wallet.id, amount: 100, installments: 2, interest_rate: 0 }
    }, denied.response);

    assert.equal(denied.statusCode, 404);
    assert.equal(await Loan.count(), 0);
    assert.equal(await Transaction.count(), 0);
});

test('installment payment is limited to loans owned by the linked couple', async () => {
    const currentUser = await createUser('Paying User');
    const partner = await createUser('Borrowing Partner');
    const outsider = await createUser('Other Borrower');
    await currentUser.update({ partner_id: partner.id });
    await partner.update({ partner_id: currentUser.id });

    const wallet = await Wallet.create({ name: 'Payment wallet', balance: 300, user_id: currentUser.id });
    const partnerGoal = await Goal.create({ title: 'Couple reserve', target_amount: 1000, current_amount: 400, is_joint: true, user_id: partner.id });
    const outsideGoal = await Goal.create({ title: 'Outside reserve', target_amount: 1000, current_amount: 400, is_joint: true, user_id: outsider.id });
    const partnerLoan = await Loan.create({
        user_id: partner.id, goal_id: partnerGoal.id, original_amount: 100,
        total_amount: 100, remaining_amount: 100, installments_total: 2,
        installments_paid: 0, installment_value: 50, interest_rate: 0, status: 'active'
    });
    const outsideLoan = await Loan.create({
        user_id: outsider.id, goal_id: outsideGoal.id, original_amount: 100,
        total_amount: 100, remaining_amount: 100, installments_total: 2,
        installments_paid: 0, installment_value: 50, interest_rate: 0, status: 'active'
    });

    const denied = responseRecorder();
    await loanController.payInstallment({
        user: { id: currentUser.id }, params: { id: outsideLoan.id }, body: { wallet_id: wallet.id }
    }, denied.response);
    assert.equal(denied.statusCode, 404);

    const allowed = responseRecorder();
    await loanController.payInstallment({
        user: { id: currentUser.id }, params: { id: partnerLoan.id }, body: { wallet_id: wallet.id }
    }, allowed.response);
    assert.equal(allowed.statusCode, 200);

    await Promise.all([wallet.reload(), partnerGoal.reload(), partnerLoan.reload(), outsideLoan.reload()]);
    assert.equal(Number(wallet.balance), 250);
    assert.equal(Number(partnerGoal.current_amount), 450);
    assert.equal(partnerLoan.installments_paid, 1);
    assert.equal(outsideLoan.installments_paid, 0);
});

test('loan listing includes the linked couple and excludes other users', async () => {
    const currentUser = await createUser('Listing User');
    const partner = await createUser('Listing Partner');
    const outsider = await createUser('Listing Outsider');
    await currentUser.update({ partner_id: partner.id });
    await partner.update({ partner_id: currentUser.id });

    const ownGoal = await Goal.create({ title: 'Own goal', target_amount: 500, current_amount: 100, user_id: currentUser.id });
    const partnerGoal = await Goal.create({ title: 'Partner goal', target_amount: 500, current_amount: 100, is_joint: true, user_id: partner.id });
    const outsideGoal = await Goal.create({ title: 'Outside goal', target_amount: 500, current_amount: 100, is_joint: true, user_id: outsider.id });

    for (const [owner, goal] of [[currentUser, ownGoal], [partner, partnerGoal], [outsider, outsideGoal]]) {
        await Loan.create({
            user_id: owner.id, goal_id: goal.id, original_amount: 50,
            total_amount: 50, remaining_amount: 50, installments_total: 1,
            installments_paid: 0, installment_value: 50, interest_rate: 0, status: 'active'
        });
    }

    const result = responseRecorder();
    await loanController.getLoans({ user: { id: currentUser.id } }, result.response);

    assert.equal(result.statusCode, 200);
    assert.deepEqual(new Set(result.body.map(loan => loan.userName)), new Set([currentUser.name, partner.name]));
    assert.equal(result.body.length, 2);
});
