const { sequelize, User } = require('./models');

async function listUsers() {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'partner_id']
        });

        console.log('--- Current Users ---');
        users.forEach(user => {
            console.log(`ID: ${user.id}`);
            console.log(`Name: '${user.name}' -> First Char: '${user.name ? user.name.charAt(0) : 'NULL'}'`);
            console.log(`Email: ${user.email}`);
            console.log(`Partner ID: ${user.partner_id}`);
            console.log('---------------------');
        });
        process.exit(0);
    } catch (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }
}

listUsers();
