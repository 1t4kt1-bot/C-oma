
import React, { useState } from 'react';
import { Expense, BankAccount } from '../types';
import { Receipt, Plus, Search, Trash2, Calendar, Info, RefreshCw, Landmark, Banknote } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency } from '../utils';

interface ExpensesPageProps {
  expenses: Expense[];
  onUpdateExpenses: (e: Expense[]) => void; // Keep for delete/update array directly if needed
  bankAccounts: BankAccount[];
  onAddExpense?: (e: Expense) => void; // New Prop for Guarded Add
}

const ExpensesPage: React.FC<ExpensesPageProps> = ({ expenses, onUpdateExpenses, bankAccounts, onAddExpense }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
      name: string; amount: string; type: string; date: string; notes: string;
      paymentMethod: 'cash' | 'bank'; fromAccountId: string;
  }>({ 
      name: '', amount: '', type: 'fixed', date: '', notes: '',
      paymentMethod: 'cash', fromAccountId: ''
  });
  const [error, setError] = useState('');

  const filtered = expenses.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAdd = () => {
     if(!formData.name || !formData.amount) { setError('يرجى ملء الحقول المطلوبة'); return; }
     if(formData.type === 'one_time' && !formData.date) { setError('يرجى تحديد التاريخ للمصروف'); return; }
     
     if(formData.paymentMethod === 'bank' && !formData.fromAccountId) { setError('يرجى تحديد الحساب البنكي المخصوم منه'); return; }

     const newExpense: Expense = {
         id: generateId(),
         name: formData.name,
         amount: parseFloat(formData.amount),
         type: formData.type as any,
         date: formData.type === 'one_time' ? formData.date : undefined,
         notes: formData.notes,
         paymentMethod: formData.paymentMethod,
         fromAccountId: formData.paymentMethod === 'bank' ? formData.fromAccountId : undefined,
         fromAccountNameAtPaymentTime: formData.paymentMethod === 'bank' ? bankAccounts.find(b=>b.id===formData.fromAccountId)?.name : undefined
     };

     if (onAddExpense) {
         onAddExpense(newExpense);
     } else {
         onUpdateExpenses([...expenses, newExpense]);
     }
     
     setIsModalOpen(false);
     setFormData({ name: '', amount: '', type: 'fixed', date: '', notes: '', paymentMethod: 'cash', fromAccountId: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* ... Header omitted ... */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Receipt className="text-red-600" /> المصاريف الشهرية
           </h2>
           <p className="text-gray-500 text-sm mt-1">تسجيل النفقات الثابتة والطارئة.</p>
        </div>
        <Button onClick={() => { setError(''); setIsModalOpen(true); }} size="lg" className="shadow-lg shadow-red-200 bg-red-600 hover:bg-red-700">
           <Plus size={18} className="ml-2" /> تسجيل مصروف
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={18} />
            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="بحث في المصاريف..." className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-red-500" />
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState icon={Receipt} title="لا يوجد مصاريف" description="سجل مصاريفك الشهرية." /> : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                <thead className="bg-gray-50">
                   <tr>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">اسم المصروف</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">المبلغ</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">النوع</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">الدفع</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">التاريخ</th>
                      <th className="px-6 py-3"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                   {filtered.map(e => (
                       <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{e.name}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(e.amount)}</td>
                          <td className="px-6 py-4">
                             {e.type === 'auto_purchase' ? <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">تلقائي</span> : <span className={`text-xs px-2 py-1 rounded ${e.type === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{e.type === 'fixed' ? 'شهري' : 'مرة واحدة'}</span>}
                          </td>
                          <td className="px-6 py-4">
                              {e.paymentMethod === 'bank' ? <Landmark size={14} className="text-indigo-600"/> : <Banknote size={14} className="text-green-600"/>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{e.date || '-'}</td>
                          <td className="px-6 py-4 text-left">
                             {!e.linkedPurchaseId && <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }} className="text-red-500 p-2"><Trash2 size={18}/></button>}
                          </td>
                       </tr>
                   ))}
                </tbody>
             </table>
             <div className="md:hidden space-y-4 p-4 bg-gray-50">
                 {filtered.map(e => (
                     <div key={e.id} className="bg-white p-4 rounded-xl border border-gray-200 relative">
                        <h4 className="font-bold text-gray-900">{e.name}</h4>
                        <div className="text-lg font-bold text-gray-800">{formatCurrency(e.amount)}</div>
                        {!e.linkedPurchaseId && <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }} className="absolute top-4 left-4 text-red-500"><Trash2 size={16}/></button>}
                     </div>
                 ))}
             </div>
          </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مصروف">
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <FormInput label="الاسم" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <FormInput label="المبلغ" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
             </div>
             <FormInput as="select" label="النوع" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                 <option value="fixed">شهري ثابت</option>
                 <option value="one_time">مرة واحدة</option>
             </FormInput>

             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                 <label className="block text-sm font-bold text-gray-800 mb-2">طريقة الدفع</label>
                 <div className="flex gap-2 mb-3">
                     <button onClick={() => setFormData({...formData, paymentMethod: 'cash'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600'}`}>كاش</button>
                     <button onClick={() => setFormData({...formData, paymentMethod: 'bank'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.paymentMethod === 'bank' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>تحويل بنكي</button>
                 </div>
                 {formData.paymentMethod === 'bank' && (
                     <FormInput as="select" label="خصم من حساب" value={formData.fromAccountId} onChange={e => setFormData({...formData, fromAccountId: e.target.value})} className="mb-0">
                         <option value="">-- اختر حساب --</option>
                         {bankAccounts.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                     </FormInput>
                 )}
             </div>

             {formData.type === 'one_time' && <FormInput label="التاريخ" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />}
             
             {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
             <div className="flex justify-end gap-2 pt-2">
                 <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                 <Button className="bg-red-600" onClick={handleAdd}>حفظ</Button>
             </div>
          </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) onUpdateExpenses(expenses.filter(x => x.id !== deleteId)); }} message="حذف؟" />
    </div>
  );
};

export default ExpensesPage;
