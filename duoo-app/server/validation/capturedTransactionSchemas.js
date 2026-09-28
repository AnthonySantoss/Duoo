const { z } = require('zod');

const capturedTransactionSchema = z.object({
    external_id: z.string().trim().min(8).max(128),
    title: z.string().trim().min(1).max(160),
    amount: z.coerce.number().finite().positive().max(100000000),
    type: z.enum(['income', 'expense']),
    category: z.string().trim().min(1).max(80).optional(),
    date: z.coerce.date().optional(),
    wallet_id: z.coerce.number().int().positive().optional(),
    credit_card_id: z.coerce.number().int().positive().optional(),
    source_type: z.enum(['wallet', 'credit_card']).default('wallet'),
    source_package: z.string().trim().min(1).max(160),
    confidence: z.coerce.number().min(0).max(1).optional()
}).superRefine((data, context) => {
    if (data.source_type === 'wallet' && !data.wallet_id) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['wallet_id'], message: 'Carteira obrigatória para transações de débito.' });
    }
    if (data.source_type === 'credit_card' && !data.credit_card_id) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['credit_card_id'], message: 'Cartão obrigatório para compras no crédito.' });
    }
});

module.exports = { capturedTransactionSchema };
