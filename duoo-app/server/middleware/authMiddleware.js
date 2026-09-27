const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { COOKIE_NAME } = require('../utils/authCookie');

module.exports = (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME] || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        const verified = jwt.verify(token, jwtSecret);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token' });
    }
};
