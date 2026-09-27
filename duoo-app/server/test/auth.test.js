const test = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('../validation/authSchemas');
const authMiddleware = require('../middleware/authMiddleware');

test('registration schema rejects weak passwords', () => {
    const result = schemas.register.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak'
    });

    assert.equal(result.success, false);
});

test('registration schema normalizes email', () => {
    const result = schemas.register.parse({
        name: 'Test User',
        email: ' TEST@EXAMPLE.COM ',
        password: 'StrongPass1!'
    });

    assert.equal(result.email, 'test@example.com');
});

test('auth middleware rejects requests without credentials', () => {
    const response = { statusCode: 200, body: null };
    const res = {
        status(code) {
            response.statusCode = code;
            return this;
        },
        json(body) {
            response.body = body;
            return this;
        }
    };

    authMiddleware({ headers: {}, header: () => undefined, cookies: {} }, res, () => {
        throw new Error('next should not be called');
    });

    assert.equal(response.statusCode, 401);
});
