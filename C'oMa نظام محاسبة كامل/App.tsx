
import React, { useState, useEffect, useMemo } from 'react';
import { Session, Record, ViewState, Drink, Order, DeviceStatus, PricingConfig, Expense, Purchase, InventorySnapshot, DrinkSize, DebtItem, DailyClosing, SystemState, OperationLog, InternetCard, BankAccount, OrderType, Transaction, DayCycle, MonthlyArchive, Customer, AuditLogItem, Discount, PlaceLoan, CashTransfer, LedgerEntry, TransactionType, FinancialChannel, PeriodLock } from './types';
import { generateId, calculateOrdersTotal, calculateOrdersCost, getCurrentTimeOnly, mergeDateAndTime, getLocalDate, getDaysInMonth, getDayOfMonth, formatCurrency, formatDuration, getArabicMonthName, calculateSessionSegments } from './utils';
import { calcRecordFinancials, calculateCustomerTransaction } from './accounting';
import { migrateLegacyDataToLedger, validateTransaction, createEntry, getLedgerTotals, calcLedgerInventory, calcEndDayPreviewFromLedger, checkLedgerIntegrity, validateOperation, GLOBAL_PARTNERS } from './accounting_core';

// Components
import Layout from './components/ui/Layout';
import Toast from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import RecordsList from './pages/RecordsList';
import Summary from './pages/Summary';
import Settings from './pages/Settings';
import CostAnalysis from './pages/CostAnalysis';
import ProfitDistribution from './pages/ProfitDistribution';
import InventoryArchive from './pages/InventoryArchive';
import DrinksPage from './pages/DrinksPage';
import ExpensesPage from './pages/ExpensesPage';
import PurchasesPage from './pages/PurchasesPage';
import PartnerDebtsPage from './pages/PartnerDebtsPage';
import InternetCardsPage from './pages/InternetCardsPage';
import TreasuryPage from './pages/TreasuryPage'; 
import VipCustomersPage from './pages/VipCustomersPage';
import PlaceLoansPage from './pages/PlaceLoansPage';
import PartnersPage from './pages/PartnersPage';
import BankAccountsPage from './pages/BankAccountsPage';
import LedgerViewerPage from './pages/LedgerViewerPage';
import AuditLogPage from './pages/AuditLogPage';
import BackupRestorePage from './pages/BackupRestorePage';

// Modals & UI
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import FormInput from './components/ui/FormInput';
import { ClipboardCheck, Archive, Wifi, Coffee, CheckCircle, AlertTriangle, User, Smartphone, Laptop, Clock, ChevronDown, Banknote, CreditCard, Coins, Lock, Calculator, Package, AlertCircle, Info, Star, RefreshCw, Activity, History, Percent, Search, ArrowRightLeft } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  
  // Data Stores
  const [sessions, setSessions] = useState<Session[]>(() => JSON.parse(localStorage.getItem('cw_sessions') || '[]'));
  const [records, setRecords] = useState<Record[]>(() => JSON.parse(localStorage.getItem('cw_records') || '[]'));
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => JSON.parse(localStorage.getItem('cw_audit_logs') || '[]'));

  const [drinks, setDrinks] = useState<Drink[]>(() => JSON.parse(localStorage.getItem('cw_drinks') || '[]'));
  const [internetCards, setInternetCards] = useState<InternetCard[]>(() => JSON.parse(localStorage.getItem('cw_internet_cards') || '[]'));
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => JSON.parse(localStorage.getItem('cw_bank_accounts') || '[]'));
  const [expenses, setExpenses] = useState<Expense[]>(() => JSON.parse(localStorage.getItem('cw_expenses') || '[]'));
  const [purchases, setPurchases] = useState<Purchase[]>(() => JSON.parse(localStorage.getItem('cw_purchases') || '[]'));
  const [inventorySnapshots, setInventorySnapshots] = useState<InventorySnapshot[]>(() => JSON.parse(localStorage.getItem('cw_inventory_snapshots') || '[]'));
  const [customers, setCustomers] = useState<Customer[]>(() => JSON.parse(localStorage.getItem('cw_customers') || '[]'));
  const [placeLoans, setPlaceLoans] = useState<PlaceLoan[]>(() => JSON.parse(localStorage.getItem('cw_place_loans') || '[]')); 
  const [cashTransfers, setCashTransfers] = useState<CashTransfer[]>(() => JSON.parse(localStorage.getItem('cw_cash_transfers') || '[]')); 
  
  const [periodLock, setPeriodLock] = useState<PeriodLock | null>(() => JSON.parse(localStorage.getItem('cw_period_lock') || 'null'));

  // --- SINGLE SOURCE OF TRUTH FOR MONEY ---
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => JSON.parse(localStorage.getItem('cw_ledger') || '[]'));

  const [dayCycles, setDayCycles] = useState<DayCycle[]>(() => JSON.parse(localStorage.getItem('cw_day_cycles') || '[]'));
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>(() => JSON.parse(localStorage.getItem('cw_daily_closings') || '[]'));
  
  const [systemState, setSystemState] = useState<SystemState>(() => {
      const stored = localStorage.getItem('cw_system_state');
      const today = getLocalDate();
      const currentMonth = today.slice(0, 7);
      
      if (stored) {
          const parsed = JSON.parse(stored);
          return {
              ...parsed,
              activeCycleId: parsed.activeCycleId || null,
              currentCycleStartTime: parsed.currentCycleStartTime || null,
              currentDate: parsed.currentDate || today,
              currentMonth: parsed.currentMonth || currentMonth,
              dayStatus: parsed.activeCycleId ? 'open' : 'closed'
          };
      }
      return { 
          currentDate: today, 
          currentMonth: currentMonth, 
          activeCycleId: null,
          currentCycleStartTime: null,
          dayStatus: 'closed', 
          monthStatus: 'open', 
          logs: [] 
      };
  });

  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(() => {
    return JSON.parse(localStorage.getItem('cw_pricing') || JSON.stringify({ 
      mobileRate: 10, laptopRate: 15, mobilePlaceCost: 0.5, laptopPlaceCost: 1.2, devPercent: 15 
    }));
  });

  const [debtsList, setDebtsList] = useState<DebtItem[]>(() => JSON.parse(localStorage.getItem('cw_partner_debts_list') || '[]'));
  const [integrityErrors, setIntegrityErrors] = useState<string[]>([]);

  // --- PERSISTENCE ---
  useEffect(() => localStorage.setItem('cw_sessions', JSON.stringify(sessions)), [sessions]);
  useEffect(() => localStorage.setItem('cw_records', JSON.stringify(records)), [records]);
  useEffect(() => localStorage.setItem('cw_audit_logs', JSON.stringify(auditLogs)), [auditLogs]);
  useEffect(() => localStorage.setItem('cw_drinks', JSON.stringify(drinks)), [drinks]);
  useEffect(() => localStorage.setItem('cw_internet_cards', JSON.stringify(internetCards)), [internetCards]);
  useEffect(() => localStorage.setItem('cw_bank_accounts', JSON.stringify(bankAccounts)), [bankAccounts]);
  useEffect(() => localStorage.setItem('cw_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('cw_purchases', JSON.stringify(purchases)), [purchases]);
  useEffect(() => localStorage.setItem('cw_pricing', JSON.stringify(pricingConfig)), [pricingConfig]);
  useEffect(() => localStorage.setItem('cw_inventory_snapshots', JSON.stringify(inventorySnapshots)), [inventorySnapshots]);
  useEffect(() => localStorage.setItem('cw_partner_debts_list', JSON.stringify(debtsList)), [debtsList]);
  useEffect(() => localStorage.setItem('cw_daily_closings', JSON.stringify(dailyClosings)), [dailyClosings]);
  useEffect(() => localStorage.setItem('cw_customers', JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem('cw_place_loans', JSON.stringify(placeLoans)), [placeLoans]);
  useEffect(() => localStorage.setItem('cw_cash_transfers', JSON.stringify(cashTransfers)), [cashTransfers]);
  useEffect(() => localStorage.setItem('cw_ledger', JSON.stringify(ledger)), [ledger]); 
  useEffect(() => localStorage.setItem('cw_period_lock', JSON.stringify(periodLock)), [periodLock]);
  
  useEffect(() => localStorage.setItem('cw_day_cycles', JSON.stringify(dayCycles)), [dayCycles]);
  useEffect(() => localStorage.setItem('cw_system_state', JSON.stringify(systemState)), [systemState]);

  // --- MIGRATION & SANITY CHECKS ---
  useEffect(() => {
      if (ledger.length === 0 && records.length > 0) {
          console.log("Running one-time migration to Central Ledger...");
          const migratedLedger = migrateLegacyDataToLedger(records, expenses, cashTransfers, debtsList, placeLoans);
          setLedger(migratedLedger);
          logAction('system', 'migration', 'MIGRATE_LEDGER', 'Migrated legacy data to Central Ledger');
          showToast('تم تحديث النظام المالي بنجاح (Migration)', 'success');
      }
      
      // Run sanity checks
      const errors = checkLedgerIntegrity(ledger);
      setIntegrityErrors(errors);
      if (errors.length > 0) {
          console.error("Sanity Check Failures:", errors);
      }
  }, [ledger]);

  const logAction = (entityType: any, entityId: string, action: string, details: string) => {
      const logItem: AuditLogItem = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          entityType,
          entityId,
          action,
          details
      };
      setAuditLogs(prev => [logItem, ...prev]);
  };

  // --- CENTRAL ACTION HANDLERS ---

  const handleAddExpense = (newExpense: Expense) => {
      try {
          // 1. Check Locks
          validateOperation(newExpense.date || getLocalDate(), periodLock);
          
          // 2. Validate Balance
          const channel = newExpense.paymentMethod || 'cash';
          validateTransaction(ledger, newExpense.amount, channel, newExpense.fromAccountId);
          
          const entry = createEntry(
              TransactionType.EXPENSE_OPERATIONAL,
              newExpense.amount,
              'out',
              channel,
              newExpense.name,
              newExpense.fromAccountId,
              newExpense.id,
              undefined,
              newExpense.date
          );
          setLedger(prev => [entry, ...prev]);
          setExpenses(prev => [...prev, newExpense]);
          logAction('ledger', entry.id, 'ADD_EXPENSE', `Added expense: ${newExpense.name} (${newExpense.amount})`);
          showToast('تم تسجيل المصروف بنجاح');
      } catch (err: any) {
          showToast(err.message, 'error');
      }
  };

  const handleAddPurchase = (newPurchase: Purchase, newExpense?: Expense) => {
      try {
          validateOperation(newPurchase.date, periodLock);

          if (newPurchase.fundingSource === 'place') {
              const channel = newPurchase.paymentMethod || 'cash';
              validateTransaction(ledger, newPurchase.amount, channel, newPurchase.fromAccountId);
              
              const entry = createEntry(
                  TransactionType.EXPENSE_PURCHASE,
                  newPurchase.amount,
                  'out',
                  channel,
                  `شراء: ${newPurchase.name}`,
                  newPurchase.fromAccountId,
                  newPurchase.id,
                  undefined,
                  newPurchase.date
              );
              setLedger(prev => [entry, ...prev]);
          }

          setPurchases(prev => [...prev, newPurchase]);
          if (newExpense) {
              setExpenses(prev => [...prev, newExpense]);
          }
          logAction('ledger', newPurchase.id, 'ADD_PURCHASE', `Added purchase: ${newPurchase.name}`);
          showToast('تم تسجيل المشتريات بنجاح');
      } catch (err: any) {
          showToast(err.message, 'error');
      }
  };

  const handlePayLoanInstallment = (updatedLoan: PlaceLoan, newExpense: Expense) => {
      try {
          validateOperation(newExpense.date || getLocalDate(), periodLock);
          const channel = newExpense.paymentMethod || 'cash';
          validateTransaction(ledger, newExpense.amount, channel, newExpense.fromAccountId);

          const entry = createEntry(
              TransactionType.LOAN_REPAYMENT,
              newExpense.amount,
              'out',
              channel,
              newExpense.name,
              newExpense.fromAccountId,
              newExpense.id,
              undefined,
              newExpense.date
          );
          setLedger(prev => [entry, ...prev]);

          setPlaceLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
          setExpenses(prev => [...prev, newExpense]);
          logAction('loan', updatedLoan.id, 'PAY_INSTALLMENT', `Paid ${newExpense.amount} for loan ${updatedLoan.lenderName}`);
          showToast('تم سداد القسط بنجاح');
      } catch (err: any) {
          showToast(err.message, 'error');
      }
  };

  const handleAddPartnerDebt = (newDebt: DebtItem) => {
      try {
          validateOperation(newDebt.date, periodLock);

          if (newDebt.debtSource === 'place' || !newDebt.debtSource) {
              const channel = newDebt.debtChannel || 'cash';
              const isRepayment = newDebt.amount < 0;
              const absAmount = Math.abs(newDebt.amount);

              if (!isRepayment) {
                  validateTransaction(ledger, absAmount, channel, newDebt.bankAccountId);
              }

              // Get partner name snapshot
              const partnerName = GLOBAL_PARTNERS.find(p => p.id === newDebt.partnerId)?.name || 'شريك غير معروف';

              const entry = createEntry(
                  isRepayment ? TransactionType.PARTNER_DEPOSIT : TransactionType.PARTNER_WITHDRAWAL,
                  absAmount,
                  isRepayment ? 'in' : 'out',
                  channel,
                  `${isRepayment ? 'إيداع/سداد' : 'سحب'} شريك: ${newDebt.note}`,
                  newDebt.bankAccountId,
                  newDebt.id,
                  newDebt.partnerId,
                  newDebt.date,
                  undefined,
                  partnerName
              );
              setLedger(prev => [entry, ...prev]);
          }

          setDebtsList(prev => [...prev, newDebt]);
          logAction('ledger', newDebt.id, 'ADD_PARTNER_DEBT', `Partner debt action: ${newDebt.amount}`);
          showToast('تم تسجيل الحركة بنجاح');
      } catch (err: any) {
          showToast(err.message, 'error');
      }
  };

  const handleAddCashTransfer = (newTransfer: CashTransfer) => {
      try {
          validateOperation(newTransfer.date, periodLock);

          if (!newTransfer.targetAccountId) {
              throw new Error('يجب تحديد الحساب البنكي المستقبل');
          }

          // 1. Validate Cash
          validateTransaction(ledger, newTransfer.amount, 'cash');

          // 2. Get Partner Name
          const partnerName = GLOBAL_PARTNERS.find(p => p.id === newTransfer.partnerId)?.name || 'شريك غير معروف';

          // 3. Create Balanced Entries
          const refId = generateId();
          
          const outEntry = createEntry(
              TransactionType.LIQUIDATION_TO_APP,
              newTransfer.amount,
              'out',
              'cash',
              `تسييل إلى التطبيق بواسطة ${partnerName}`,
              undefined,
              newTransfer.id,
              newTransfer.partnerId,
              newTransfer.date,
              refId,
              partnerName
          );

          const inEntry = createEntry(
              TransactionType.LIQUIDATION_TO_APP,
              newTransfer.amount,
              'in',
              'bank',
              `إيداع تسييل من الكاش بواسطة ${partnerName}`,
              newTransfer.targetAccountId,
              newTransfer.id,
              newTransfer.partnerId,
              newTransfer.date,
              refId,
              partnerName
          );

          setLedger(prev => [inEntry, outEntry, ...prev]);
          setCashTransfers(prev => [...prev, newTransfer]);
          logAction('ledger', refId, 'CASH_TRANSFER', `Liquidation: ${newTransfer.amount} by ${partnerName}`);
          showToast('تم تسييل المبلغ بنجاح');
      } catch (err: any) {
          showToast(err.message, 'error');
      }
  };

  // --- AUTO-ARCHIVE ---
  useEffect(() => {
      const realToday = getLocalDate();
      const realMonth = realToday.slice(0, 7);

      if (systemState.currentMonth !== realMonth) {
          handleAutoMonthArchive(systemState.currentMonth, realMonth);
      }
  }, []);

  const handleAutoMonthArchive = (oldMonth: string, newMonth: string) => {
      const start = oldMonth + '-01';
      const daysInOldMonth = getDaysInMonth(start);
      const end = oldMonth + '-' + (daysInOldMonth < 10 ? '0' : '') + daysInOldMonth;

      const exists = inventorySnapshots.some(s => s.periodStart === start && s.type === 'auto');
      
      if (!exists) {
          const preview = calcLedgerInventory(ledger, start, end, expenses, pricingConfig);
          if (preview) {
              const autoSnapshot: InventorySnapshot = {
                  ...preview,
                  type: 'auto', 
                  archiveId: `AUTO-${oldMonth}`,
              };
              setInventorySnapshots(prev => [...prev, autoSnapshot]);
              showToast(`تم أرشفة شهر ${oldMonth} تلقائياً`);
          }
      }

      setSystemState(prev => ({ 
          ...prev, 
          currentMonth: newMonth, 
          currentDate: getLocalDate(),
          logs: [...prev.logs, { id: generateId(), type: 'auto_month_archive', dateTime: new Date().toISOString(), notes: `Transitioned from ${oldMonth} to ${newMonth}` }]
      }));
  };

  // --- MODAL STATES ---
  const [modals, setModals] = useState({ addSession: false, checkout: false, addOrder: false, inventory: false, endDay: false, audit: false });
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  const [newSessionData, setNewSessionData] = useState({ name: '', phone: '', time: getCurrentTimeOnly(), device: 'mobile' as DeviceStatus, notes: '', isVIP: false });
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [checkoutData, setCheckoutData] = useState<{ 
      session: Session | null, 
      time: string, 
      cash: string, 
      bank: string, 
      bankAccountId: string,
      senderPhone: string,
      senderAccountName: string,
      excuse: string,
      discount: Discount | undefined
  }>({ 
      session: null, time: '', cash: '', bank: '', bankAccountId: '', senderPhone: '', senderAccountName: '', excuse: '', discount: undefined
  });

  const [orderData, setOrderData] = useState<{ 
      target: Session | Record | null, 
      orderIdToEdit: string | null, 
      type: OrderType, itemId: string, size: DrinkSize, qty: string, time: string 
  }>({ target: null, orderIdToEdit: null, type: 'drink', itemId: '', size: 'small', qty: '1', time: '' });
  
  const [endDayData, setEndDayData] = useState<any>(null);
  const [endDayNotes, setEndDayNotes] = useState('');

  const [inventoryRange, setInventoryRange] = useState({ start: '', end: getLocalDate() });
  const [inventoryPreview, setInventoryPreview] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };

  const onStartDayAction = () => {
      if (systemState.activeCycleId) {
          showToast('يوجد دورة مفتوحة بالفعل', 'error');
          return;
      }
      
      const now = new Date().toISOString();
      const newId = generateId();
      
      setSystemState(prev => ({
          ...prev,
          activeCycleId: newId,
          currentCycleStartTime: now,
          currentDate: getLocalDate(),
          dayStatus: 'open',
          logs: [...prev.logs, { id: generateId(), type: 'start_cycle', dateTime: now }]
      }));
      
      logAction('system', 'cycle', 'start_cycle', 'تم فتح دورة جديدة');
      showToast('تم فتح الدورة / اليوم بنجاح');
  };

  const onCloseDayAction = () => {
      if (!systemState.activeCycleId) {
          showToast('لا يوجد دورة يومية مفتوحة للإغلاق', 'error');
          return;
      }
      
      try {
          const preview = calcEndDayPreviewFromLedger(
              ledger,
              systemState.currentCycleStartTime!,
              bankAccounts,
              pricingConfig
          );
          setEndDayData(preview);
          setModals(m => ({ ...m, endDay: true }));
      } catch (e) {
          console.error("ACTION closeDay error", e);
          showToast('حدث خطأ أثناء تحضير إغلاق اليوم', 'error');
      }
  };

  const onInventoryAction = () => {
      try {
          const start = systemState.currentMonth + '-01'; 
          const end = getLocalDate(); 
          setInventoryRange({start, end});
          
          const preview = calcLedgerInventory(ledger, start, end, expenses, pricingConfig);
          
          if (preview) {
             setInventoryPreview(preview);
             setModals(m => ({...m, inventory: true}));
          } else {
             showToast('حدث خطأ في حساب الجرد', 'error');
          }
      } catch (error) {
          console.error("ACTION inventory error exception:", error);
          showToast('حدث خطأ غير متوقع أثناء الجرد', 'error');
      }
  };

  const handleViewAudit = () => {
      setModals(m => ({ ...m, audit: true }));
  };

  const handleResetToday = () => {
      const today = getLocalDate();
      
      // 1. Clear Active Sessions
      setSessions([]);

      // 2. Clear Records for Today
      setRecords(prev => prev.filter(r => {
          const rDate = r.startTime.split('T')[0];
          return rDate !== today;
      }));

      // 3. Clear Ledger for Today
      setLedger(prev => prev.filter(e => e.dateKey !== today));

      // 4. Clear related daily data stores (Optional but recommended for consistency if they are used elsewhere)
      setExpenses(prev => prev.filter(e => e.date !== today));
      setPurchases(prev => prev.filter(p => p.date !== today));
      setDebtsList(prev => prev.filter(d => d.date !== today));
      setCashTransfers(prev => prev.filter(t => t.date !== today));

      // 5. Reset Cycle State if it matches today
      if (systemState.currentDate === today) {
          setSystemState(prev => ({
              ...prev,
              activeCycleId: null,
              currentCycleStartTime: null,
              dayStatus: 'closed'
          }));
      }

      logAction('system', 'reset', 'RESET_TODAY', 'Manual reset of daily data');
      showToast('تم تصفير بيانات اليوم', 'success');
  };

  // --- CHECKOUT LOGIC ---
  const checkoutFinancials = useMemo(() => {
    if (!checkoutData.session || !modals.checkout) return null;
    const endIso = mergeDateAndTime(systemState.currentDate, checkoutData.time);
    const financials = calcRecordFinancials(checkoutData.session, endIso, pricingConfig, [], checkoutData.discount);
    const totalDue = Math.round(financials.totalInvoice || 0);
    const phone = checkoutData.session.customerPhone;
    const existingCustomer = customers.find(c => c.phone === phone);
    const customerSnapshot: Customer = existingCustomer || { 
        id: 'stub', name: checkoutData.session.customerName, phone: phone || 'unknown', 
        isVIP: false, creditBalance: 0, debtBalance: 0, createdAt: '' 
    };
    const cash = parseFloat(checkoutData.cash) || 0;
    const bank = parseFloat(checkoutData.bank) || 0;
    const result = calculateCustomerTransaction(totalDue, cash + bank, customerSnapshot);
    return { ...financials, ...result };
  }, [checkoutData, modals.checkout, pricingConfig, systemState.currentDate, customers]);

  const canSubmitCheckout = useMemo(() => {
      if (!checkoutData.session) return false;
      const bankVal = parseFloat(checkoutData.bank) || 0;
      if (bankVal > 0) {
          if (!checkoutData.bankAccountId || !checkoutData.senderPhone || !checkoutData.senderAccountName) return false;
      }
      return true;
  }, [checkoutData]);

  const filteredCustomers = useMemo(() => {
      if (!customerSearch.trim()) return [];
      return customers.filter(c => 
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
          c.phone.includes(customerSearch)
      ).slice(0, 5);
  }, [customerSearch, customers]);

  const handleSelectCustomer = (customer: Customer) => {
      setNewSessionData(prev => ({
          ...prev,
          name: customer.name,
          phone: customer.phone,
          isVIP: customer.isVIP,
          notes: customer.notes || ''
      }));
      setCustomerSearch(''); 
  };

  // --- ACTIONS ---

  const handleStartSession = () => {
      if (!newSessionData.name.trim() || !newSessionData.phone.trim()) { showToast('الاسم ورقم الجوال مطلوبان', 'error'); return; }
      if (!systemState.activeCycleId) { showToast('يجب فتح الدورة اليومية أولاً', 'error'); return; }

      const existingSession = sessions.find(s => s.customerPhone === newSessionData.phone);
      if (existingSession) {
          showToast('هذا الزبون لديه جلسة مفتوحة بالفعل. أغلق الجلسة الحالية أولاً.', 'error');
          return;
      }

      const startTimeIso = mergeDateAndTime(systemState.currentDate, newSessionData.time);
      const sessionId = generateId();
      
      const newSession: Session = {
          id: sessionId,
          customerName: newSessionData.name,
          customerPhone: newSessionData.phone,
          startTime: startTimeIso,
          deviceStatus: newSessionData.device,
          notes: newSessionData.notes,
          orders: [],
          events: []
      };
      
      const existingCustomer = customers.find(c => c.phone === newSessionData.phone);
      if (newSessionData.isVIP) {
          if (existingCustomer) {
              setCustomers(customers.map(c => c.id === existingCustomer.id ? { ...c, lastVisit: startTimeIso, isVIP: true } : c));
          } else {
              setCustomers([...customers, { 
                  id: generateId(), 
                  name: newSessionData.name, 
                  phone: newSessionData.phone, 
                  isVIP: true, 
                  creditBalance: 0, 
                  debtBalance: 0, 
                  createdAt: new Date().toISOString(),
                  lastVisit: startTimeIso 
              }]);
          }
      } else if (existingCustomer) {
          setCustomers(customers.map(c => c.id === existingCustomer.id ? { ...c, lastVisit: startTimeIso } : c));
      }

      setSessions(prev => [newSession, ...prev]);
      logAction('session', sessionId, 'start_session', `بدء جلسة ${newSession.deviceStatus === 'mobile' ? 'جوال' : 'لابتوب'}`);
      setNewSessionData({ name: '', phone: '', time: getCurrentTimeOnly(), device: 'mobile', notes: '', isVIP: false });
      setModals(m => ({ ...m, addSession: false }));
      showToast('تم بدء الجلسة');
  };

  const handleDeviceChange = (sessionId: string, newDevice: DeviceStatus) => {
      setSessions(prev => prev.map(s => {
          if (s.id !== sessionId) return s;
          if (s.deviceStatus === newDevice) return s;
          const now = new Date().toISOString();
          const newEvent = {
              id: generateId(),
              type: 'device_change' as const,
              timestamp: now,
              fromDevice: s.deviceStatus,
              toDevice: newDevice
          };
          logAction('session', s.id, 'device_change', `تغيير الجهاز من ${s.deviceStatus === 'mobile' ? 'جوال' : 'لابتوب'} إلى ${newDevice === 'mobile' ? 'جوال' : 'لابتوب'}`);
          return {
              ...s,
              deviceStatus: newDevice,
              events: [...(s.events || []), newEvent]
          };
      }));
      showToast(`تم تغيير الجهاز إلى ${newDevice === 'mobile' ? 'جوال' : 'لابتوب'}`);
  };

  const handleUndoEvent = (sessionId: string) => {
      setSessions(prev => prev.map(s => {
          if (s.id !== sessionId) return s;
          if (!s.events || s.events.length === 0) return s;
          const lastEvent = s.events[s.events.length - 1];
          const newDeviceStatus = lastEvent.fromDevice;
          const updatedEvents = s.events.slice(0, -1);
          logAction('session', s.id, 'undo_last_event', `تراجع عن آخر تغيير (${lastEvent.fromDevice === 'mobile' ? 'جوال' : 'لابتوب'} -> ${lastEvent.toDevice === 'mobile' ? 'جوال' : 'لابتوب'})`);
          return {
              ...s,
              deviceStatus: newDeviceStatus,
              events: updatedEvents
          };
      }));
      showToast('تم التراجع عن آخر تغيير بنجاح');
  };

  const prepareCheckout = (session: Session) => {
    setCheckoutData({
        session,
        time: getCurrentTimeOnly(),
        cash: '',
        bank: '',
        bankAccountId: '',
        senderPhone: session.customerPhone || '',
        senderAccountName: session.customerName || '',
        excuse: '',
        discount: undefined 
    });
    setModals({...modals, checkout: true});
  };

  const handleCompleteCheckout = () => {
    if (!checkoutData.session || !checkoutFinancials) return;
    if (!systemState.activeCycleId) { showToast('لا يمكن إنهاء الجلسة. النظام مغلق.', 'error'); return; }

    const endTimeIso = mergeDateAndTime(systemState.currentDate, checkoutData.time);
    const nowIso = new Date().toISOString();
    const dateKey = systemState.currentDate;
    
    // Check Period Lock
    try {
        validateOperation(dateKey, periodLock);
    } catch(err: any) {
        showToast(err.message, 'error');
        return;
    }

    const { totalDue, paidAmount, appliedCredit, createdDebt, createdCredit, settledDebt, finalCredit, finalDebt, isFullyPaid } = checkoutFinancials;
    const paidCash = parseFloat(checkoutData.cash) || 0;
    const paidBank = parseFloat(checkoutData.bank) || 0;

    const transactions: Transaction[] = [];
    const newEntries: LedgerEntry[] = [];
    
    // Ratios logic for reporting
    const totalInv = checkoutFinancials.sessionInvoice! + checkoutFinancials.drinksInvoice! + checkoutFinancials.internetCardsInvoice!;
    const sessionRatio = totalInv > 0 ? (checkoutFinancials.sessionInvoice! / totalInv) : 1;
    const productRatio = totalInv > 0 ? ((checkoutFinancials.drinksInvoice! + checkoutFinancials.internetCardsInvoice!) / totalInv) : 0;

    if (paidCash > 0) {
        if (productRatio > 0) {
             const cashSession = Math.round(paidCash * sessionRatio);
             const cashProduct = paidCash - cashSession;
             if (cashSession > 0) newEntries.push(createEntry(TransactionType.INCOME_SESSION, cashSession, 'in', 'cash', `جلسة: ${checkoutData.session.customerName}`, undefined, checkoutData.session.id, undefined, dateKey));
             if (cashProduct > 0) newEntries.push(createEntry(TransactionType.INCOME_PRODUCT, cashProduct, 'in', 'cash', `منتجات: ${checkoutData.session.customerName}`, undefined, checkoutData.session.id, undefined, dateKey));
        } else {
             newEntries.push(createEntry(TransactionType.INCOME_SESSION, paidCash, 'in', 'cash', `جلسة: ${checkoutData.session.customerName}`, undefined, checkoutData.session.id, undefined, dateKey));
        }
        transactions.push({ id: generateId(), date: nowIso, amount: paidCash, type: 'cash' });
    }

    if (paidBank > 0) {
        if (productRatio > 0) {
             const bankSession = Math.round(paidBank * sessionRatio);
             const bankProduct = paidBank - bankSession;
             if (bankSession > 0) newEntries.push(createEntry(TransactionType.INCOME_SESSION, bankSession, 'in', 'bank', `جلسة: ${checkoutData.session.customerName}`, checkoutData.bankAccountId, checkoutData.session.id, undefined, dateKey));
             if (bankProduct > 0) newEntries.push(createEntry(TransactionType.INCOME_PRODUCT, bankProduct, 'in', 'bank', `منتجات: ${checkoutData.session.customerName}`, checkoutData.bankAccountId, checkoutData.session.id, undefined, dateKey));
        } else {
             newEntries.push(createEntry(TransactionType.INCOME_SESSION, paidBank, 'in', 'bank', `جلسة: ${checkoutData.session.customerName}`, checkoutData.bankAccountId, checkoutData.session.id, undefined, dateKey));
        }
        transactions.push({ id: generateId(), date: nowIso, amount: paidBank, type: 'bank', bankAccountId: checkoutData.bankAccountId, senderPhone: checkoutData.senderPhone, senderAccountName: checkoutData.senderAccountName });
    }

    // Debt Creation
    if (createdDebt > 0) {
        newEntries.push(createEntry(TransactionType.DEBT_CREATE, createdDebt, 'in', 'receivable', `دين: ${checkoutData.session.customerName}`, undefined, checkoutData.session.id, undefined, dateKey));
    }

    if (appliedCredit > 0) transactions.push({ id: generateId(), date: nowIso, amount: appliedCredit, type: 'credit_usage', note: 'خصم من الرصيد السابق' });

    setLedger(prev => [...newEntries, ...prev]);
    // ----------------------

    let logNotes: string[] = [];
    const sessionPhone = checkoutData.session.customerPhone;
    const sessionName = checkoutData.session.customerName;
    const existingCustomer = customers.find(c => c.phone === sessionPhone);

    const updatePayload = {
        creditBalance: finalCredit,
        debtBalance: finalDebt,
        isVIP: existingCustomer?.isVIP || finalCredit > 0 || finalDebt > 0, 
        lastVisit: nowIso,
    };

    if (existingCustomer) {
        setCustomers(prev => prev.map(c => c.id === existingCustomer.id ? { ...c, ...updatePayload } : c));
    } else if (sessionPhone) {
        setCustomers(prev => [...prev, {
            id: generateId(),
            name: sessionName,
            phone: sessionPhone,
            isVIP: finalCredit > 0 || finalDebt > 0,
            createdAt: nowIso,
            notes: '',
            ...updatePayload
        }]);
    }

    if (appliedCredit > 0) logNotes.push(`استخدام رصيد: ${formatCurrency(appliedCredit)}`);
    if (createdDebt > 0) logNotes.push(`تسجيل دين جديد: ${formatCurrency(createdDebt)}`);
    if (settledDebt > 0) logNotes.push(`سداد دين سابق: ${formatCurrency(settledDebt)}`);
    if (finalCredit > 0) logNotes.push(`تسجيل رصيد: ${formatCurrency(finalCredit)}`);
    if (checkoutFinancials.discountApplied) logNotes.push(`خصم: ${formatCurrency(checkoutFinancials.discountApplied.amount)}`);

    logAction('session', checkoutData.session.id, 'checkout', `إغلاق الفاتورة: ${totalDue} | مدفوع: ${paidAmount}`);
    if (logNotes.length > 0) {
        setSystemState(prev => ({ 
            ...prev, 
            logs: [...prev.logs, { id: generateId(), type: 'invoice_closed', dateTime: nowIso, notes: logNotes.join(', ') }] 
        }));
    }

    const newRecord: Record = {
        id: checkoutData.session.id,
        customerName: checkoutData.session.customerName,
        customerPhone: checkoutData.session.customerPhone,
        startTime: checkoutData.session.startTime,
        endTime: endTimeIso,
        durationMinutes: checkoutFinancials.durationMinutes!,
        sessionInvoice: checkoutFinancials.sessionInvoice!,
        drinksInvoice: checkoutFinancials.drinksInvoice!,
        internetCardsInvoice: checkoutFinancials.internetCardsInvoice!,
        totalInvoice: totalDue,
        totalDue: totalDue,
        discountApplied: checkoutFinancials.discountApplied,
        placeCost: checkoutFinancials.placeCost!,
        drinksCost: checkoutFinancials.drinksCost!,
        internetCardsCost: checkoutFinancials.internetCardsCost!,
        grossProfit: checkoutFinancials.grossProfit!,
        devPercentSnapshot: checkoutFinancials.devPercentSnapshot!,
        devCut: checkoutFinancials.devCut!,
        netProfit: checkoutFinancials.netProfit!,
        paymentStatus: isFullyPaid ? 'paid' : 'customer_debt',
        isPaid: isFullyPaid,
        cashPaid: paidCash,
        bankPaid: paidBank,
        creditApplied: appliedCredit,
        createdDebt: createdDebt,
        createdCredit: createdCredit,
        settledDebt: settledDebt,
        bankAccountId: checkoutData.bankAccountId,
        bankAccountNameSnapshot: bankAccounts.find(b => b.id === checkoutData.bankAccountId)?.name,
        senderPhone: checkoutData.senderPhone,
        senderAccountName: checkoutData.senderAccountName,
        transactions: transactions,
        paidTotal: paidAmount + appliedCredit, 
        remainingDebt: createdDebt, 
        lastPaymentDate: paidAmount > 0 ? nowIso : undefined,
        excuse: checkoutData.excuse,
        timestamp: Date.now(),
        orders: checkoutData.session.orders,
        deviceStatus: checkoutData.session.deviceStatus,
        hourlyRateSnapshot: checkoutFinancials.hourlyRateSnapshot!,
        placeCostRateSnapshot: checkoutFinancials.placeCostRateSnapshot!,
        events: checkoutData.session.events,
        segmentsSnapshot: checkoutFinancials.segmentsSnapshot 
    };

    setRecords(prev => [newRecord, ...prev]);
    setSessions(prev => prev.filter(s => s.id !== checkoutData.session!.id));
    setModals({ ...modals, checkout: false });
    
    showToast(`تم حفظ الجلسة. ${logNotes.join(' | ')}`);
  };

  const handleRepayDebt = (recordId: string, amount: number, type: 'cash'|'bank', details?: any) => {
      try {
          validateOperation(getLocalDate(), periodLock);
          
          if (!systemState.activeCycleId) { showToast('النظام مغلق', 'error'); return; }
          
          const entry = createEntry(
              TransactionType.DEBT_PAYMENT,
              amount,
              'in',
              type,
              'سداد دين زبون',
              type === 'bank' ? details.bankAccountId : undefined,
              recordId,
              undefined,
              getLocalDate()
          );
          setLedger(prev => [entry, ...prev]);

          setRecords(prev => prev.map(r => {
              if (r.id !== recordId) return r;
              const newTx: Transaction = { id: generateId(), date: new Date().toISOString(), amount, type, ...details, note: 'سداد دين' };
              const newPaid = (r.paidTotal || 0) + amount;
              const newRemaining = Math.max(0, r.totalInvoice - newPaid);
              const cust = customers.find(c => c.phone === r.customerPhone);
              if (cust) {
                  setCustomers(curr => curr.map(c => c.id === cust.id ? { ...c, debtBalance: Math.max(0, c.debtBalance - amount) } : c));
              }
              logAction('session', recordId, 'debt_repayment', `سداد دين بقيمة ${amount} (${type})`);
              return { 
                  ...r, 
                  transactions: [...(r.transactions||[]), newTx], 
                  paidTotal: newPaid, 
                  remainingDebt: newRemaining, 
                  isPaid: newRemaining < 0.5,
                  cashPaid: type==='cash' ? r.cashPaid + amount : r.cashPaid,
                  bankPaid: type==='bank' ? r.bankPaid + amount : r.bankPaid
              };
          }));
          showToast('تم تسجيل الدفعة');
      } catch (err: any) {
          showToast(err.message, 'error');
      }
  };

  const handleConfirmEndDay = () => {
      if (!endDayData || !systemState.activeCycleId) return;
      
      const cycle: DayCycle = {
          id: systemState.activeCycleId,
          dateKey: systemState.currentDate,
          monthKey: systemState.currentMonth,
          startTime: systemState.currentCycleStartTime!,
          endTime: new Date().toISOString(),
          ...endDayData,
          notes: endDayNotes,
          createdAt: Date.now()
      };
      
      setDayCycles(prev => [...prev, cycle]);
      setSystemState(prev => ({ ...prev, activeCycleId: null, currentCycleStartTime: null, dayStatus: 'closed', logs: [...prev.logs, { id: generateId(), type: 'close_cycle', dateTime: new Date().toISOString() }] }));
      logAction('system', systemState.activeCycleId, 'close_cycle', 'إغلاق الدورة اليومية');
      setModals(m => ({ ...m, endDay: false }));
      showToast('تم إغلاق الدورة. يمكنك بدء دورة جديدة الآن.');
  };

  const handleArchiveInventory = () => {
      if (!inventoryPreview) return;
      const snap: InventorySnapshot = { 
          id: generateId(), 
          type: 'manual', 
          archiveId: `INV-${new Date().getFullYear()}-${inventorySnapshots.length+1}`, 
          ...inventoryPreview 
      };
      setInventorySnapshots(prev => [...prev, snap]);
      
      // Auto-Lock Period
      const lock: PeriodLock = {
          lockedUntil: inventoryRange.end,
          lockId: generateId(),
          createdAt: new Date().toISOString(),
          notes: 'Auto-locked after inventory archive'
      };
      setPeriodLock(lock);
      
      logAction('system', 'inventory', 'archive_month', `أرشفة يدوية للفترة ${inventoryRange.start} - ${inventoryRange.end}. تم قفل الفترة.`);
      setModals(m => ({...m, inventory: false}));
      showToast('تم الأرشفة وقفل الفترة المالية.');
  };
  
  // ... (Other handlers unchanged except adding validation where needed) ...
  // handleSaveOrder, handleEditOrder, handleDeleteOrder are for *active* sessions/records.
  // Since active sessions are today, they usually pass lock check if lockedUntil < today.
  // But strictly, we should check.

  const handleSaveOrder = () => { 
      if (!orderData.target) return;
      
      // Check Lock
      const targetDate = 'durationMinutes' in orderData.target ? (orderData.target as Record).endTime.split('T')[0] : systemState.currentDate;
      try {
          validateOperation(targetDate, periodLock);
      } catch (e: any) { showToast(e.message, 'error'); return; }

      const qty = parseInt(orderData.qty) || 1;
      let price=0, cost=0, name='';
      
      if(orderData.type==='drink') {
          const d = drinks.find(x=>x.id===orderData.itemId);
          if(!d) { showToast('الصنف غير موجود', 'error'); return; }
          name = d.name;
          if(orderData.size==='small') { price=d.smallPrice||0; cost=d.smallCost||0; }
          else { price=d.largePrice||0; cost=d.largeCost||0; }
      } else {
          const c = internetCards.find(x=>x.id===orderData.itemId);
          if(!c) { showToast('الصنف غير موجود', 'error'); return; }
          name = c.name; price=c.price; cost=c.cost;
      }
      
      const newOrder: Order = { id: orderData.orderIdToEdit || generateId(), type: orderData.type, itemId: orderData.itemId, itemName: name, size: orderData.type==='drink'?orderData.size:undefined, priceAtOrder: price, costAtOrder: cost, quantity: qty, timestamp: mergeDateAndTime(systemState.currentDate, orderData.time) };
      
      logAction('session', orderData.target.id, orderData.orderIdToEdit ? 'edit_order' : 'add_order', `${orderData.orderIdToEdit ? 'تعديل' : 'إضافة'} طلب: ${name} (${qty})`);

      if('durationMinutes' in orderData.target) {
          setRecords(prev => prev.map(r => {
              if(r.id!==orderData.target!.id) return r;
              const ords = orderData.orderIdToEdit ? r.orders.map(o=>o.id===orderData.orderIdToEdit?newOrder:o) : [...r.orders, newOrder];
              const fins = calcRecordFinancials(r as any, r.endTime, pricingConfig, ords, r.discountApplied);
              return { ...r, ...fins, orders: ords, totalInvoice: fins.totalInvoice||0, remainingDebt: Math.max(0, (fins.totalInvoice||0) - r.paidTotal) };
          }));
      } else {
          setSessions(prev => prev.map(s => s.id===orderData.target!.id ? { ...s, orders: orderData.orderIdToEdit ? s.orders.map(o=>o.id===orderData.orderIdToEdit?newOrder:o) : [...s.orders, newOrder] } : s));
      }
      setModals(m=>({...m, addOrder:false})); showToast('تم حفظ الطلب');
  };

  const handleEditOrder = (s: Session | Record, o: Order) => {
      setOrderData({ target: s, orderIdToEdit: o.id, type: o.type, itemId: o.itemId, size: o.size||'small', qty: o.quantity.toString(), time: new Date(o.timestamp).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) });
      setModals(m=>({...m, addOrder:true}));
  };

  const handleDeleteOrder = (target: any, orderId: string) => {
    // Lock Check
    const targetDate = 'durationMinutes' in target ? (target as Record).endTime.split('T')[0] : systemState.currentDate;
    try { validateOperation(targetDate, periodLock); } catch(e: any) { showToast(e.message, 'error'); return; }

    const isRecord = 'durationMinutes' in target;
    logAction('session', target.id, 'delete_order', `حذف طلب ${orderId}`);
    
    if (isRecord) {
        const record = target as Record;
        setRecords(prev => prev.map(r => {
            if (r.id !== record.id) return r;
            const updatedOrders = r.orders.filter(o => o.id !== orderId);
            const financials = calcRecordFinancials(r as any, r.endTime, pricingConfig, updatedOrders, r.discountApplied);
            const newTotal = financials.totalInvoice || 0;
            const newRemaining = newTotal - r.paidTotal;
            return {
                ...r,
                ...financials, 
                orders: updatedOrders,
                totalInvoice: newTotal,
                remainingDebt: newRemaining,
                isPaid: newRemaining <= 0.5 
            };
        }));
        showToast('تم حذف الطلب وتحديث السجل');
    } else {
        setSessions(prev => prev.map(s => {
            if (s.id !== target.id) return s;
            return { ...s, orders: s.orders.filter(o => o.id !== orderId) };
        }));
        showToast('تم حذف الطلب');
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={setActiveView} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen}>
       {toast && <Toast msg={toast.msg} type={toast.type} />}
       
       {integrityErrors.length > 0 && (
           <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-pulse-slow">
               <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
               <div>
                   <h3 className="text-red-800 font-bold text-lg">تنبيه: مشاكل في سلامة البيانات</h3>
                   <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                       {integrityErrors.map((err, i) => <li key={i}>{err}</li>)}
                   </ul>
               </div>
           </div>
       )}

       {periodLock && (
           <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
               <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
                   <Lock size={16}/> 
                   <span>النظام مغلق للعمليات المالية قبل تاريخ: {periodLock.lockedUntil}</span>
               </div>
               {adminMode && (
                   <button onClick={() => { logAction('lock', periodLock.lockId, 'UNLOCK', 'Admin unlocked period'); setPeriodLock(null); }} className="text-xs text-amber-600 underline">
                       فتح القفل (Admin)
                   </button>
               )}
           </div>
       )}
       
       {activeView === 'dashboard' && <Dashboard 
          sessions={sessions} 
          records={records}
          dayCycles={dayCycles}
          onAddCustomer={() => { setCustomerSearch(''); setNewSessionData({name:'', phone:'', time: getCurrentTimeOnly(), device:'mobile', notes:'', isVIP: false}); setModals(prev => ({...prev, addSession: true})); }} 
          onCheckout={prepareCheckout} 
          onAddDrink={(s) => { setOrderData({target:s, orderIdToEdit:null, type:'drink', itemId:'', size:'small', qty:'1', time:getCurrentTimeOnly()}); setModals(m=>({...m, addOrder:true})); }} 
          onEditOrder={handleEditOrder} 
          onDeleteOrder={(s, oid) => handleDeleteOrder(s, oid)} 
          onDeviceChange={handleDeviceChange}
          onUndoEvent={handleUndoEvent}
          onNavigate={setActiveView} 
          systemState={systemState} 
          onStartNewDay={onStartDayAction} 
          onCloseDay={onCloseDayAction} 
          onInventory={onInventoryAction} 
          onStartNewMonth={() => {}} 
          customers={customers} 
          pricingConfig={pricingConfig}
          onViewAudit={handleViewAudit} 
          ledger={ledger}
       />}
       
       {activeView === 'partners' && <PartnersPage snapshots={inventorySnapshots} purchases={purchases} debts={debtsList} placeLoans={placeLoans} cashTransfers={cashTransfers} ledger={ledger} />} 
       {activeView === 'place_loans' && (
           <PlaceLoansPage 
                loans={placeLoans} 
                onUpdateLoans={setPlaceLoans} 
                bankAccounts={bankAccounts} 
                expenses={expenses} 
                onUpdateExpenses={setExpenses} 
                onAddLoan={(loan) => setPlaceLoans([...placeLoans, loan])} 
                onPayInstallment={handlePayLoanInstallment} 
            />
        )}
       {activeView === 'records' && (
           <RecordsList 
                records={records} 
                dailyClosings={dailyClosings} 
                bankAccounts={bankAccounts} 
                onRepayDebt={handleRepayDebt} 
                systemState={systemState} 
                onStartNewDay={onStartDayAction} 
                onEditOrder={handleEditOrder} 
                onDeleteOrder={(r, oid) => handleDeleteOrder(r, oid)} 
                onCloseDay={onCloseDayAction} 
            />
        )}
       {activeView === 'summary' && <Summary records={records} onResetToday={handleResetToday} onCloseDay={onCloseDayAction} ledger={ledger} />} 
       {activeView === 'cost_analysis' && <CostAnalysis dayCycles={dayCycles} systemState={systemState} onInventory={onInventoryAction} ledger={ledger} />} 
       {activeView === 'treasury' && (
           <TreasuryPage 
                records={records} 
                accounts={bankAccounts} 
                onUpdateAccounts={setBankAccounts} 
                cashTransfers={cashTransfers} 
                onUpdateCashTransfers={setCashTransfers}
                expenses={expenses}
                purchases={purchases}
                debtsList={debtsList}
                pricingConfig={pricingConfig}
                placeLoans={placeLoans}
                systemState={systemState}
                onAddTransfer={handleAddCashTransfer} 
                ledger={ledger}
            />
       )}
       {activeView === 'vip_customers' && <VipCustomersPage customers={customers} onUpdateCustomers={setCustomers} />}
       {activeView === 'drinks' && <DrinksPage drinks={drinks} onAdd={d => setDrinks([...drinks, d])} onUpdate={d => setDrinks(drinks.map(x=>x.id===d.id?d:x))} onDelete={id => setDrinks(drinks.filter(d=>d.id!==id))} />}
       {activeView === 'internet_cards' && <InternetCardsPage cards={internetCards} onAdd={c => setInternetCards([...internetCards, c])} onUpdate={c => setInternetCards(internetCards.map(x=>x.id===c.id?c:x))} onDelete={id => setInternetCards(internetCards.filter(c=>c.id!==id))} />}
       {activeView === 'expenses' && (
           <ExpensesPage 
                expenses={expenses} 
                onUpdateExpenses={setExpenses} 
                bankAccounts={bankAccounts} 
                onAddExpense={handleAddExpense} 
            />
        )}
       {activeView === 'purchases' && (
           <PurchasesPage 
                purchases={purchases} 
                onUpdatePurchases={setPurchases} 
                expenses={expenses} 
                onUpdateExpenses={setExpenses} 
                bankAccounts={bankAccounts} 
                onAddPurchase={handleAddPurchase} 
            />
        )}
       {activeView === 'partner_debts' && (
           <PartnerDebtsPage 
                debtsList={debtsList} 
                onUpdateDebtsList={setDebtsList} 
                bankAccounts={bankAccounts}
                onAddDebt={handleAddPartnerDebt} 
            />
        )}
       {activeView === 'profit_dist' && <ProfitDistribution records={records} purchases={purchases} debtsList={debtsList} expenses={expenses} pricingConfig={pricingConfig} placeLoans={placeLoans} ledger={ledger} />}
       {activeView === 'inventory_archive' && (
           <InventoryArchive 
                snapshots={inventorySnapshots} 
                onUpdateSnapshots={setInventorySnapshots}
                records={records} 
                expenses={expenses}
                purchases={purchases}
                debtsList={debtsList}
                pricingConfig={pricingConfig}
                placeLoans={placeLoans}
                onDelete={(id) => setInventorySnapshots(inventorySnapshots.filter(s => s.id !== id))} 
                systemState={systemState}
                ledger={ledger} 
            />
       )}
       {activeView === 'settings' && <Settings pricingConfig={pricingConfig} onUpdatePricing={setPricingConfig} />}
       {activeView === 'ledger_viewer' && <LedgerViewerPage ledger={ledger} />}
       {activeView === 'audit_log' && <AuditLogPage logs={auditLogs} />}
       {activeView === 'backup_restore' && <BackupRestorePage />}
       
       {/* Add Session Modal */}
       <Modal isOpen={modals.addSession} onClose={() => setModals(prev => ({...prev, addSession: false}))} title="جلسة جديدة" description="تسجيل دخول زبون جديد">
           <div className="space-y-4">
               <div className="relative mb-2">
                   <div className="relative">
                       <Search className="absolute right-3 top-3 text-gray-400" size={16} />
                       <input 
                           type="text" 
                           placeholder="بحث عن زبون مسجل (اسم أو جوال)..." 
                           value={customerSearch}
                           onChange={e => setCustomerSearch(e.target.value)}
                           className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-10 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                       />
                   </div>
                   {filteredCustomers.length > 0 && (
                       <div className="absolute z-20 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-40 overflow-y-auto">
                           {filteredCustomers.map(c => (
                               <div 
                                   key={c.id} 
                                   onClick={() => handleSelectCustomer(c)}
                                   className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center"
                               >
                                   <div>
                                       <div className="font-bold text-sm text-gray-800">{c.name}</div>
                                       <div className="text-xs text-gray-500">{c.phone}</div>
                                   </div>
                                   {c.isVIP && <Star size={14} className="text-yellow-500 fill-yellow-500"/>}
                               </div>
                           ))}
                       </div>
                   )}
               </div>

               <FormInput label="اسم الزبون" placeholder="الاسم" value={newSessionData.name} onChange={e => setNewSessionData({...newSessionData, name: e.target.value})} />
               <FormInput label="رقم الجوال" type="tel" placeholder="05xxxxxxxx" value={newSessionData.phone} onChange={e => setNewSessionData({...newSessionData, phone: e.target.value})} />
               <FormInput label="وقت الدخول" type="time" value={newSessionData.time} onChange={e => setNewSessionData({...newSessionData, time: e.target.value})} />
               
               <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                   <label className="block text-sm font-bold text-gray-800 mb-2">نوع الجهاز</label>
                   <div className="flex gap-2">
                       <button onClick={() => setNewSessionData({...newSessionData, device: 'mobile'})} className={`flex-1 py-2 text-sm font-bold rounded ${newSessionData.device === 'mobile' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>جوال فقط</button>
                       <button onClick={() => setNewSessionData({...newSessionData, device: 'laptop'})} className={`flex-1 py-2 text-sm font-bold rounded ${newSessionData.device === 'laptop' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>لابتوب</button>
                   </div>
               </div>

               <div className="flex items-center gap-2 cursor-pointer" onClick={() => setNewSessionData({...newSessionData, isVIP: !newSessionData.isVIP})}>
                   <input type="checkbox" checked={newSessionData.isVIP} onChange={() => {}} className="w-5 h-5 accent-indigo-600" />
                   <span className="text-sm font-bold text-gray-800">زبون مميز (VIP)</span>
               </div>

               <FormInput label="ملاحظات" placeholder="اختياري" value={newSessionData.notes} onChange={e => setNewSessionData({...newSessionData, notes: e.target.value})} />

               <div className="flex justify-end gap-3 pt-2">
                   <Button variant="secondary" onClick={() => setModals(prev => ({...prev, addSession: false}))}>إلغاء</Button>
                   <Button onClick={handleStartSession}>بدء الجلسة</Button>
               </div>
           </div>
       </Modal>

       {/* Add Order Modal */}
       <Modal isOpen={modals.addOrder} onClose={() => setModals(prev => ({...prev, addOrder: false}))} title={orderData.orderIdToEdit ? "تعديل طلب" : "إضافة طلب"}>
           <div className="space-y-4">
               <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                   <button onClick={() => setOrderData({...orderData, type: 'drink', itemId: '', size: 'small'})} className={`flex-1 py-2 text-xs font-bold rounded ${orderData.type === 'drink' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>مشروبات</button>
                   <button onClick={() => setOrderData({...orderData, type: 'internet_card', itemId: ''})} className={`flex-1 py-2 text-xs font-bold rounded ${orderData.type === 'internet_card' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>بطاقات نت</button>
               </div>

               {orderData.type === 'drink' ? (
                   <>
                       <FormInput as="select" label="المشروب" value={orderData.itemId} onChange={e => {
                           const d = drinks.find(x => x.id === e.target.value);
                           let size: DrinkSize = 'small';
                           if (d && d.availability === 'large') size = 'large';
                           setOrderData({...orderData, itemId: e.target.value, size});
                       }}>
                           <option value="">-- اختر --</option>
                           {drinks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </FormInput>
                       
                       {orderData.itemId && (
                           <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                               <label className="block text-sm font-bold text-gray-800 mb-2">الحجم</label>
                               <div className="flex gap-2">
                                   {(() => {
                                       const d = drinks.find(x => x.id === orderData.itemId);
                                       if (!d) return null;
                                       return (
                                           <>
                                               {(d.availability === 'small' || d.availability === 'both') && (
                                                   <button onClick={() => setOrderData({...orderData, size: 'small'})} className={`flex-1 py-2 text-xs font-bold rounded ${orderData.size === 'small' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>صغير ({formatCurrency(d.smallPrice || 0)})</button>
                                               )}
                                               {(d.availability === 'large' || d.availability === 'both') && (
                                                   <button onClick={() => setOrderData({...orderData, size: 'large'})} className={`flex-1 py-2 text-xs font-bold rounded ${orderData.size === 'large' ? 'bg-orange-600 text-white' : 'bg-white border text-gray-600'}`}>كبير ({formatCurrency(d.largePrice || 0)})</button>
                                               )}
                                           </>
                                       );
                                   })()}
                               </div>
                           </div>
                       )}
                   </>
               ) : (
                   <FormInput as="select" label="نوع البطاقة" value={orderData.itemId} onChange={e => setOrderData({...orderData, itemId: e.target.value})}>
                       <option value="">-- اختر --</option>
                       {internetCards.map(c => <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.price)})</option>)}
                   </FormInput>
               )}

               <div className="grid grid-cols-2 gap-4">
                   <FormInput label="الكمية" type="number" min="1" value={orderData.qty} onChange={e => setOrderData({...orderData, qty: e.target.value})} />
                   <FormInput label="الوقت" type="time" value={orderData.time} onChange={e => setOrderData({...orderData, time: e.target.value})} />
               </div>

               <div className="flex justify-end gap-3 pt-2">
                   <Button variant="secondary" onClick={() => setModals(prev => ({...prev, addOrder: false}))}>إلغاء</Button>
                   <Button onClick={handleSaveOrder}>حفظ الطلب</Button>
               </div>
           </div>
       </Modal>

       {/* Checkout Modal */}
       <Modal isOpen={modals.checkout} onClose={() => setModals({...modals, checkout: false})} title="إغلاق الحساب" description="تفاصيل الفاتورة والدفع">
            {checkoutData.session && checkoutFinancials && (
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <h3 className="font-bold text-gray-900">{checkoutData.session.customerName}</h3>
                            <span className="text-sm font-bold bg-white px-2 py-1 rounded border">{formatDuration(checkoutFinancials.durationMinutes || 0)}</span>
                        </div>

                        {checkoutData.session.events && checkoutData.session.events.length > 0 && (
                           <div className="mb-4 bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                               <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                                   <ArrowRightLeft size={12}/> سجل التنقلات
                               </p>
                               <div className="space-y-2 text-xs relative before:absolute before:right-1.5 before:top-1 before:bottom-1 before:w-0.5 before:bg-gray-100">
                                   <div className="relative pr-4 flex justify-between items-center text-gray-500">
                                       <span className="absolute right-0 top-1 w-3 h-3 bg-gray-200 rounded-full border-2 border-white"></span>
                                       <span>بداية الجلسة ({checkoutData.session.events[0].fromDevice === 'mobile' ? 'جوال' : 'لابتوب'})</span>
                                       <span className="font-mono">{new Date(checkoutData.session.startTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                                   </div>
                                   {checkoutData.session.events.map((e, idx) => (
                                       <div key={e.id} className="relative pr-4 flex justify-between items-center font-medium text-gray-800">
                                           <span className="absolute right-0 top-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></span>
                                           <span>تحويل إلى {e.toDevice === 'mobile' ? 'جوال' : 'لابتوب'}</span>
                                           <span className="font-mono">{new Date(e.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                                       </div>
                                   ))}
                               </div>
                           </div>
                        )}

                        <div className="space-y-2 text-sm bg-white p-3 rounded-lg border border-gray-100">
                             <div className="flex justify-between">
                                 <span className="text-gray-600">الجلسة</span>
                                 <span className="font-bold">{formatCurrency(checkoutFinancials.sessionInvoice || 0)}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-gray-600">الطلبات</span>
                                 <span className="font-bold">{formatCurrency((checkoutFinancials.drinksInvoice || 0) + (checkoutFinancials.internetCardsInvoice || 0))}</span>
                             </div>
                             
                             <div className="pt-2 border-t border-dashed mt-2">
                                 <div className="flex justify-between items-center mb-2">
                                     <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Percent size={12}/> خصم</span>
                                     {checkoutData.discount && (
                                         <button onClick={() => setCheckoutData({...checkoutData, discount: undefined})} className="text-[10px] text-red-500 underline">إلغاء الخصم</button>
                                     )}
                                 </div>
                                 <div className="flex gap-2">
                                     {[5, 10, 15, 20].map(pct => (
                                         <button 
                                            key={pct}
                                            onClick={() => setCheckoutData({...checkoutData, discount: { type: 'percent', value: pct, amount: 0, locked: false }})}
                                            className={`flex-1 py-1 text-xs rounded border ${checkoutData.discount?.type === 'percent' && checkoutData.discount.value === pct ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                         >
                                             {pct}%
                                         </button>
                                     ))}
                                 </div>
                                 {checkoutFinancials.discountApplied && (
                                     <div className="flex justify-between text-red-600 font-bold mt-2 bg-red-50 px-2 py-1 rounded">
                                         <span>قيمة الخصم</span>
                                         <span>-{formatCurrency(checkoutFinancials.discountApplied.amount)}</span>
                                     </div>
                                 )}
                             </div>

                             <div className="pt-2 border-t border-gray-200 flex justify-between text-lg font-bold text-indigo-700">
                                 <span>الإجمالي المستحق</span>
                                 <span>{formatCurrency(checkoutFinancials.totalDue || 0)}</span>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <FormInput label="وقت الخروج" type="time" value={checkoutData.time} onChange={e => setCheckoutData({...checkoutData, time: e.target.value})} />
                        
                        {checkoutFinancials.appliedCredit > 0 && (
                            <div className="bg-green-50 p-2 rounded border border-green-100 text-green-800 text-sm flex justify-between items-center">
                                <span><CreditCard size={14} className="inline mr-1"/> تم خصم من الرصيد السابق:</span>
                                <span className="font-bold">-{formatCurrency(checkoutFinancials.appliedCredit)}</span>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="مدفوع نقدي (كاش)" type="number" unit="₪" value={checkoutData.cash} onChange={e => setCheckoutData({...checkoutData, cash: e.target.value})} placeholder="0" />
                            <FormInput label="مدفوع بنكي" type="number" unit="₪" value={checkoutData.bank} onChange={e => setCheckoutData({...checkoutData, bank: e.target.value})} placeholder="0" />
                        </div>

                        {parseFloat(checkoutData.bank) > 0 && (
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 animate-fade-in">
                                 <FormInput as="select" label="البنك المستلم (إلى)" value={checkoutData.bankAccountId} onChange={e => setCheckoutData({...checkoutData, bankAccountId: e.target.value})} className="mb-2" error={!checkoutData.bankAccountId ? 'مطلوب' : ''}>
                                    <option value="">-- اختر الحساب --</option>
                                    {bankAccounts.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                                 </FormInput>
                                 <FormInput label="رقم جوال المرسل" value={checkoutData.senderPhone} onChange={e => setCheckoutData({...checkoutData, senderPhone: e.target.value})} className="mb-2" error={!checkoutData.senderPhone ? 'مطلوب' : ''} />
                                 <FormInput label="اسم حساب المرسل" value={checkoutData.senderAccountName} onChange={e => setCheckoutData({...checkoutData, senderAccountName: e.target.value})} error={!checkoutData.senderAccountName ? 'مطلوب' : ''} />
                             </div>
                        )}

                        <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs space-y-1">
                             {checkoutFinancials.createdCredit > 0 && <div className="text-green-600 font-bold">سيتم إضافة رصيد للزبون: {formatCurrency(checkoutFinancials.createdCredit)}</div>}
                             {checkoutFinancials.createdDebt > 0 && <div className="text-red-600 font-bold">سيتم تسجيل دين على الزبون: {formatCurrency(checkoutFinancials.createdDebt)}</div>}
                             {checkoutFinancials.settledDebt > 0 && <div className="text-gray-600">سيتم تسوية ديون سابقة بقيمة: {formatCurrency(checkoutFinancials.settledDebt)}</div>}
                        </div>

                        <FormInput label="ملاحظة / سبب الدين" value={checkoutData.excuse} onChange={e => setCheckoutData({...checkoutData, excuse: e.target.value})} placeholder="اختياري..." />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => setModals({...modals, checkout: false})}>إلغاء</Button>
                        <Button onClick={handleCompleteCheckout} disabled={!canSubmitCheckout}>تأكيد وحفظ</Button>
                    </div>
                </div>
            )}
       </Modal>

       {/* End Day Modal */}
       <Modal isOpen={modals.endDay} onClose={() => setModals({...modals, endDay: false})} title="إغلاق اليوم (الدورة الحالية)" description="ملخص الدورة (محسوب من السجل المالي)">
           {endDayData && (
               <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                       <div className="bg-emerald-50 p-3 rounded border border-emerald-100 text-center">
                           <span className="block text-xs text-gray-500">إجمالي الإيراد</span>
                           <span className="block text-xl font-bold text-emerald-700">{formatCurrency(endDayData.totalRevenue)}</span>
                       </div>
                       <div className="bg-red-50 p-3 rounded border border-red-100 text-center">
                           <span className="block text-xs text-gray-500">إجمالي الديون</span>
                           <span className="block text-xl font-bold text-red-700">{formatCurrency(endDayData.totalDebt)}</span>
                       </div>
                   </div>
                   
                   <div className="space-y-2 text-sm bg-gray-50 p-3 rounded border border-gray-100">
                       <div className="flex justify-between"><span>كاش في الصندوق</span><span className="font-bold">{formatCurrency(endDayData.cashRevenue)}</span></div>
                       <div className="flex justify-between"><span>تحويلات بنكية</span><span className="font-bold">{formatCurrency(endDayData.bankRevenue)}</span></div>
                       <div className="border-t border-gray-200 my-1 pt-1"></div>
                       <div className="flex justify-between"><span>عدد السجلات (تقريبي)</span><span className="font-bold">{endDayData.recordCount}</span></div>
                       <div className="flex justify-between text-xs text-gray-500"><span>صافي الكاش (بعد المصاريف)</span><span className="font-mono">{formatCurrency(endDayData.netCashFlow)}</span></div>
                   </div>

                   <FormInput label="ملاحظات الإغلاق" as="textarea" value={endDayNotes} onChange={e => setEndDayNotes(e.target.value)} placeholder="أي ملاحظات حول الدورة..." />
                   
                   <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                       <Button variant="secondary" onClick={() => setModals({...modals, endDay: false})}>إلغاء</Button>
                       <Button className="bg-red-600 hover:bg-red-700" onClick={handleConfirmEndDay}>تأكيد الإغلاق</Button>
                   </div>
               </div>
           )}
       </Modal>

       <Modal isOpen={modals.audit} onClose={() => setModals(prev => ({...prev, audit: false}))} title="سجل العمليات (Audit Log)">
           <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
               {auditLogs.length === 0 ? <p className="text-center text-gray-400">لا يوجد سجلات</p> : 
                 auditLogs.map(log => (
                     <div key={log.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                         <div className="flex justify-between text-xs text-gray-500 mb-1">
                             <span>{new Date(log.timestamp).toLocaleString('ar-SA')}</span>
                             <span className="uppercase font-bold tracking-wider">{log.action}</span>
                         </div>
                         <div className="font-medium text-gray-800">{log.details}</div>
                         <div className="text-xs text-gray-400 mt-1">ID: {log.entityId}</div>
                     </div>
                 ))
               }
           </div>
           <div className="flex justify-end pt-4">
               <Button onClick={() => setModals(prev => ({...prev, audit: false}))}>إلغاء</Button>
           </div>
       </Modal>

       <Modal isOpen={modals.inventory} onClose={() => setModals({...modals, inventory: false})} title="الجرد الشهري والأرشفة">
           {inventoryPreview && (
               <div className="space-y-6">
                   <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                       <p className="text-sm text-purple-800 font-bold mb-1">صافي الربح القابل للتوزيع</p>
                       <p className="text-3xl font-extrabold text-purple-900">{formatCurrency(inventoryPreview.netProfitPaid)}</p>
                       <p className="text-xs text-purple-600 mt-2">بعد خصم المصاريف ({formatCurrency(inventoryPreview.totalExpenses)}) ونسبة التطوير ({formatCurrency(inventoryPreview.devCut)})</p>
                   </div>
                   
                   <div className="overflow-x-auto">
                       <table className="w-full text-right text-xs">
                           <thead className="bg-gray-50 text-gray-500">
                               <tr>
                                   <th className="p-2">الشريك</th>
                                   <th className="p-2">الحصة</th>
                                   <th className="p-2">مشتريات (+)</th>
                                   <th className="p-2">ديون (-)</th>
                                   <th className="p-2">سداد قروض (+)</th>
                                   <th className="p-2">الصافي</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                               {inventoryPreview.partners.map((p: any) => (
                                   <tr key={p.name}>
                                       <td className="p-2 font-bold">{p.name}</td>
                                       <td className="p-2">{formatCurrency(p.baseShare)}</td>
                                       <td className="p-2 text-green-600">{formatCurrency(p.purchasesReimbursement)}</td>
                                       <td className="p-2 text-red-600">{formatCurrency(p.placeDebtDeducted)}</td>
                                       <td className="p-2 text-blue-600">{formatCurrency(p.loanRepaymentCash + p.loanRepaymentBank)}</td>
                                       <td className="p-2 font-bold bg-gray-50">{formatCurrency(p.finalPayoutTotal)}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
                   
                   <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                       <Button variant="secondary" onClick={() => setModals({...modals, inventory: false})}>إلغاء</Button>
                       <Button className="bg-indigo-600" onClick={handleArchiveInventory}>تأكيد وأرشفة وقفل</Button>
                   </div>
               </div>
           )}
       </Modal>
    </Layout>
  );
};

export default App;
