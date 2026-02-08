/**
 * Global error handling middleware
 */
module.exports = (err, req, res, next) => {
    console.error(' [Error Handler]:', err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Ocorreu um erro interno no servidor';

    // Detailed error only in development
    const response = {
        error: message,
        status: 'error'
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};
