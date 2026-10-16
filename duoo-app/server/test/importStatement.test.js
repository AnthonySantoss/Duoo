const test = require('node:test');
const assert = require('node:assert/strict');
const { parseOFXSimple, parseCSV, detectCategory, previewStatement, confirmStatement } = require('../controllers/importController');
const { sequelize, User, Wallet, Transaction } = require('../models');

test('parseOFXSimple extracts date, amount, description and FITID', () => {
    const ofxSample = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261015120000[-03:BRT]
<TRNAMT>-125.50
<FITID>FITID-20261015-001
<MEMO>SUPERMERCADO PAO DE ACUCAR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261016120000[-03:BRT]
<TRNAMT>2500.00
<FITID>FITID-20261016-002
<NAME>SALARIO MENSAL
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
    `;

    const items = parseOFXSimple(Buffer.from(ofxSample, 'utf-8'));
    assert.equal(items.length, 2);

    assert.equal(items[0].date, '2026-10-15');
    assert.equal(items[0].amount, -125.50);
    assert.equal(items[0].description, 'SUPERMERCADO PAO DE ACUCAR');
    assert.equal(items[0].external_id, 'FITID-20261015-001');

    assert.equal(items[1].date, '2026-10-16');
    assert.equal(items[1].amount, 2500.00);
    assert.equal(items[1].description, 'SALARIO MENSAL');
    assert.equal(items[1].external_id, 'FITID-20261016-002');
});

test('detectCategory classifies expenses and incomes accurately', () => {
    assert.equal(detectCategory('SUPERMERCADO CARREFOUR'), 'Alimentação');
    assert.equal(detectCategory('UBER TRIP HELP'), 'Transporte');
    assert.equal(detectCategory('PAGAMENTO SALARIO EMPRESA'), 'Receita');
    assert.equal(detectCategory('APLICACAO RDB NUBANK'), 'Investimento');
    assert.equal(detectCategory('DROGARIA SAO PAULO'), 'Saúde');
});

test('previewStatement detects duplicates by FITID and normalized date/amount/title', async () => {
    // Preparar dados no banco de testes
    await sequelize.sync();

    const user = await User.create({
        name: 'Dedup Tester',
        email: `tester-${Date.now()}@example.com`,
        password: 'hashed-password-123'
    });

    const wallet = await Wallet.create({
        name: 'Carteira de Teste',
        balance: 1000.00,
        user_id: user.id
    });

    // Inserir 2 transações pré-existentes na carteira
    // 1 com FITID
    await Transaction.create({
        title: 'Supermercado Central',
        amount: -80.00,
        category: 'Alimentação',
        date: '2026-10-10',
        type: 'expense',
        wallet_id: wallet.id,
        user_id: user.id,
        source_external_id: 'EXISTING-FITID-999'
    });

    // 1 sem FITID (para teste de heurística date + amount + title)
    await Transaction.create({
        title: 'Padaria   Bom   Dia',
        amount: -25.50,
        category: 'Alimentação',
        date: '2026-10-11',
        type: 'expense',
        wallet_id: wallet.id,
        user_id: user.id
    });

    // Criar OFX contendo:
    // 1. Transação que duplica EXISTING-FITID-999
    // 2. Transação com mesma data, valor e título ('padaria bom dia' com espaçamento normalizado)
    // 3. Duas transações com o mesmo FITID novo ('NEW-FITID-001') para testar dedup dentro do próprio arquivo
    // 4. Uma transação 100% nova
    const ofxContent = `
<OFX>
<STMTTRN>
<DTPOSTED>20261010
<TRNAMT>-80.00
<FITID>EXISTING-FITID-999
<MEMO>Outra Descricao mas mesmo FITID
</STMTTRN>
<STMTTRN>
<DTPOSTED>20261011
<TRNAMT>-25.50
<MEMO>PADARIA BOM DIA
</STMTTRN>
<STMTTRN>
<DTPOSTED>20261012
<TRNAMT>-50.00
<FITID>NEW-FITID-001
<MEMO>Posto de Gasolina Shell
</STMTTRN>
<STMTTRN>
<DTPOSTED>20261012
<TRNAMT>-50.00
<FITID>NEW-FITID-001
<MEMO>Posto de Gasolina Shell (Repetido)
</STMTTRN>
<STMTTRN>
<DTPOSTED>20261013
<TRNAMT>500.00
<FITID>FRESH-FITID-777
<MEMO>Transferencia Recebida
</STMTTRN>
</OFX>
    `;

    const req = {
        user: { id: user.id },
        body: { wallet_id: wallet.id },
        file: {
            originalname: 'extrato.ofx',
            buffer: Buffer.from(ofxContent, 'utf-8')
        }
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseData = data;
            return this;
        }
    };

    await previewStatement(req, res);

    assert.equal(statusCode, 200);
    assert.ok(responseData);
    assert.equal(responseData.summary.total, 5);
    assert.equal(responseData.summary.duplicateCount, 3);
    assert.equal(responseData.summary.newCount, 2);

    const items = responseData.items;

    // Item 1: duplicado por FITID do banco
    assert.equal(items[0].isDuplicate, true);
    assert.equal(items[0].duplicateReason, 'fitid');

    // Item 2: duplicado por mesma data, valor e título normalizado
    assert.equal(items[1].isDuplicate, true);
    assert.equal(items[1].duplicateReason, 'same_date_amount_title');

    // Item 3: primeira aparição de NEW-FITID-001 -> NOVO
    assert.equal(items[2].isDuplicate, false);
    assert.equal(items[2].duplicateReason, null);

    // Item 4: segunda aparição de NEW-FITID-001 no mesmo arquivo -> DUPLICADO no arquivo
    assert.equal(items[3].isDuplicate, true);
    assert.equal(items[3].duplicateReason, 'fitid');

    // Item 5: transação 100% nova
    assert.equal(items[4].isDuplicate, false);
    assert.equal(items[4].duplicateReason, null);
});

test('confirmStatement saves selected transactions and updates wallet balance', async () => {
    await sequelize.sync();

    const user = await User.create({
        name: 'Confirm Tester',
        email: `confirm-${Date.now()}@example.com`,
        password: 'hashed-password-123'
    });

    const wallet = await Wallet.create({
        name: 'Carteira Confirm',
        balance: 100.00,
        user_id: user.id
    });

    const transactionsToConfirm = [
        {
            title: 'Farmacia Drogasil',
            finalAmount: -30.00,
            category: 'Saúde',
            date: '2026-10-14',
            type: 'expense',
            external_id: 'FITID-FARMACIA-01'
        },
        {
            title: 'Freelance Design',
            finalAmount: 200.00,
            category: 'Receita',
            date: '2026-10-15',
            type: 'income',
            external_id: 'FITID-FREELANCE-02'
        }
    ];

    const req = {
        user: { id: user.id },
        body: {
            wallet_id: wallet.id,
            transactions: transactionsToConfirm
        }
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseData = data;
            return this;
        }
    };

    await confirmStatement(req, res);

    assert.equal(statusCode, 201);
    assert.equal(responseData.imported, 2);

    // Verificar saldo atualizado (100 - 30 + 200 = 270)
    await wallet.reload();
    assert.equal(Number(wallet.balance), 270.00);

    // Verificar transações salvas com source_external_id
    const saved = await Transaction.findAll({ where: { wallet_id: wallet.id } });
    assert.equal(saved.length, 2);
    const fitids = saved.map(s => s.source_external_id).sort();
    assert.deepEqual(fitids, ['FITID-FARMACIA-01', 'FITID-FREELANCE-02']);
});
