const { Sequelize } = require('sequelize');
const path = require('path');

const storage = process.env.DB_STORAGE || path.join(__dirname, '../../database.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storage,
    logging: false
});

module.exports = sequelize;
