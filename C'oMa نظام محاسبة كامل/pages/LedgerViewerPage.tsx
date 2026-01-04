
import React, { useState, useMemo } from 'react';
import { LedgerEntry } from '../types';
import { formatCurrency, formatFullDate } from '../utils';
import { Search, Download, Filter, ArrowUpRight, ArrowDownLeft, ShieldCheck, User } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import { resolveActorName } from '../accounting_core';

interface LedgerViewerPageProps {
    ledger: LedgerEntry[];
}

const LedgerViewerPage: React.FC<LedgerViewerPageProps> = ({ ledger }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [limit, setLimit] = useState(100);

    const filteredLedger = useMemo(() => {
        return ledger.filter(entry => {
            const matchesSearch = 
                entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                entry.id.includes(searchTerm) ||
                (entry.partnerName && entry.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (entry.referenceId && entry.referenceId.includes(searchTerm));
            
            const matchesType = typeFilter === 'all' || entry.type === typeFilter;
            
            return matchesSearch && matchesType;
        }).slice(0, limit);
    }, [ledger, searchTerm, typeFilter, limit]);

    const handleExport = () => {
        const data = filteredLedger.map(e => ({
            ID: e.id,
            Date: e.dateKey,
            Time: new Date(e.timestamp).toLocaleTimeString(),
            Type: e.type,
            Actor: resolveActorName(e),
            Description: e.description,
            Amount: e.amount,
            Direction: e.direction,
            Channel: e.channel,
            AccountID: e.accountId || '-',
            RefID: e.referenceId || '-'
        }));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Ledger");
        XLSX.writeFile(wb, "Central_Ledger_Export.xlsx");
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <ShieldCheck className="text-indigo-600"/> دفتر الأستاذ (Central Ledger)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        سجل العمليات المالي المركزي غير القابل للتعديل. المصدر الوحيد للحقيقة.
                    </p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download size={16} className="ml-2"/> تصدير Excel
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder="بحث في السجل (ID، وصف، اسم الشريك)..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400"/>
                    <select 
                        value={typeFilter} 
                        onChange={e => setTypeFilter(e.target.value)}
                        className="p-2 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="all">كل العمليات</option>
                        <option value="INCOME_SESSION">إيراد جلسات</option>
                        <option value="EXPENSE_OPERATIONAL">مصروفات</option>
                        <option value="DEBT_CREATE">ديون</option>
                        <option value="LIQUIDATION_TO_APP">تسييل / تحويل</option>
                        <option value="PARTNER_WITHDRAWAL">مسحوبات شركاء</option>
                        <option value="PARTNER_DEPOSIT">إيداعات/سداد شركاء</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">التاريخ</th>
                                <th className="px-4 py-3">النوع</th>
                                <th className="px-4 py-3">بواسطة</th>
                                <th className="px-4 py-3">الوصف</th>
                                <th className="px-4 py-3">القناة</th>
                                <th className="px-4 py-3">المبلغ</th>
                                <th className="px-4 py-3">Ref ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono">
                            {filteredLedger.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400 select-all">{entry.id}</td>
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                        {entry.dateKey} <span className="text-[10px] text-gray-400 block">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold text-gray-700">
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-sans font-medium text-indigo-700 bg-indigo-50/20">
                                        <div className="flex items-center gap-1">
                                            <User size={10} className="text-indigo-400"/>
                                            {resolveActorName(entry)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-sans font-medium text-gray-800">{entry.description}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${entry.channel === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                            {entry.channel.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 font-bold dir-ltr ${entry.direction === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        <div className="flex items-center gap-1">
                                            {entry.direction === 'in' ? <ArrowDownLeft size={12}/> : <ArrowUpRight size={12}/>}
                                            {formatCurrency(entry.amount)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-[10px]">{entry.referenceId || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {ledger.length > limit && (
                    <div className="p-4 text-center border-t border-gray-100">
                        <button onClick={() => setLimit(l => l + 100)} className="text-indigo-600 text-sm font-bold hover:underline">
                            عرض المزيد...
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LedgerViewerPage;
