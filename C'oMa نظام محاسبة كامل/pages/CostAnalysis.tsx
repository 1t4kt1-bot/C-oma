
import React, { useState, useMemo } from 'react';
import { DayCycle, SystemState, LedgerEntry } from '../types';
import { formatCurrency, getLocalDate } from '../utils';
import { Calendar, Package } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { getCostAnalysisView } from '../accounting_core';

interface CostAnalysisProps {
  dayCycles: DayCycle[];
  systemState?: SystemState;
  onInventory?: () => void;
  ledger?: LedgerEntry[];
}

const CostAnalysis: React.FC<CostAnalysisProps> = ({ onInventory, ledger = [] }) => {
  const [monthFilter, setMonthFilter] = useState(getLocalDate().slice(0, 7)); // YYYY-MM
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Use Ledger Selector
  const dailyData = useMemo(() => getCostAnalysisView(ledger, monthFilter), [ledger, monthFilter]);

  const inputClassName = "block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:outline-none transition-colors shadow-sm";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-indigo-600" />
            التحليل الشهري (تقويم)
          </h2>
          <p className="text-gray-500 text-sm mt-1">
             عرض مجمع لكل يوم بناءً على السجل المالي (Ledger).
          </p>
        </div>
        <div className="flex gap-2">
            {onInventory && (
                 <Button onClick={() => onInventory()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                     <Package size={16} className="ml-2" /> الجرد والأرشفة
                 </Button>
             )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <label className="text-sm font-bold text-gray-700">اختر الشهر:</label>
        <input 
          type="month" 
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className={`${inputClassName} md:w-auto`}
        />
      </div>

      {/* Calendar Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">اليوم</th>
                <th className="px-4 py-3 text-xs font-bold text-emerald-700 uppercase">إجمالي الإيراد</th>
                <th className="px-4 py-3 text-xs font-bold text-red-700 uppercase">إجمالي المصروف</th>
                <th className="px-4 py-3 text-xs font-bold text-white bg-emerald-600 uppercase">صافي الكاش</th>
                <th className="px-4 py-3 text-xs font-bold text-white bg-blue-600 uppercase">صافي البنك</th>
                <th className="px-4 py-3 text-xs font-bold text-purple-700 uppercase">الربح (تشغيلي)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {dailyData.map((day) => (
                <tr key={day.date} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {day.date} <span className="text-xs text-gray-400 mr-1">({new Date(day.date).toLocaleDateString('ar-SA', { weekday: 'short' })})</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{formatCurrency(day.totalRevenue)}</td>
                  <td className="px-4 py-3 font-bold text-red-700">{formatCurrency(day.totalExpenses)}</td>
                  
                  <td className="px-4 py-3 text-emerald-900 bg-emerald-50 border-r border-emerald-100 font-bold">{formatCurrency(day.netCash)}</td>
                  <td className="px-4 py-3 text-blue-900 bg-blue-50 border-r border-blue-100 font-bold">{formatCurrency(day.netBank)}</td>
                  
                  <td className="px-4 py-3 font-bold text-purple-700">{formatCurrency(day.netProfit)}</td>
                </tr>
              ))}
              {dailyData.length === 0 && (
                  <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400">لا يوجد بيانات لهذا الشهر</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostAnalysis;
