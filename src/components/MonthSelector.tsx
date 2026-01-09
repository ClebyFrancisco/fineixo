'use client';

import { useState, useEffect } from 'react';

interface MonthSelectorProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
}

export default function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(value);

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
        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
      >
        ← Anterior
      </button>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">
          {formatMonth(currentMonth)}
        </h3>
      </div>
      <button
        onClick={handleNext}
        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
      >
        Próximo →
      </button>
      <button
        onClick={handleToday}
        className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium"
      >
        Hoje
      </button>
    </div>
  );
}

















