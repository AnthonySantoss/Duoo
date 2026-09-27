const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { corsOrigins } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const goalRoutes = require('./routes/goalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const exportRoutes = require('./routes/exportRoutes');
const importRoutes = require('./routes/importRoutes');
const creditCardRoutes = require('./routes/creditCardRoutes');
const statsRoutes = require('./routes/statsRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const alertRoutes = require('./routes/alertRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const capturedTransactionRoutes = require('./routes/capturedTransactionRoutes');
const fs = require('fs');
const path = require('path');


const app = express();

app.disable('x-powered-by');
app.use(helmet());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'duoo-api' });
});

app.use(cors({
    origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
    }
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/credit-cards', creditCardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/category', categoryRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/captured-transactions', capturedTransactionRoutes);
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/recurring', require('./routes/recurringRoutes'));
app.use('/api/config', require('./routes/configRoutes'));

// The Render API service is deployed without the frontend build. The combined
// Docker image still serves the frontend because it contains server/public.
const frontendIndex = path.join(__dirname, 'public', 'index.html');
const shouldServeFrontend = process.env.SERVE_FRONTEND === 'true' || fs.existsSync(frontendIndex);

if (process.env.NODE_ENV === 'production' && shouldServeFrontend) {
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('*', (req, res) => {
        res.sendFile(frontendIndex);
    });
}

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler (Must be after all routes and fallbacks)
app.use(require('./middleware/errorHandler'));

module.exports = app;
