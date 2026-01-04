
import React, { useState, useEffect } from 'react';
import { Record, BankAccount, SystemState, Order } from '../types';
import { Search, CheckCircle, AlertCircle, Coffee, ChevronDown, ChevronUp, Coins, Edit2, Trash2, Wifi, StopCircle, ArrowLeft, AlertTriangle, Calendar, X, Filter, List } from 'lucide-react';
import { formatCurrency, formatDuration, getLocalDate } from '../utils';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';

interface RecordsListProps {
  records: Record[];
  dailyClosings?: any[];
  bankAccounts: BankAccount[];
  systemState?: SystemState;
  onCloseDay?: () => void;
  onRepayDebt: (recordId: string, amount: number, type: 'cash'|'bank', details?: any) => void;
  onStartNewDay?: () => void;
  onEditOrder?: (record: Record, order: Order) => void;
  onDeleteOrder?: (record: Record, orderId: string) => void;
}

const RecordsList: React.FC<RecordsListProps> = ({ records, bankAccounts, onRepayDebt, systemState, onEditOrder, onDeleteOrder, onCloseDay }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Date Filter State
  const [viewDate, setViewDate] = useState<string>(systemState?.currentDate || getLocalDate());
  const [isDateFilterActive, setIsDateFilterActive] = useState(true);

  // Sync viewDate if system date changes
  useEffect(() => {
      if (systemState?.currentDate) {
          setViewDate(systemState.currentDate);
          setIsDateFilterActive(true);
      }
  }, [systemState?.currentDate]);
  
  // Repayment Modal
  const [repayModal, setRepayModal] = useState<{ record: Record | null }>({ record: null });
  const [repayData, setRepayData] = useState({ amount: '', type: 'cash', bankAccountId: '', senderPhone: '', senderAccountName: '' });

  // Helper to convert ISO string to Local YYYY-MM-DD
  const toLocalYMD = (isoString: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      // Subtract timezone offset to get local time representation in ISO slot
      const offset = date.getTimezoneOffset() * 60000;
      const local = new Date(date.getTime() - offset);
      return local.toISOString().slice(0, 10);
  };

  const filteredRecords = records.filter(record => {
    // 1. Search
    const matchesSearch = searchTerm === '' || 
        record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (record.customerPhone && record.customerPhone.includes(searchTerm));

    if (!matchesSearch) return false;

    // 2. Status Filter (Tabs)
    if (statusFilter === 'paid' && !record.isPaid) return false;
    if (statusFilter === 'unpaid' && record.isPaid) return false;

    // 3. Date Logic
    // If filtering by date is disabled (Show All History), skip this check
    if (!isDateFilterActive) return true;

    // If Searching by name/phone, usually implies ignoring date to find history
    if (searchTerm !== '') return true; 

    // If "Unpaid" Tab is active: Show ALL debts regardless of date.
    if (statusFilter === 'unpaid') return true;

    // Strict Date Check: Use Local Time Conversion
    const recordEndDate = toLocalYMD(record.endTime);
    const recordStartDate = toLocalYMD(record.startTime);
    
    // Show if the record ended today OR started today (covers sessions spanning midnight)
    const isRelevantToDate = recordEndDate === viewDate || recordStartDate === viewDate;
    
    return isRelevantToDate;

  }).sort((a, b) => b.timestamp - a.timestamp);

  const openRepay = (record: Record) => {
      setRepayModal({ record });
      setRepayData({ amount: record.remainingDebt.toString(), type: 'cash', bankAccountId: '', senderPhone: record.customerPhone || '', senderAccountName: '' });
  };

  const handleRepaySubmit = () => {
      if (!repayModal.record) return;
      
      const amount = parseFloat(repayData.amount);
      if (repayData.type === 'bank') {
          if (!repayData.bankAccountId || !repayData.senderPhone || !repayData.senderAccountName) {
              return;
          }
      }
      
      onRepayDebt(repayModal.record.id, amount, repayData.type as 'cash'|'bank', {
          bankAccountId: repayData.bankAccountId,
          senderPhone: repayData.senderPhone,
          senderAccountName: repayData.senderAccountName
      });
      setRepayModal({ record: null });
  };

  const isRepayDisabled = !repayData.amount || parseFloat(repayData.amount) <= 0 || (repayData.type === 'bank' && (!repayData.bankAccountId || !repayData.senderPhone || !repayData.senderAccountName));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Filter className="text-indigo-600" size={20}/> سجل الجلسات
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                  {isDateFilterActive 
                    ? `عرض سجلات يوم: ${viewDate}` 
                    : 'عرض الأرشيف الكامل (جميع التواريخ)'}
              </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Filter Controls */}
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                  {isDateFilterActive ? (
                      <>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={viewDate} 
                                onChange={(e) => setViewDate(e.target.value)} 
                                className="pl-8 pr-2 py-1 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 outline-none focus:border-indigo-500"
                            />
                            <Calendar size={14} className="absolute left-2 top-2 text-gray-400 pointer-events-none"/>
                        </div>
                        <button 
                            onClick={() => setIsDateFilterActive(false)} 
                            className="bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1"
                            title="إلغاء فلتر التاريخ وعرض الكل"
                        >
                            <List size={14}/> عرض الكل
                        </button>
                      </>
                  ) : (
                      <button 
                        onClick={() => { setIsDateFilterActive(true); setViewDate(systemState?.currentDate || getLocalDate()); }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                      >
                          <Calendar size={14}/> تفعيل فلتر التاريخ
                      </button>
                  )}
              </div>

              {onCloseDay && systemState?.dayStatus === 'open' && (
                 <Button onClick={() => onCloseDay()} size="sm" className="bg-gray-800 hover:bg-black text-white shadow whitespace-nowrap">
                     <StopCircle size={14} className="ml-1" /> إغلاق اليوم
                 </Button>
              )}
          </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-full md:w-auto">
              <button onClick={() => setStatusFilter('all')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors ${statusFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>الكل ({filteredRecords.length})</button>
              <button onClick={() => setStatusFilter('paid')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors ${statusFilter === 'paid' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>المدفوع</button>
              <button onClick={() => setStatusFilter('unpaid')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors ${statusFilter === 'unpaid' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-50'}`}>الديون</button>
          </div>

          <div className="relative w-full md:w-64">
              <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
              <input 
                  type="text" 
                  placeholder="بحث (اسم / جوال)..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 ring-indigo-500 outline-none shadow-sm"
              />
          </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-right">
                    <tr>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500">الزبون</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500">التاريخ</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500">الإجمالي</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500">المدفوع</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500">المتبقي</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-500">الحالة</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredRecords.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="text-center py-10 text-gray-400">
                                <div className="flex flex-col items-center">
                                    <Search size={32} className="mb-2 opacity-50"/>
                                    <p>لا يوجد سجلات مطابقة</p>
                                    {isDateFilterActive && (
                                        <button onClick={() => setIsDateFilterActive(false)} className="text-indigo-600 text-xs mt-2 hover:underline">
                                            جرب عرض كل الأرشيف
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredRecords.map(record => (
                        <React.Fragment key={record.id}>
                            <tr onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} className={`hover:bg-gray-50 cursor-pointer transition-colors ${toLocalYMD(record.startTime) !== viewDate && isDateFilterActive ? 'bg-amber-50/30' : ''}`}>
                                <td className="px-4 py-4">
                                    <div className="font-bold text-gray-900">{record.customerName}</div>
                                    <div className="text-xs text-gray-500">{record.customerPhone}</div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">
                                    {new Date(record.startTime).toLocaleDateString('ar-SA')} <br/>
                                    <span className="text-xs text-gray-400">{new Date(record.startTime).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</span>
                                </td>
                                <td className="px-4 py-4 font-bold text-gray-800">{formatCurrency(record.totalInvoice)}</td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-col gap-1">
                                        {record.cashPaid > 0 && <span className="text-green-600 text-xs">نقدي: {formatCurrency(record.cashPaid)}</span>}
                                        {record.bankPaid > 0 && (
                                            <div className="text-indigo-600 text-xs flex items-center gap-1">
                                                <span>تحويل: {formatCurrency(record.bankPaid)}</span>
                                                <span className="text-[10px] text-indigo-400 bg-indigo-50 px-1 rounded">
                                                    إلى: {record.bankAccountNameSnapshot || bankAccounts.find(b=>b.id === record.bankAccountId)?.name || 'غير محدد'}
                                                </span>
                                            </div>
                                        )}
                                        {record.paidTotal === 0 && <span className="text-gray-400 text-xs">-</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-red-600 font-bold">{formatCurrency(record.remainingDebt)}</td>
                                <td className="px-4 py-4">
                                    {record.isPaid ? (
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit gap-1"><CheckCircle size={12}/> خالص</span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit gap-1"><AlertCircle size={12}/> دين</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-left">
                                    {!record.isPaid && (
                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); openRepay(record); }} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                                            <Coins size={14} className="ml-1" /> سداد
                                        </Button>
                                    )}
                                    {expandedId === record.id ? <ChevronUp size={16} className="inline ml-2 text-gray-400"/> : <ChevronDown size={16} className="inline ml-2 text-gray-400"/>}
                                </td>
                            </tr>
                            {expandedId === record.id && (
                                <tr className="bg-gray-50 shadow-inner">
                                    <td colSpan={7} className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Orders Detail */}
                                            <div>
                                                <h4 className="font-bold text-xs text-gray-500 mb-2 uppercase tracking-wider">تفاصيل الفاتورة</h4>
                                                <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-200">
                                                    <div className="flex justify-between text-sm border-b border-gray-100 pb-2 mb-2">
                                                        <span className="text-gray-600">الجلسة ({formatDuration(record.durationMinutes)})</span>
                                                        <span className="font-bold">{formatCurrency(record.sessionInvoice)}</span>
                                                    </div>
                                                    
                                                    {record.orders.map(order => (
                                                        <div key={order.id} className="flex justify-between items-center text-sm group">
                                                            <div className="flex items-center gap-2">
                                                                {order.type === 'internet_card' ? <Wifi size={12} className="text-blue-500"/> : <Coffee size={12} className="text-amber-500"/>}
                                                                <span>{order.quantity}x {order.itemName || order.drinkName}</span>
                                                                {order.size && <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{order.size === 'small' ? 'صغير' : 'كبير'}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold">{formatCurrency(order.priceAtOrder * order.quantity)}</span>
                                                                {(onEditOrder && onDeleteOrder) && (
                                                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={(e) => { e.stopPropagation(); onEditOrder(record, order); }} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Edit2 size={12}/></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); onDeleteOrder(record, order.id); }} className="text-red-500 p-1 hover:bg-red-100 rounded"><Trash2 size={12}/></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {record.discountApplied && (
                                                        <div className="flex justify-between text-sm text-red-600 pt-2 border-t border-dashed mt-2">
                                                            <span>خصم ({record.discountApplied.type === 'percent' ? record.discountApplied.value + '%' : 'مبلغ ثابت'})</span>
                                                            <span>-{formatCurrency(record.discountApplied.amount)}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex justify-between text-base font-extrabold text-indigo-700 pt-2 border-t border-gray-100 mt-2">
                                                        <span>الإجمالي النهائي</span>
                                                        <span>{formatCurrency(record.totalInvoice)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment History */}
                                            <div>
                                                <h4 className="font-bold text-xs text-gray-500 mb-2 uppercase tracking-wider">سجل الدفعات</h4>
                                                <div className="space-y-2">
                                                    {record.transactions && record.transactions.map(tx => (
                                                        <div key={tx.id} className="flex justify-between items-start bg-white p-3 rounded-xl border border-gray-200 text-xs shadow-sm">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${tx.type === 'bank' ? 'bg-indigo-100 text-indigo-700' : (tx.type === 'credit_usage' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}`}>
                                                                        {tx.type === 'bank' ? 'تحويل بنكي' : (tx.type === 'credit_usage' ? 'خصم رصيد' : 'نقدي')}
                                                                    </span>
                                                                    <span className="text-gray-400">{new Date(tx.date).toLocaleDateString('ar-SA')} {new Date(tx.date).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                                                                </div>
                                                                
                                                                {tx.type === 'bank' && (
                                                                    <div className="text-[10px] text-gray-500 mt-1 flex flex-col gap-0.5 pl-1 border-l-2 border-indigo-100">
                                                                      <div>من: <span className="font-medium text-gray-700">{tx.senderAccountName || '---'}</span></div>
                                                                      <div className="flex items-center gap-1">
                                                                          <ArrowLeft size={10} className="text-indigo-400"/> 
                                                                          إلى: <span className="font-bold text-indigo-700">{bankAccounts.find(b => b.id === tx.bankAccountId)?.name || record.bankAccountNameSnapshot || 'غير محدد'}</span>
                                                                      </div>
                                                                    </div>
                                                                )}
                                                                {tx.note && <div className="text-[10px] text-gray-500 italic mt-1">{tx.note}</div>}
                                                            </div>
                                                            <span className="font-bold text-sm text-gray-800">{formatCurrency(tx.amount)}</span>
                                                        </div>
                                                    ))}
                                                    {(!record.transactions || record.transactions.length === 0) && (
                                                         <div className="text-xs text-center text-gray-400 italic py-2">لا يوجد تفاصيل دفعات (سجل قديم)</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                        ))
                    )}
                </tbody>
            </table>
          </div>
      </div>

      <Modal isOpen={!!repayModal.record} onClose={() => setRepayModal({ record: null })} title="تسديد دين">
          <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
                  <p className="text-xs text-red-600 font-bold mb-1">المبلغ المتبقي</p>
                  <p className="text-3xl font-extrabold text-red-800 tracking-tight">{formatCurrency(repayModal.record?.remainingDebt || 0)}</p>
                  <p className="text-sm text-gray-600 mt-2 font-medium">{repayModal.record?.customerName}</p>
              </div>

              <div className="bg-gray-100 p-1 rounded-lg flex mb-4">
                  <button onClick={() => setRepayData({...repayData, type: 'cash'})} className={`flex-1 py-2 text-sm font-bold rounded ${repayData.type === 'cash' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}>نقدي (كاش)</button>
                  <button onClick={() => setRepayData({...repayData, type: 'bank'})} className={`flex-1 py-2 text-sm font-bold rounded ${repayData.type === 'bank' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>تحويل بنكي</button>
              </div>

              <FormInput label="المبلغ المدفوع" type="number" unit="₪" value={repayData.amount} onChange={e => setRepayData({...repayData, amount: e.target.value})} placeholder={repayModal.record?.remainingDebt.toString()} />

              {repayData.type === 'bank' && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 animate-fade-in space-y-2">
                      <FormInput 
                          as="select" 
                          label="تم التحويل إلى" 
                          value={repayData.bankAccountId} 
                          onChange={e => setRepayData({...repayData, bankAccountId: e.target.value})} 
                          error={repayData.type === 'bank' && !repayData.bankAccountId ? 'يرجى اختيار الحساب البنكي' : undefined}
                      >
                          <option value="">-- اختر حساب --</option>
                          {bankAccounts.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                      </FormInput>
                      <FormInput 
                          label="رقم جوال المرسل" 
                          value={repayData.senderPhone} 
                          onChange={e => setRepayData({...repayData, senderPhone: e.target.value})} 
                          error={repayData.type === 'bank' && !repayData.senderPhone ? 'يرجى إدخال رقم المرسل' : undefined}
                      />
                      <FormInput 
                          label="اسم حساب المرسل" 
                          value={repayData.senderAccountName} 
                          onChange={e => setRepayData({...repayData, senderAccountName: e.target.value})} 
                          error={repayData.type === 'bank' && !repayData.senderAccountName ? 'يرجى إدخال اسم المرسل' : undefined}
                      />
                  </div>
              )}

              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200" 
                onClick={handleRepaySubmit}
                disabled={isRepayDisabled}
              >
                  <CheckCircle size={18} className="ml-2"/> تأكيد السداد
              </Button>
          </div>
      </Modal>
    </div>
  );
};

export default RecordsList;
