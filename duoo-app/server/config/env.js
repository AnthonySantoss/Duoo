const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;

if (isProduction && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production');
}

module.exports = {
    isProduction,
    databaseUrl,
    isPostgres: Boolean(databaseUrl),
    jwtSecret: jwtSecret || 'development-only-secret-change-me',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
};
