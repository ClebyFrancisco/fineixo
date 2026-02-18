'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface MonthSelectorProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
}

export default function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(value);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    setCurrentMonth(value);
  }, [value]);

  const handlePrevious = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
    onChange(newMonth);
  };

  const handleNext = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
    onChange(newMonth);
  };

  const handleToday = () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(month);
    onChange(month);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex items-center justify-center space-x-4 mb-6">
      <button
        onClick={handlePrevious}
        className="px-3 py-1 rounded-md text-sm font-medium border border-slate-600 bg-slate-900/70 text-slate-100 hover:border-emerald-400 hover:bg-slate-900/90 transition-colors"
      >
        ← Anterior
      </button>
      <div className="text-center">
        <h3
          className={`text-lg font-semibold capitalize ${
            isDark ? 'text-slate-100' : 'text-gray-900'
          }`}
        >
          {formatMonth(currentMonth)}
        </h3>
      </div>
      <button
        onClick={handleNext}
        className="px-3 py-1 rounded-md text-sm font-medium border border-slate-600 bg-slate-900/70 text-slate-100 hover:border-emerald-400 hover:bg-slate-900/90 transition-colors"
      >
        Próximo →
      </button>
      <button
        onClick={handleToday}
        className="px-3 py-1 rounded-md text-sm font-medium border border-emerald-500/60 bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:border-emerald-400 transition-colors"
      >
        Hoje
      </button>
    </div>
  );
}

















