import React from 'react';

const Badge = ({ children, variant = "default" }) => {
    const styles = {
        default: "bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        success: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        warning: "bg-amber-100/80 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        blue: "bg-blue-100/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        danger: "bg-rose-100/80 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>{children}</span>;
};

export default Badge;
