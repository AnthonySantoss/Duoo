export const formatCurrencyValue = (value) => Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export const formatCurrencyInput = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return '';
    return formatCurrencyValue(Number(digits) / 100);
};

export const parseCurrencyInput = (value) => {
    if (typeof value === 'number') return value;
    const normalized = String(value ?? '').replace(/\./g, '').replace(',', '.');
    return Number(normalized) || 0;
};
