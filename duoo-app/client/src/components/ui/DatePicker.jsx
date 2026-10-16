import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatDisplayDate, getLocalDateString } from '../../utils/dateUtils';

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_NAMES_SHORT = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const DatePicker = ({
    value,
    onChange,
    name = '',
    placeholder = 'Selecionar data',
    disabled = false,
    required = false,
    className = '',
    size = 'md',
    id,
    min,
    max,
    ...rest
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState('days'); // 'days' | 'months'
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    // Extrair data do value ou default para hoje
    const todayIso = useMemo(() => getLocalDateString(), []);

    const parseValue = useCallback((val) => {
        if (!val || typeof val !== 'string') return null;
        const clean = val.includes('T') ? val.split('T')[0] : val;
        const parts = clean.split('-');
        if (parts.length !== 3) return null;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
        return { year: y, month: m, day: d, iso: clean };
    }, []);

    const parsedValue = useMemo(() => parseValue(value), [value, parseValue]);

    const [viewYear, setViewYear] = useState(() => {
        const parsed = parseValue(value);
        return parsed ? parsed.year : new Date().getFullYear();
    });

    const [viewMonth, setViewMonth] = useState(() => {
        const parsed = parseValue(value);
        return parsed ? parsed.month : new Date().getMonth();
    });

    // Quando o popover for aberto ou o value mudar externamente, atualiza a visão para a data do valor
    useEffect(() => {
        if (parsedValue) {
            setViewYear(parsedValue.year);
            setViewMonth(parsedValue.month);
        }
    }, [parsedValue]);

    const isSmall = size === 'sm' || className.includes('text-xs') || className.includes('py-1') || className.includes('py-1.5') || className.includes('py-2');

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const popoverHeight = 340;
        const openUpwards = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

        const popoverWidth = 280;
        let left = rect.left;
        if (left + popoverWidth > window.innerWidth - 12) {
            left = Math.max(12, window.innerWidth - popoverWidth - 12);
        }
        if (left < 12) {
            left = 12;
        }

        setDropdownStyle({
            position: 'fixed',
            left: `${left}px`,
            width: `${popoverWidth}px`,
            zIndex: 99999,
            top: openUpwards ? 'auto' : `${rect.bottom + 6}px`,
            bottom: openUpwards ? `${window.innerHeight - rect.top + 6}px` : 'auto'
        });
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setViewMode('days');
            return;
        }

        updatePosition();

        const handleOutsideClick = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                popoverRef.current && !popoverRef.current.contains(e.target)
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

    const toggleOpen = () => {
        if (disabled) return;
        if (!isOpen && parsedValue) {
            setViewYear(parsedValue.year);
            setViewMonth(parsedValue.month);
        }
        setIsOpen(prev => !prev);
    };

    const handleSelectDate = (iso) => {
        if (disabled) return;
        setIsOpen(false);
        setViewMode('days');
        if (onChange) {
            const syntheticEvent = {
                target: { name, value: iso },
                currentTarget: { name, value: iso },
                preventDefault: () => {},
                stopPropagation: () => {}
            };
            onChange(syntheticEvent);
        }
    };

    const handleClear = () => {
        if (disabled) return;
        handleSelectDate('');
    };

    const handleSelectToday = () => {
        if (disabled) return;
        if ((min && todayIso < min) || (max && todayIso > max)) return;
        handleSelectDate(todayIso);
    };

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewYear(viewYear - 1);
            setViewMonth(11);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewYear(viewYear + 1);
            setViewMonth(0);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const prevYear = () => {
        setViewYear(viewYear - 1);
    };

    const nextYear = () => {
        setViewYear(viewYear + 1);
    };

    // Gera matriz de dias para a visualização
    const calendarDays = useMemo(() => {
        const cells = [];
        const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

        // Dias do mês anterior
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const month = viewMonth === 0 ? 11 : viewMonth - 1;
            const year = viewMonth === 0 ? viewYear - 1 : viewYear;
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cells.push({
                day,
                month,
                year,
                iso,
                isCurrentMonth: false
            });
        }

        // Dias do mês atual
        for (let day = 1; day <= daysInMonth; day++) {
            const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cells.push({
                day,
                month: viewMonth,
                year: viewYear,
                iso,
                isCurrentMonth: true
            });
        }

        // Dias do próximo mês para fechar a grade (múltiplo de 7)
        const remaining = (7 - (cells.length % 7)) % 7;
        for (let day = 1; day <= remaining; day++) {
            const month = viewMonth === 11 ? 0 : viewMonth + 1;
            const year = viewMonth === 11 ? viewYear + 1 : viewYear;
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cells.push({
                day,
                month,
                year,
                iso,
                isCurrentMonth: false
            });
        }

        return cells;
    }, [viewYear, viewMonth]);

    const formattedValue = parsedValue ? formatDisplayDate(parsedValue.iso) : '';

    const defaultClasses = isSmall
        ? 'w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
        : 'w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white';

    return (
        <div className="relative inline-block w-full">
            <button
                type="button"
                ref={triggerRef}
                id={id}
                name={name}
                onClick={toggleOpen}
                disabled={disabled}
                className={`flex items-center justify-between text-left transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className || defaultClasses} ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                {...rest}
            >
                <span className={`truncate pr-2 ${!formattedValue ? 'text-slate-400 dark:text-slate-500' : ''}`}>
                    {formattedValue || placeholder}
                </span>
                <Calendar
                    size={isSmall ? 15 : 18}
                    className={`shrink-0 text-slate-400 transition-colors duration-200 ${isOpen ? 'text-emerald-500' : ''}`}
                />
            </button>

            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    style={dropdownStyle}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100 select-none z-[80]"
                    role="dialog"
                    aria-label="Seletor de data"
                >
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                        {viewMode === 'days' ? (
                            <>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={prevYear}
                                        title="Ano anterior"
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <ChevronsLeft size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={prevMonth}
                                        title="Mês anterior"
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setViewMode('months')}
                                    className="px-2 py-1 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors capitalize"
                                    title="Trocar mês ou ano"
                                >
                                    {MONTH_NAMES[viewMonth]} {viewYear}
                                </button>

                                <div className="flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={nextMonth}
                                        title="Próximo mês"
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={nextYear}
                                        title="Próximo ano"
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <ChevronsRight size={16} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={prevYear}
                                    title="Ano anterior"
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                    {viewYear}
                                </span>

                                <button
                                    type="button"
                                    onClick={nextYear}
                                    title="Próximo ano"
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Modo Seleção de Mês */}
                    {viewMode === 'months' ? (
                        <div className="grid grid-cols-3 gap-1.5 py-3">
                            {MONTH_NAMES_SHORT.map((monthName, idx) => {
                                const isCurrent = idx === viewMonth;
                                return (
                                    <button
                                        key={monthName}
                                        type="button"
                                        onClick={() => {
                                            setViewMonth(idx);
                                            setViewMode('days');
                                        }}
                                        className={`py-2 text-xs font-medium rounded-xl transition-colors ${
                                            isCurrent
                                                ? 'bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/30'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {monthName}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* Modo Dias */
                        <>
                            {/* Dias da semana */}
                            <div className="grid grid-cols-7 pt-2 pb-1 text-center">
                                {WEEK_DAYS.map((wd, i) => (
                                    <span key={i} className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                        {wd}
                                    </span>
                                ))}
                            </div>

                            {/* Grade de dias */}
                            <div className="grid grid-cols-7 gap-1 py-1">
                                {calendarDays.map((cell, idx) => {
                                    const isSelected = parsedValue && parsedValue.iso === cell.iso;
                                    const isToday = todayIso === cell.iso;
                                    const isDisabled = (min && cell.iso < min) || (max && cell.iso > max);

                                    let cellClass = '';
                                    if (isDisabled) {
                                        cellClass = 'opacity-25 cursor-not-allowed pointer-events-none text-slate-400';
                                    } else if (isSelected) {
                                        cellClass = 'bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/30 hover:bg-emerald-600';
                                    } else if (isToday) {
                                        cellClass = 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/30';
                                    } else if (cell.isCurrentMonth) {
                                        cellClass = 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium';
                                    } else {
                                        cellClass = 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40';
                                    }

                                    return (
                                        <button
                                            key={`${cell.iso}_${idx}`}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => handleSelectDate(cell.iso)}
                                            className={`h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-colors mx-auto ${cellClass}`}
                                        >
                                            {cell.day}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Rodapé com Atalhos */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded-md transition-colors"
                        >
                            Limpar
                        </button>

                        <button
                            type="button"
                            onClick={handleSelectToday}
                            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2.5 py-1 rounded-md transition-colors"
                        >
                            Hoje
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DatePicker;
