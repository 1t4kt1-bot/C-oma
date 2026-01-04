
import React, { useMemo } from 'react';
import { Record, Purchase, DebtItem, Expense, PricingConfig, PlaceLoan, LedgerEntry } from '../types';
import { formatCurrency } from '../utils';
import { Users, PieChart, Banknote, Landmark } from 'lucide-react';
import { calcLedgerInventory } from '../accounting_core';

interface ProfitDistributionProps {
  records: Record[];
  purchases: Purchase[];
  debtsList: DebtItem[];
  expenses: Expense[];
  pricingConfig: PricingConfig;
  placeLoans?: PlaceLoan[];
  ledger: LedgerEntry[]; // NEW
}

const ProfitDistribution: React.FC<ProfitDistributionProps> = ({ expenses, pricingConfig, ledger }) => {
  
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = today.slice(0, 7) + '-01';
  
  // Use the same function as Archive generation to ensure Numbers MATCH EXACTLY
  const preview = useMemo(() => {
      return calcLedgerInventory(ledger, startOfMonth, today, expenses, pricingConfig);
  }, [ledger, expenses, pricingConfig, startOfMonth, today]);

  if (!preview) return <div>Loading...</div>;

  return (
    <div className="space-y-8 animate-fade-in text-gray-900">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PieChart className="text-indigo-600" />
          توزيع الأرباح (Live Preview)
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          عرض مباشر للموجودات (كاش / بنك) بناءً على صافي العمليات للشهر الحالي (من دفتر الأستاذ).
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
           <div className="text-emerald-700 text-sm font-bold mb-2 flex items-center gap-2"><Banknote size={18}/> صافي الكاش في المكان</div>
           <div className="text-3xl font-extrabold text-emerald-900">{formatCurrency(preview.netCashInPlace)}</div>
           <div className="text-xs text-emerald-600 mt-2 opacity-80">الرصيد الفعلي في الصندوق</div>
        </div>
        
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
           <div className="text-blue-700 text-sm font-bold mb-2 flex items-center gap-2"><Landmark size={18}/> صافي البنك في المكان</div>
           <div className="text-3xl font-extrabold text-blue-900">{formatCurrency(preview.netBankInPlace)}</div>
           <div className="text-xs text-blue-600 mt-2 opacity-80">الرصيد الفعلي في البنوك</div>
        </div>
      </div>

      {/* Partners Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
           <Users className="text-gray-600" size={20} />
           <h3 className="font-bold text-gray-800">تفاصيل المستحقات (فصل القنوات)</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-right">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">الشريك</th>
                
                {/* Cash Channel */}
                <th className="px-2 py-3 text-xs font-bold text-emerald-700 bg-emerald-50 border-l border-emerald-100">حصة كاش</th>
                <th className="px-2 py-3 text-xs font-bold text-emerald-700 bg-emerald-50 border-r border-emerald-100">الصافي (كاش)</th>

                {/* Bank Channel */}
                <th className="px-2 py-3 text-xs font-bold text-blue-700 bg-blue-50 border-l border-blue-100">حصة بنك</th>
                <th className="px-2 py-3 text-xs font-bold text-blue-700 bg-blue-50 border-r border-blue-100">الصافي (بنك)</th>

                <th className="px-4 py-3 text-xs font-bold text-black uppercase">الإجمالي النهائي</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {preview.partners.map((partner) => (
                <tr key={partner.name} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-black">{partner.name}</td>
                    
                    {/* Cash */}
                    <td className="px-2 py-4 bg-emerald-50/10 text-gray-600 border-l border-emerald-50">{formatCurrency(partner.cashShareAvailable)}</td>
                    <td className="px-2 py-4 bg-emerald-50/30 font-bold text-emerald-800 border-r border-emerald-50">{formatCurrency(partner.finalPayoutCash)}</td>

                    {/* Bank */}
                    <td className="px-2 py-4 bg-blue-50/10 text-gray-600 border-l border-blue-50">{formatCurrency(partner.bankShareAvailable)}</td>
                    <td className="px-2 py-4 bg-blue-50/30 font-bold text-blue-800 border-r border-blue-50">{formatCurrency(partner.finalPayoutBank)}</td>

                    <td className="px-4 py-4 font-extrabold text-black bg-gray-50 text-lg">
                        {formatCurrency(partner.finalPayoutTotal)}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ProfitDistribution;
