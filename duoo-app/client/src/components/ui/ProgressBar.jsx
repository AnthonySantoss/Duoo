import React from 'react';

const ProgressBar = ({ progress, colorClass = "bg-emerald-500", height = "h-2.5" }) => (
    <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full ${height}`}>
        <div className={`${height} rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
    </div>
);

export default ProgressBar;
