
import React, { useState } from 'react';
import { InternetCard } from '../types';
import { Wifi, Plus, Search, Edit2, Trash2, X, Info } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency } from '../utils';

interface InternetCardsPageProps {
  cards: InternetCard[];
  onAdd: (c: InternetCard) => void;
  onUpdate: (c: InternetCard) => void;
  onDelete: (id: string) => void;
}

const InternetCardsPage: React.FC<InternetCardsPageProps> = ({ cards, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<InternetCard | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
      name: '',
      price: '',
      cost: '',
      notes: ''
  });
  const [error, setError] = useState('');

  const filtered = cards.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpen = (card?: InternetCard) => {
    setError('');
    if (card) {
      setEditingCard(card);
      setFormData({ 
        name: card.name, 
        price: card.price.toString(),
        cost: card.cost.toString(),
        notes: card.notes || ''
      });
    } else {
      setEditingCard(null);
      setFormData({ name: '', price: '', cost: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handlePreventNegative = (e: React.KeyboardEvent) => {
      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
          e.preventDefault();
      }
  };

  const handleSubmit = () => {
    const pPrice = parseFloat(formData.price) || 0;
    const pCost = parseFloat(formData.cost) || 0;

    if (!formData.name.trim()) { setError('اسم البطاقة مطلوب'); return; }
    if (!formData.price || pPrice < 0) { setError('سعر البيع مطلوب ولا يمكن أن يكون سالباً'); return; }
    if (pCost < 0) { setError('سعر التكلفة لا يمكن أن يكون سالباً'); return; }

    const payload: InternetCard = {
      id: editingCard ? editingCard.id : generateId(),
      name: formData.name.trim(),
      price: pPrice,
      cost: pCost,
      notes: formData.notes
    };

    if (editingCard) onUpdate(payload);
    else onAdd(payload);

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Wifi className="text-blue-600" /> بطاقات الإنترنت
           </h2>
           <p className="text-gray-500 text-sm mt-1">إدارة أنواع بطاقات النت وأسعارها.</p>
        </div>
        <Button onClick={() => handleOpen()} size="lg" className="shadow-lg shadow-blue-200 bg-blue-600 hover:bg-blue-700">
           <Plus size={18} className="ml-2" /> إضافة بطاقة
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
         <div className="relative">
            <Search className="absolute right-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث عن بطاقة..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none"
            />
         </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          icon={Wifi} 
          title="لا يوجد بطاقات" 
          description="أضف أنواع بطاقات النت المتوفرة للبيع." 
          action={<Button variant="outline" onClick={() => handleOpen()}>إضافة أول بطاقة</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">نوع البطاقة</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">سعر البيع</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">التكلفة</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">الربح</th>
                      <th className="px-6 py-4"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                   {filtered.map(card => {
                       const margin = card.price - card.cost;
                       return (
                       <tr key={card.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-gray-900">
                             {card.name}
                             {card.notes && <div className="text-xs text-gray-400 font-normal mt-1">{card.notes}</div>}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(card.price)}</td>
                          <td className="px-6 py-4 text-gray-500">{formatCurrency(card.cost)}</td>
                          <td className="px-6 py-4 font-bold text-emerald-600">+{formatCurrency(margin)}</td>
                          <td className="px-6 py-4 text-left">
                             <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleOpen(card)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(card.id); }} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16}/></button>
                             </div>
                          </td>
                       </tr>
                   )})}
                </tbody>
             </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCard ? "تعديل بطاقة" : "إضافة بطاقة جديدة"} description="تحديد سعر وتكلفة بطاقة الإنترنت">
         <div className="space-y-6">
            <FormInput 
              label="اسم البطاقة" 
              placeholder="مثال: 10 جيجا" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <FormInput label="سعر البيع" unit="₪" type="number" min="0" onKeyDown={handlePreventNegative} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                <FormInput label="التكلفة على المكان" unit="₪" type="number" min="0" onKeyDown={handlePreventNegative} value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
            </div>

            <FormInput label="ملاحظات" placeholder="اختياري..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />

            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2"><X size={16}/> {error}</p>}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
               <Button className="bg-blue-600 px-6" onClick={handleSubmit}>حفظ</Button>
            </div>
         </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDelete(deleteId); }}
        message="هل أنت متأكد من حذف هذه البطاقة؟"
      />
    </div>
  );
};

export default InternetCardsPage;
