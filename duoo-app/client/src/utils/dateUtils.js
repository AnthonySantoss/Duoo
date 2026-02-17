export const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';

    // Se vier com T (ISO completa), pegar só a parte da data
    const str = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

    // Split YYYY-MM-DD
    const parts = str.split('-');
    if (parts.length !== 3) return dateStr;

    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    return `${day}/${month}/${year}`;
};

export const formatShortDisplayDate = (dateStr) => {
    if (!dateStr) return '';

    const str = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = str.split('-');
    if (parts.length !== 3) return dateStr;

    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const month = parseInt(parts[1]) - 1;

    return `${parts[2]} ${monthNames[month]}`;
};

export const getLocalDateString = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
