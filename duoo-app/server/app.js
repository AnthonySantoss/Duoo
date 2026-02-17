const express = require('express');
const cors = require('cors');
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
const pluggyRoutes = require('./routes/pluggyRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const alertRoutes = require('./routes/alertRoutes');
const notificationRoutes = require('./routes/notificationRoutes');


const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
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
app.use('/api/pluggy', pluggyRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/recurring', require('./routes/recurringRoutes'));
app.use('/api/config', require('./routes/configRoutes'));

// Global Error Handler (Must be after all routes)
app.use(require('./middleware/errorHandler'));

if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    // Serve static files from the 'public' directory (where we'll copy the React build)
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/index.html'));
    });
}

module.exports = app;
