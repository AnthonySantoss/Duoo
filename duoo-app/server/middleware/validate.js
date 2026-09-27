const { ZodError } = require('zod');

const validate = (schema, source = 'body') => (req, res, next) => {
    try {
        req[source] = schema.parse(req[source]);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }
        next(error);
    }
};

module.exports = validate;
