const { z } = require('zod');

const capturedTransactionSchema = z.object({
    external_id: z.string().trim().min(8).max(128),
    title: z.string().trim().min(1).max(160),
    amount: z.coerce.number().finite().positive().max(100000000),
    type: z.enum(['income', 'expense']),
    category: z.string().trim().min(1).max(80).optional(),
    date: z.coerce.date().optional(),
    wallet_id: z.coerce.number().int().positive(),
    source_package: z.string().trim().min(1).max(160),
    confidence: z.coerce.number().min(0).max(1).optional()
});

module.exports = { capturedTransactionSchema };
