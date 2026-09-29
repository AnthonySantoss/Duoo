export const normalizeNotificationTitle = (title) => {
    if (!title) return '';
    return title.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim();
};
