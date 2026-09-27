const { Sequelize } = require('sequelize');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;
const isPostgres = Boolean(databaseUrl);

const sequelize = isPostgres
    ? new Sequelize(databaseUrl, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: process.env.NODE_ENV === 'production'
            ? { ssl: { require: true, rejectUnauthorized: false } }
            : undefined,
        pool: {
            max: Number(process.env.DB_POOL_MAX || 5),
            min: 0,
            acquire: 30_000,
            idle: 10_000
        }
    })
    : new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DB_STORAGE || path.join(__dirname, '../../database.sqlite'),
        logging: false
    });

sequelize.addHook('afterConnect', async (connection) => {
    if (sequelize.getDialect() === 'postgres') {
        await connection.query("SET TIME ZONE 'UTC'");
    }
});

module.exports = sequelize;
