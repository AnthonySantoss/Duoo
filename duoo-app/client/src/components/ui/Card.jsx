import React from 'react';

const Card = ({ children, className = "" }) => (
    <div className={`duoo-surface rounded-[20px] p-6 ${className}`}>
        {children}
    </div>
);

export default Card;
