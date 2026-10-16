import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

// Extrai recursivamente opções de children (<option> e <optgroup>)
const extractOptions = (children) => {
    const result = [];

    const processChild = (child) => {
        if (!child) return;

        if (Array.isArray(child)) {
            child.forEach(processChild);
            return;
        }

        if (child.type === React.Fragment) {
            React.Children.forEach(child.props.children, processChild);
            return;
        }

        if (child.type === 'optgroup') {
            const groupOptions = [];
            React.Children.forEach(child.props.children, (opt) => {
                if (opt && opt.type === 'option') {
                    groupOptions.push({
                        value: opt.props.value !== undefined ? String(opt.props.value) : String(opt.props.children || ''),
                        label: opt.props.children,
                        disabled: Boolean(opt.props.disabled)
                    });
                }
            });
            result.push({
                isGroup: true,
                label: child.props.label,
                options: groupOptions
            });
            return;
        }

        if (child.type === 'option') {
            result.push({
                value: child.props.value !== undefined ? String(child.props.value) : String(child.props.children || ''),
                label: child.props.children,
                disabled: Boolean(child.props.disabled)
            });
        }
    };

    React.Children.forEach(children, processChild);
    return result;
};

const flattenOptions = (extracted) => {
    const flat = [];
    extracted.forEach(item => {
        if (item.isGroup) {
            flat.push(...item.options);
        } else {
            flat.push(item);
        }
    });
    return flat;
};

const Select = ({
    value,
    onChange,
    options: propOptions,
    children,
    placeholder = 'Selecione uma opção',
    disabled = false,
    name = '',
    id,
    className = '',
    size = 'md',
    required = false,
    ...rest
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    // Lista de opções
    const optionsTree = propOptions && propOptions.length > 0
        ? propOptions.map(opt => ({
            value: String(opt.value),
            label: opt.label !== undefined ? opt.label : opt.value,
            disabled: Boolean(opt.disabled)
        }))
        : extractOptions(children);

    const flatOptions = flattenOptions(optionsTree);

    const stringValue = value !== undefined && value !== null ? String(value) : '';
    const selectedOption = flatOptions.find(opt => opt.value === stringValue);

    // Detecção de tamanho compacto
    const isSmall = size === 'sm' || className.includes('text-xs') || className.includes('py-1') || className.includes('py-1.5');

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const menuHeight = 260;
        const openUpwards = spaceBelow < menuHeight && spaceAbove > spaceBelow;

        setDropdownStyle({
            position: 'fixed',
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            zIndex: 99999,
            top: openUpwards ? 'auto' : `${rect.bottom + 4}px`,
            bottom: openUpwards ? `${window.innerHeight - rect.top + 4}px` : 'auto',
            maxHeight: `${Math.min(260, Math.max(120, openUpwards ? spaceAbove - 16 : spaceBelow - 16))}px`
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        updatePosition();

        const handleOutsideClick = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            updatePosition();
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, updatePosition]);

    const handleSelect = (optionValue, optDisabled) => {
        if (disabled || optDisabled) return;
        setIsOpen(false);

        if (onChange) {
            const valStr = String(optionValue);
            const syntheticEvent = {
                target: { name, value: valStr },
                currentTarget: { name, value: valStr },
                preventDefault: () => {},
                stopPropagation: () => {}
            };
            onChange(syntheticEvent);
        }
    };

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen(prev => !prev);
    };

    // Estilo base do botão gatilho
    const defaultClasses = isSmall
        ? 'w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
        : 'w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white';

    return (
        <div className="relative inline-block w-full">
            <button
                type="button"
                ref={triggerRef}
                id={id}
                onClick={toggleOpen}
                disabled={disabled}
                className={`flex items-center justify-between text-left transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className || defaultClasses}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="truncate pr-2">
                    {selectedOption ? selectedOption.label : (
                        <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
                    )}
                </span>
                <ChevronDown
                    size={isSmall ? 14 : 18}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`}
                />
            </button>

            {/* Menu Dropdown renderizado no Portal para nunca ser cortado por modais/tabelas */}
            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100 select-none py-1.5"
                    role="listbox"
                >
                    {optionsTree.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 text-center">
                            Nenhuma opção disponível
                        </div>
                    ) : (
                        optionsTree.map((item, index) => {
                            if (item.isGroup) {
                                return (
                                    <div key={`group_${index}`} className="py-1">
                                        <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            {item.label}
                                        </div>
                                        {item.options.map((opt) => {
                                            const isSelected = opt.value === stringValue;
                                            return (
                                                <div
                                                    key={opt.value}
                                                    onClick={() => handleSelect(opt.value, opt.disabled)}
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                                                        opt.disabled
                                                            ? 'opacity-40 cursor-not-allowed text-slate-400'
                                                            : isSelected
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    } ${isSmall ? 'text-xs py-1.5 px-2.5' : ''}`}
                                                >
                                                    <span className="truncate">{opt.label}</span>
                                                    {isSelected && (
                                                        <Check size={isSmall ? 13 : 16} className="text-emerald-500 shrink-0 ml-2" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            }

                            const isSelected = item.value === stringValue;
                            return (
                                <div
                                    key={item.value}
                                    onClick={() => handleSelect(item.value, item.disabled)}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                                        item.disabled
                                            ? 'opacity-40 cursor-not-allowed text-slate-400'
                                            : isSelected
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    } ${isSmall ? 'text-xs py-1.5 px-2.5' : ''}`}
                                >
                                    <span className="truncate">{item.label}</span>
                                    {isSelected && (
                                        <Check size={isSmall ? 13 : 16} className="text-emerald-500 shrink-0 ml-2" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default Select;
