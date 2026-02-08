const { Challenge, User, Transaction } = require('../models');
const { Op } = require('sequelize');

exports.getChallenges = async (req, res) => {
    try {
        const challenges = await Challenge.findAll({
            where: { is_active: true }
        });
        res.json(challenges);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createChallenge = async (req, res) => {
    try {
        const { title, description, type, target_value, points, start_date, end_date } = req.body;
        const challenge = await Challenge.create({
            title, description, type, target_value, points, start_date, end_date
        });
        res.status(201).json(challenge);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
