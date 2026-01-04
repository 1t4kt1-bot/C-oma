
import React, { useState } from 'react';
import { Purchase, Expense, BankAccount } from '../types';
import { ShoppingBag, Plus, Search, Trash2, MapPin, User, Wallet, Building2, Info, Banknote, Landmark } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency } from '../utils';

interface PurchasesPageProps {
  purchases: Purchase[];
  onUpdatePurchases: (p: Purchase[]) => void;
  expenses: Expense[];
  onUpdateExpenses: (e: Expense[]) => void;
  bankAccounts: BankAccount[];
  onAddPurchase?: (p: Purchase, e?: Expense) => void; // New Prop
}

const PARTNERS = [
    { id: 'abu_khaled', name: 'أبو خالد' },
    { id: 'khaled', name: 'خالد' },
    { id: 'abdullah', name: 'عبد الله' }
];

const PurchasesPage: React.FC<PurchasesPageProps> = ({ purchases, onUpdatePurchases, expenses, onUpdateExpenses, bankAccounts, onAddPurchase }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
      name: string; amount: string; date: string; 
      fundingSource: 'place' | 'partner'; buyer: string; source: string; notes: string;
      paymentMethod: 'cash' | 'bank'; fromAccountId: string; fromAccountName: string;
  }>({ 
      name: '', amount: '', date: new Date().toISOString().split('T')[0], 
      fundingSource: 'place', buyer: 'abu_khaled', source: '', notes: '',
      paymentMethod: 'cash', fromAccountId: '', fromAccountName: ''
  });
  const [error, setError] = useState('');

  const filtered = purchases.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAdd = () => {
     if(!formData.name || !formData.amount || !formData.date) { setError('جميع الحقول مطلوبة'); return; }
     
     // Validate Bank Details
     if (formData.paymentMethod === 'bank') {
         if (formData.fundingSource === 'place' && !formData.fromAccountId) {
             setError('يجب اختيار الحساب البنكي للمكان'); return;
         }
         if (formData.fundingSource === 'partner' && !formData.fromAccountName) {
             setError('يرجى تحديد اسم حساب الشريك المحول منه'); return;
         }
     }

     const purchaseId = generateId();
     const newPurchase: Purchase = {
         id: purchaseId,
         name: formData.name,
         amount: parseFloat(formData.amount),
         date: formData.date,
         fundingSource: formData.fundingSource,
         buyer: formData.fundingSource === 'partner' ? formData.buyer : '',
         source: formData.source,
         notes: formData.notes,
         paymentMethod: formData.paymentMethod,
         fromAccountId: formData.fundingSource === 'place' ? formData.fromAccountId : undefined,
         fromAccountNameAtPaymentTime: formData.fundingSource === 'place' 
            ? bankAccounts.find(b=>b.id===formData.fromAccountId)?.name 
            : formData.fromAccountName
     };

     let newExpense: Expense | undefined;

     // Auto-create expense if funded by Place
     if (formData.fundingSource === 'place') {
         newExpense = {
             id: generateId(),
             name: `شراء: ${formData.name}`,
             amount: parseFloat(formData.amount),
             type: 'auto_purchase',
             date: formData.date,
             notes: 'تم توليده تلقائياً من المشتريات',
             linkedPurchaseId: purchaseId,
             paymentMethod: formData.paymentMethod,
             fromAccountId: formData.fromAccountId,
             fromAccountNameAtPaymentTime: bankAccounts.find(b=>b.id===formData.fromAccountId)?.name 
         };
     }

     if (onAddPurchase) {
         onAddPurchase(newPurchase, newExpense);
     } else {
         onUpdatePurchases([...purchases, newPurchase]);
         if (newExpense) onUpdateExpenses([...expenses, newExpense]);
     }

     setIsModalOpen(false);
     setFormData({ name: '', amount: '', date: new Date().toISOString().split('T')[0], fundingSource: 'place', buyer: 'abu_khaled', source: '', notes: '', paymentMethod: 'cash', fromAccountId: '', fromAccountName: '' });
  };

  const handleDelete = () => {
      if (deleteId) {
          const purchase = purchases.find(p => p.id === deleteId);
          if (purchase && purchase.fundingSource === 'place') {
              onUpdateExpenses(expenses.filter(e => e.linkedPurchaseId !== deleteId));
          }
          onUpdatePurchases(purchases.filter(p => p.id !== deleteId));
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* ... Header omitted ... */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <ShoppingBag className="text-orange-600" /> المشتريات
           </h2>
           <p className="text-gray-500 text-sm mt-1">تتبع المشتريات وتحديد مصدر التمويل (المكان أو الشركاء).</p>
        </div>
        <Button onClick={() => { setError(''); setIsModalOpen(true); }} size="lg" className="shadow-lg shadow-orange-200 bg-orange-600 hover:bg-orange-700">
           <Plus size={18} className="ml-2" /> إضافة مشتريات
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={18} />
            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="بحث في المشتريات..." className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-orange-500" />
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState icon={ShoppingBag} title="لا يوجد مشتريات" description="سجل المشتريات هنا." /> : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                <thead className="bg-gray-50">
                   <tr>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">الاسم</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">المبلغ</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">مصدر المال</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">الدفع</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">التاريخ</th>
                      <th className="px-6 py-3"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                   {filtered.map(p => (
                       <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(p.amount)}</td>
                          <td className="px-6 py-4">
                             {p.fundingSource === 'place' ? (
                                 <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                     <Building2 size={12} className="ml-1"/> مال المكان
                                 </span>
                             ) : (
                                 <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                     <User size={12} className="ml-1"/> {PARTNERS.find(x => x.id === p.buyer)?.name}
                                 </span>
                             )}
                          </td>
                          <td className="px-6 py-4">
                              {p.paymentMethod === 'bank' ? <span className="text-indigo-600 text-xs font-bold flex items-center gap-1"><Landmark size={12}/> تحويل</span> : <span className="text-green-600 text-xs font-bold flex items-center gap-1"><Banknote size={12}/> كاش</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{p.date}</td>
                          <td className="px-6 py-4 text-left">
                             <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(p.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={18}/></button>
                          </td>
                       </tr>
                   ))}
                </tbody>
             </table>
             {/* Mobile Cards (Simplified) */}
             <div className="md:hidden space-y-4 p-4 bg-gray-50">
                 {filtered.map(p => (
                     <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                        <h4 className="font-bold text-gray-900">{p.name}</h4>
                        <div className="absolute top-4 left-4 font-bold text-gray-800">{formatCurrency(p.amount)}</div>
                        <div className="text-xs text-gray-500 mt-1">{p.date}</div>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(p.id); }} className="text-red-500 absolute bottom-4 left-4"><Trash2 size={16}/></button>
                     </div>
                 ))}
             </div>
          </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تسجيل مشتريات">
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                 <FormInput label="الاسم" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                 <FormInput label="المبلغ" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
             </div>
             
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                 <label className="block text-sm font-bold text-gray-800 mb-2">مصدر التمويل</label>
                 <div className="flex gap-2">
                     <button onClick={() => setFormData({...formData, fundingSource: 'place'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.fundingSource === 'place' ? 'bg-orange-600 text-white' : 'bg-white border text-gray-600'}`}>مال المكان</button>
                     <button onClick={() => setFormData({...formData, fundingSource: 'partner'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.fundingSource === 'partner' ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600'}`}>مال الشريك</button>
                 </div>
             </div>

             {formData.fundingSource === 'partner' && (
                 <FormInput as="select" label="الشريك المشتري" value={formData.buyer} onChange={e => setFormData({...formData, buyer: e.target.value})}>
                    {PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </FormInput>
             )}

             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 animate-fade-in">
                 <label className="block text-sm font-bold text-gray-800 mb-2">طريقة الدفع</label>
                 <div className="flex gap-2 mb-3">
                     <button onClick={() => setFormData({...formData, paymentMethod: 'cash'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600'}`}>كاش</button>
                     <button onClick={() => setFormData({...formData, paymentMethod: 'bank'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.paymentMethod === 'bank' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>تحويل بنكي</button>
                 </div>
                 
                 {formData.paymentMethod === 'bank' && (
                     <div className="animate-fade-in">
                         {formData.fundingSource === 'place' ? (
                             <FormInput as="select" label="خصم من حساب" value={formData.fromAccountId} onChange={e => setFormData({...formData, fromAccountId: e.target.value})} className="mb-0">
                                 <option value="">-- اختر حساب المكان --</option>
                                 {bankAccounts.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                             </FormInput>
                         ) : (
                             <FormInput label="اسم حساب الشريك (اختياري)" placeholder="من أي بنك حول؟" value={formData.fromAccountName} onChange={e => setFormData({...formData, fromAccountName: e.target.value})} className="mb-0" />
                         )}
                     </div>
                 )}
             </div>

             <FormInput label="التاريخ" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
             {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
             
             <div className="flex justify-end gap-2 pt-2">
                 <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                 <Button className="bg-orange-600" onClick={handleAdd}>حفظ</Button>
             </div>
          </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="حذف؟" />
    </div>
  );
};

export default PurchasesPage;
