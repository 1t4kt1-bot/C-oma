
import React, { useState } from 'react';
import { Drink, DrinkAvailability } from '../types';
import { Coffee, Plus, Search, Edit2, Trash2, Check, X } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency } from '../utils';

interface DrinksPageProps {
  drinks: Drink[];
  onAdd: (d: Drink) => void;
  onUpdate: (d: Drink) => void;
  onDelete: (id: string) => void;
}

const DrinksPage: React.FC<DrinksPageProps> = ({ drinks, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
      name: '',
      availability: 'small' as DrinkAvailability,
      smallPrice: '',
      smallCost: '',
      largePrice: '',
      largeCost: ''
  });
  const [error, setError] = useState('');

  const filtered = drinks.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpen = (drink?: Drink) => {
    setError('');
    if (drink) {
      setEditingDrink(drink);
      setFormData({ 
        name: drink.name, 
        availability: drink.availability,
        smallPrice: (drink.smallPrice || 0).toString(),
        smallCost: (drink.smallCost || 0).toString(),
        largePrice: (drink.largePrice || 0).toString(),
        largeCost: (drink.largeCost || 0).toString()
      });
    } else {
      setEditingDrink(null);
      setFormData({ 
          name: '', availability: 'small', 
          smallPrice: '', smallCost: '', 
          largePrice: '', largeCost: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handlePreventNegative = (e: React.KeyboardEvent) => {
      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
          e.preventDefault();
      }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
        setError('اسم المشروب مطلوب');
        return;
    }

    const { availability, smallPrice, smallCost, largePrice, largeCost } = formData;
    const sPrice = parseFloat(smallPrice) || 0;
    const sCost = parseFloat(smallCost) || 0;
    const lPrice = parseFloat(largePrice) || 0;
    const lCost = parseFloat(largeCost) || 0;

    // Validation based on availability
    if (availability === 'small' || availability === 'both') {
        if (!smallPrice || sPrice < 0) { setError('سعر البيع مطلوب ولا يقبل قيمة سالبة'); return; }
        if (sCost < 0) { setError('سعر التكلفة لا يمكن أن يكون سالباً'); return; }
    }
    if (availability === 'large' || availability === 'both') {
        if (!largePrice || lPrice < 0) { setError('سعر البيع مطلوب ولا يقبل قيمة سالبة'); return; }
        if (lCost < 0) { setError('سعر التكلفة لا يمكن أن يكون سالباً'); return; }
    }
    
    // Check duplicates
    const duplicate = drinks.find(d => d.name.toLowerCase() === formData.name.trim().toLowerCase() && d.id !== editingDrink?.id);
    if (duplicate) { setError('يوجد مشروب آخر بنفس الاسم'); return; }

    const payload: Drink = {
      id: editingDrink ? editingDrink.id : generateId(),
      name: formData.name.trim(),
      availability,
      smallPrice: (availability !== 'large') ? sPrice : undefined,
      smallCost: (availability !== 'large') ? sCost : undefined,
      largePrice: (availability !== 'small') ? lPrice : undefined,
      largeCost: (availability !== 'small') ? lCost : undefined,
    };

    if (editingDrink) onUpdate(payload);
    else onAdd(payload);

    setIsModalOpen(false);
  };

  const PriceCell = ({ label, price, cost }: { label: string, price?: number, cost?: number }) => {
      if (price === undefined) return <span className="text-gray-300 text-xs">-</span>;
      const margin = (price || 0) - (cost || 0);
      return (
          <div className="flex flex-col">
             <span className="text-xs text-gray-400 mb-0.5">{label}</span>
             <div className="flex items-baseline gap-2">
                <span className="font-bold text-gray-800">{formatCurrency(price)}</span>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">ت: {formatCurrency(cost || 0)}</span>
             </div>
             <span className="text-[10px] text-emerald-600 font-medium mt-0.5">
                 ربح: +{formatCurrency(margin)}
             </span>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Coffee className="text-indigo-600" /> إدارة المشروبات
           </h2>
           <p className="text-gray-500 text-sm mt-1">تحديد الأسعار والتكلفة للأحجام المختلفة.</p>
        </div>
        <Button onClick={() => handleOpen()} size="lg" className="shadow-lg shadow-indigo-200">
           <Plus size={18} className="ml-2" /> إضافة مشروب
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
         <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث عن مشروب..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:outline-none"
            />
         </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          icon={Coffee} 
          title="لا يوجد مشروبات" 
          description="أضف مشروبات للقائمة مع تحديد الأحجام والأسعار." 
          action={<Button variant="outline" onClick={() => handleOpen()}>إضافة أول مشروب</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">اسم المشروب</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">صغير</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">كبير</th>
                      <th className="px-6 py-4"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                   {filtered.map(drink => (
                       <tr key={drink.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-gray-900 align-top">
                             {drink.name}
                             <div className="mt-1">
                                {drink.availability === 'both' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">حجمين</span>}
                                {drink.availability === 'small' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">صغير فقط</span>}
                                {drink.availability === 'large' && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">كبير فقط</span>}
                             </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                             <PriceCell label="صغير" price={drink.availability !== 'large' ? drink.smallPrice : undefined} cost={drink.availability !== 'large' ? drink.smallCost : undefined} />
                          </td>
                          <td className="px-6 py-4 align-top">
                             <PriceCell label="كبير" price={drink.availability !== 'small' ? drink.largePrice : undefined} cost={drink.availability !== 'small' ? drink.largeCost : undefined} />
                          </td>
                          <td className="px-6 py-4 text-left align-middle">
                             <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpen(drink)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(drink.id); }} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16}/></button>
                             </div>
                          </td>
                       </tr>
                   ))}
                </tbody>
             </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDrink ? "تعديل مشروب" : "إضافة مشروب جديد"} description="أدخل تفاصيل المشروب وأسعاره">
         <div className="space-y-6">
            <FormInput 
              label="اسم المشروب" 
              placeholder="مثال: لاتيه" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
               <label className="block text-sm font-bold text-gray-800 mb-3">الأحجام المتاحة</label>
               <div className="flex gap-2 bg-white border border-gray-200 p-1 rounded-lg">
                  {[
                      { id: 'small', label: 'صغير فقط' },
                      { id: 'large', label: 'كبير فقط' },
                      { id: 'both', label: 'كلاهما' }
                  ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData({...formData, availability: opt.id as DrinkAvailability})}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.availability === opt.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                      >
                         {opt.label}
                      </button>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.availability === 'small' || formData.availability === 'both') && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in">
                        <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase border-b border-blue-200 pb-1">تسعير الحجم الصغير</h4>
                        <div className="space-y-3 pt-2">
                            <FormInput label="سعر البيع" unit="₪" type="number" min="0" onKeyDown={handlePreventNegative} value={formData.smallPrice} onChange={e => setFormData({...formData, smallPrice: e.target.value})} className="mb-0" />
                            <FormInput label="التكلفة" unit="₪" type="number" min="0" onKeyDown={handlePreventNegative} value={formData.smallCost} onChange={e => setFormData({...formData, smallCost: e.target.value})} className="mb-0" />
                        </div>
                    </div>
                )}

                {(formData.availability === 'large' || formData.availability === 'both') && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 animate-fade-in">
                        <h4 className="text-xs font-bold text-orange-800 mb-2 uppercase border-b border-orange-200 pb-1">تسعير الحجم الكبير</h4>
                        <div className="space-y-3 pt-2">
                            <FormInput label="سعر البيع" unit="₪" type="number" min="0" onKeyDown={handlePreventNegative} value={formData.largePrice} onChange={e => setFormData({...formData, largePrice: e.target.value})} className="mb-0" />
                            <FormInput label="التكلفة" unit="₪" type="number" min="0" onKeyDown={handlePreventNegative} value={formData.largeCost} onChange={e => setFormData({...formData, largeCost: e.target.value})} className="mb-0" />
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-pulse"><X size={16}/> {error}</p>}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
               <Button onClick={handleSubmit} className="px-6">حفظ البيانات</Button>
            </div>
         </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
            if (deleteId) onDelete(deleteId);
        }}
        message="هل أنت متأكد من حذف هذا المشروب؟"
      />
    </div>
  );
};

export default DrinksPage;
