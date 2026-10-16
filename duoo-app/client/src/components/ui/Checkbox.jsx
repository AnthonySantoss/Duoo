import React, { useRef, useEffect } from 'react';
import { Check, Minus } from 'lucide-react';

const Checkbox = ({
    checked = false,
    onChange,
    disabled = false,
    indeterminate = false,
    label,
    className = '',
    size = 'md',
    id,
    name,
    ...rest
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = Boolean(indeterminate);
        }
    }, [indeterminate]);

    const isChecked = Boolean(checked) || Boolean(indeterminate);
    const boxSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    const iconSize = size === 'sm' ? 12 : 14;

    const handleClick = (e) => {
        if (disabled) return;
        // Evita loop de clique caso o clique original já tenha sido no input
        if (e.target !== inputRef.current) {
            inputRef.current?.click();
        }
    };

    return (
        <span
            onClick={handleClick}
            className={`inline-flex items-center gap-2 select-none cursor-pointer ${
                disabled ? 'cursor-not-allowed opacity-50' : ''
            } ${className}`}
        >
            <input
                ref={inputRef}
                type="checkbox"
                id={id}
                name={name}
                checked={Boolean(checked)}
                onChange={onChange}
                disabled={disabled}
                className="peer sr-only"
                {...rest}
            />

            <span
                className={`${boxSize} rounded-md border-2 transition-all shrink-0 flex items-center justify-center ${
                    isChecked
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
                } peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2`}
            >
                {indeterminate ? (
                    <Minus size={iconSize} strokeWidth={3} className="text-white" />
                ) : checked ? (
                    <Check size={iconSize} strokeWidth={3} className="text-white" />
                ) : null}
            </span>

            {label && (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                    {label}
                </span>
            )}
        </span>
    );
};

export default Checkbox;
