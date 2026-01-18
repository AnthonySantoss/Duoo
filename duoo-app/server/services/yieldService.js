const cron = require('node-cron');
const axios = require('axios');
const { Goal } = require('../models');
const { Op } = require('sequelize');

// URL da API do Banco Central para Taxa Selic Diária (CDI)
const BCB_API_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json';

// Fallback caso a API falhe (~0.045% a.d, equivalente a aprox 12.15% a.a)
const FALLBACK_DAILY_RATE = 0.00045;

// Função para obter a taxa CDI diária do BCB
const getDailyCDIRate = async () => {
    try {
        const response = await axios.get(BCB_API_URL);
        if (response.data && response.data.length > 0 && response.data[0].valor) {
            // A API retorna a taxa em porcentagem (ex: "0.050788")
            const taxa = response.data[0].valor;
            // Converter para decimal (0.05% -> 0.0005)
            const rateDecimal = parseFloat(taxa.replace(',', '.')) / 100; // Garantir suporte a virgula se houver

            if (isNaN(rateDecimal)) throw new Error('Taxa inválida recebida da API');

            console.log(`Taxa CDI obtida do BCB: ${taxa}% (${rateDecimal})`);
            return rateDecimal;
        } else {
            throw new Error('API do BCB retornou dados vazios ou incompletos');
        }
    } catch (error) {
        console.error('Erro ao buscar taxa CDI do BCB (usando fallback):', error.message);
    }
    return FALLBACK_DAILY_RATE;
};

// Função para calcular e aplicar rendimentos
const processDailyYields = async () => {
    console.log('Iniciando processamento de rendimentos diários...');
    try {
        const dailyRate = await getDailyCDIRate();

        // Buscar todas as metas que rendem e têm saldo positivo
        const yieldingGoals = await Goal.findAll({
            where: {
                is_yielding: true,
                current_amount: { [Op.gt]: 0 }
            }
        });

        console.log(`Encontradas ${yieldingGoals.length} metas para processar.`);

        for (const goal of yieldingGoals) {
            const percentage = parseFloat(goal.cdi_percentage) || 100;
            const effectiveDailyRate = dailyRate * (percentage / 100);

            const currentAmount = parseFloat(goal.current_amount);
            const yieldAmount = currentAmount * effectiveDailyRate;

            // Atualizar o saldo
            const newAmount = currentAmount + yieldAmount;

            // Atualizar acumulado
            const currentAccumulated = parseFloat(goal.accumulated_yield || 0);
            goal.accumulated_yield = parseFloat((currentAccumulated + yieldAmount).toFixed(2));

            goal.current_amount = parseFloat(newAmount.toFixed(2));
            await goal.save();

            console.log(`Meta "${goal.title}": Rendimento de R$ ${yieldAmount.toFixed(4)} (${percentage}% do CDI). Novo saldo: R$ ${goal.current_amount}`);
        }

        console.log('Processamento de rendimentos concluído.');
    } catch (error) {
        console.error('Erro ao processar rendimentos:', error);
    }
};

// Configurar o agendamento
const scheduleYieldJob = () => {
    // Roda todo dia à meia-noite (00:00)
    cron.schedule('0 0 * * *', () => {
        processDailyYields();
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

    console.log('Agendador de rendimentos iniciado (Roda diariamente às 00:00).');
};

module.exports = {
    scheduleYieldJob,
    processDailyYields
};
