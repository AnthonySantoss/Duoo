const sequelize = require('./config/database');
async function check() {
    try {
        const [results] = await sequelize.query('PRAGMA table_info(Recurrings)');
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
