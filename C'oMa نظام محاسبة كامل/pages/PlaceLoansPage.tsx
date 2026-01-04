
import React, { useState } from 'react';
import { PlaceLoan, BankAccount, Expense } from '../types';
import { Briefcase, Plus, Calendar, User, Landmark, Banknote, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import { generateId, formatCurrency, generateLoanInstallments, getLocalDate } from '../utils';
import { getPlaceLoanStats, checkLoanStatusAfterPayment } from '../accounting_core';

interface PlaceLoansPageProps {
  loans: PlaceLoan[];
  onUpdateLoans: (loans: PlaceLoan[]) => void;
  bankAccounts: BankAccount[];
  expenses: Expense[];
  onUpdateExpenses: (expenses: Expense[]) => void;
  onAddLoan?: (l: PlaceLoan) => void;
  onPayInstallment?: (updatedLoan: PlaceLoan, newExpense: Expense) => void;
}

const PARTNERS = [
    { id: 'abu_khaled', name: 'أبو خالد' },
    { id: 'khaled', name: 'خالد' },
    { id: 'abdullah', name: 'عبد الله' }
];

const PlaceLoansPage: React.FC<PlaceLoansPageProps> = ({ loans, onUpdateLoans, bankAccounts, expenses, onUpdateExpenses, onAddLoan, onPayInstallment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);
  
  // Payment Modal
  const [payModal, setPayModal] = useState<{ installmentId: string, loanId: string } | null>(null);
  const [payData, setPayData] = useState({ amount: '', channel: 'cash' as 'cash'|'bank', accountId: '', date: getLocalDate() });

  // Add Loan Form
  const [formData, setFormData] = useState<{
      lenderType: 'partner' | 'external';
      lenderName: string;
      partnerId: string;
      reason: string;
      principal: string;
      channel: 'cash' | 'bank';
      startDate: string;
      scheduleType: 'daily' | 'weekly' | 'monthly';
      installmentsCount: string;
  }>({
      lenderType: 'external', lenderName: '', partnerId: '', reason: '', principal: '',
      channel: 'cash', startDate: getLocalDate(), scheduleType: 'monthly', installmentsCount: '1'
  });

  const activeLoan = activeLoanId ? loans.find(l => l.id === activeLoanId) : null;

  const handleAddLoan = () => {
      const p = parseFloat(formData.principal);
      const c = parseInt(formData.installmentsCount);
      
      if (!p || !c || !formData.startDate) return;
      if (formData.lenderType === 'external' && !formData.lenderName) return;
      if (formData.lenderType === 'partner' && !formData.partnerId) return;

      const loanId = generateId();
      const installments = generateLoanInstallments(loanId, p, formData.startDate, formData.scheduleType, c);

      const newLoan: PlaceLoan = {
          id: loanId,
          lenderType: formData.lenderType,
          lenderName: formData.lenderType === 'partner' ? PARTNERS.find(x=>x.id===formData.partnerId)?.name || '' : formData.lenderName,
          partnerId: formData.lenderType === 'partner' ? formData.partnerId : undefined,
          reason: formData.reason,
          principal: p,
          channel: formData.channel,
          startDate: formData.startDate,
          scheduleType: formData.scheduleType,
          installmentsCount: c,
          installmentAmount: installments[0].amount, // approx
          status: 'active',
          createdAt: new Date().toISOString(),
          installments,
          payments: []
      };

      if(onAddLoan) onAddLoan(newLoan);
      else onUpdateLoans([...loans, newLoan]);
      
      setIsModalOpen(false);
  };

  const handlePayInstallment = () => {
      if (!payModal) return;
      const loan = loans.find(l => l.id === payModal.loanId);
      if (!loan) return;

      const amount = parseFloat(payData.amount);
      if (!amount) return;

      const paymentId = generateId();
      const newPayment = {
          id: paymentId,
          loanId: loan.id,
          installmentId: payModal.installmentId,
          date: payData.date,
          amount,
          channel: payData.channel,
          note: 'سداد قسط'
      };

      // 1. Determine new Status via Core Selector
      const newStatus = checkLoanStatusAfterPayment(loan, amount);

      // 2. Add Payment to Loan
      const updatedLoan: PlaceLoan = {
          ...loan,
          payments: [...loan.payments, newPayment],
          installments: loan.installments.map(ins => {
              if (ins.id === payModal.installmentId) {
                  return { ...ins, status: 'paid', paidAmount: amount };
              }
              return ins;
          }),
          status: newStatus
      };

      // 3. Add Expense Record (External OR Partner)
      const newExpense: Expense = {
          id: generateId(),
          name: `سداد دين مكان: ${loan.lenderName}`,
          amount,
          type: 'loan_repayment',
          date: payData.date,
          paymentMethod: payData.channel,
          fromAccountId: payData.channel === 'bank' ? payData.accountId : undefined,
          fromAccountNameAtPaymentTime: bankAccounts.find(b=>b.id===payData.accountId)?.name,
          linkedLoanPaymentId: paymentId
      };
      
      if (onPayInstallment) {
          onPayInstallment(updatedLoan, newExpense);
      } else {
          onUpdateLoans(loans.map(l => l.id === loan.id ? updatedLoan : l));
          onUpdateExpenses([...expenses, newExpense]);
      }
      setPayModal(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Briefcase className="text-amber-600"/> ديون المكان (Place Loans)
                </h2>
                <p className="text-gray-500 text-sm mt-1">إدارة الديون المستحقة على المكان وجدولة سدادها.</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="bg-amber-600 hover:bg-amber-700">
                <Plus size={18} className="ml-2"/> دين جديد
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* List */}
            <div className="md:col-span-1 space-y-4">
                {loans.map(loan => {
                    const stats = getPlaceLoanStats(loan);
                    
                    return (
                        <div 
                            key={loan.id} 
                            onClick={() => setActiveLoanId(loan.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${activeLoanId === loan.id ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300' : 'bg-white border-gray-200 hover:border-amber-200'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-800">{loan.lenderName}</h3>
                                {loan.status === 'closed' 
                                    ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={10}/> مغلق</span>
                                    : <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10}/> نشط</span>
                                }
                            </div>
                            <div className="text-sm text-gray-500 mb-2">{formatCurrency(loan.principal)} - {loan.reason}</div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${stats.progress}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>مدفوع: {formatCurrency(stats.paid)}</span>
                                <span>المتبقي: {formatCurrency(stats.remaining)}</span>
                            </div>
                        </div>
                    );
                })}
                {loans.length === 0 && <div className="text-center text-gray-400 py-10 bg-white rounded-xl border border-dashed">لا يوجد ديون</div>}
            </div>

            {/* Detail View */}
            <div className="md:col-span-2">
                {activeLoan ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{activeLoan.lenderName}</h3>
                                <p className="text-sm text-gray-500">بداية الدين: {activeLoan.startDate}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-amber-600">{formatCurrency(activeLoan.principal)}</div>
                                <div className="text-xs text-gray-400">القناة: {activeLoan.channel === 'cash' ? 'كاش' : 'بنك'}</div>
                            </div>
                        </div>

                        <h4 className="font-bold text-gray-700 mb-4 text-sm uppercase">جدول الدفعات ({activeLoan.scheduleType})</h4>
                        <div className="space-y-2">
                            {activeLoan.installments.map((inst, idx) => (
                                <div key={inst.id} className={`flex items-center justify-between p-3 rounded-lg border ${inst.status === 'paid' ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold text-gray-500">{idx + 1}</div>
                                        <div>
                                            <div className="font-bold text-gray-800">{formatCurrency(inst.amount)}</div>
                                            <div className="text-xs text-gray-500">{inst.dueDate}</div>
                                        </div>
                                    </div>
                                    {inst.status === 'paid' ? (
                                        <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> تم السداد</span>
                                    ) : (
                                        <Button size="sm" onClick={() => { setPayModal({ loanId: activeLoan.id, installmentId: inst.id }); setPayData({ ...payData, amount: inst.amount.toString() }); }} className="text-xs">
                                            سداد
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Briefcase size={48} className="mb-2 opacity-20"/>
                        <p>اختر ديناً لعرض التفاصيل</p>
                    </div>
                )}
            </div>
        </div>

        {/* Add Loan Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة دين جديد على المكان">
            <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-800 mb-2">جهة الدين</label>
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setFormData({...formData, lenderType: 'external'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.lenderType === 'external' ? 'bg-amber-600 text-white' : 'bg-white border text-gray-600'}`}>خارجي</button>
                        <button onClick={() => setFormData({...formData, lenderType: 'partner'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.lenderType === 'partner' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>شريك</button>
                    </div>
                    {formData.lenderType === 'partner' ? (
                        <FormInput as="select" label="الشريك" value={formData.partnerId} onChange={e => setFormData({...formData, partnerId: e.target.value})}>
                            <option value="">-- اختر --</option>
                            {PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </FormInput>
                    ) : (
                        <FormInput label="اسم الدائن" value={formData.lenderName} onChange={e => setFormData({...formData, lenderName: e.target.value})} />
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="مبلغ الدين" type="number" value={formData.principal} onChange={e => setFormData({...formData, principal: e.target.value})} />
                    <FormInput as="select" label="القناة (أين دخل المال)" value={formData.channel} onChange={e => setFormData({...formData, channel: e.target.value as any})}>
                        <option value="cash">كاش (الدرج)</option>
                        <option value="bank">بنك (تحويل)</option>
                    </FormInput>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="تاريخ البدء" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                    <FormInput label="عدد الدفعات" type="number" value={formData.installmentsCount} onChange={e => setFormData({...formData, installmentsCount: e.target.value})} />
                </div>
                
                <FormInput as="select" label="التكرار" value={formData.scheduleType} onChange={e => setFormData({...formData, scheduleType: e.target.value as any})}>
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                </FormInput>

                <FormInput label="سبب الدين" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleAddLoan}>حفظ وجدولة</Button>
                </div>
            </div>
        </Modal>

        {/* Pay Modal */}
        <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title="سداد دفعة">
            <div className="space-y-4">
                <FormInput label="المبلغ" type="number" value={payData.amount} onChange={e => setPayData({...payData, amount: e.target.value})} />
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="block text-sm font-bold text-gray-800 mb-2">طريقة السداد</label>
                    <div className="flex gap-2">
                        <button onClick={() => setPayData({...payData, channel: 'cash'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${payData.channel === 'cash' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600'}`}><Banknote size={14}/> كاش</button>
                        <button onClick={() => setPayData({...payData, channel: 'bank'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${payData.channel === 'bank' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}><Landmark size={14}/> بنك</button>
                    </div>
                </div>
                {payData.channel === 'bank' && (
                    <FormInput as="select" label="من حساب" value={payData.accountId} onChange={e => setPayData({...payData, accountId: e.target.value})}>
                        <option value="">-- اختر --</option>
                        {bankAccounts.filter(b=>b.active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </FormInput>
                )}
                <FormInput label="تاريخ السداد" type="date" value={payData.date} onChange={e => setPayData({...payData, date: e.target.value})} />
                
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={() => setPayModal(null)}>إلغاء</Button>
                    <Button onClick={handlePayInstallment}>تأكيد السداد</Button>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default PlaceLoansPage;
