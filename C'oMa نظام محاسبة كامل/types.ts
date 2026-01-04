

export type DrinkAvailability = 'small' | 'large' | 'both';
export type DrinkSize = 'small' | 'large';

export const SCHEMA_VERSION = 1;

// --- CENTRAL LEDGER TYPES (The New Financial Core) ---

export enum TransactionType {
    // Income (Real Money)
    INCOME_SESSION = 'INCOME_SESSION',
    INCOME_PRODUCT = 'INCOME_PRODUCT', 
    DEBT_PAYMENT = 'DEBT_PAYMENT', // Customer paying old debt
    
    // Debt Tracking (Not Money, but Receivable)
    DEBT_CREATE = 'DEBT_CREATE', // Customer incurred debt
    
    // Expenses (Real Money Out)
    EXPENSE_OPERATIONAL = 'EXPENSE_OPERATIONAL', 
    EXPENSE_PURCHASE = 'EXPENSE_PURCHASE', 
    LOAN_REPAYMENT = 'LOAN_REPAYMENT', // Paying back a place loan
    
    // Owners/Partners
    PARTNER_WITHDRAWAL = 'PARTNER_WITHDRAWAL', // Profit taking
    PARTNER_DEPOSIT = 'PARTNER_DEPOSIT', // Injecting money
    PARTNER_DEBT_PAYMENT = 'PARTNER_DEBT_PAYMENT', // Repayment of personal debt to business
    
    // Internal
    LIQUIDATION_TO_APP = 'LIQUIDATION_TO_APP', // Cash -> Bank (Taseel)
    INTERNAL_TRANSFER = 'INTERNAL_TRANSFER', // Bank -> Bank
    OPENING_BALANCE = 'OPENING_BALANCE'
}

export type FinancialChannel = 'cash' | 'bank' | 'receivable'; 

export interface LedgerEntry {
    id: string;
    timestamp: string; // ISO Date
    dateKey: string; // YYYY-MM-DD for grouping
    type: TransactionType;
    amount: number; // Always positive
    direction: 'in' | 'out'; 
    
    channel: FinancialChannel;
    accountId?: string; // Required if channel is bank
    
    // Context Links
    entityId?: string; // ID of the Session, Expense, Debt, etc.
    referenceId?: string; // Grouping ID for balanced transfers (e.g., Transfer ID)
    description: string;
    
    // Partner Context
    partnerId?: string;
    partnerName?: string; // SNAPSHOT: The name of the partner who performed the action
    
    // Metadata
    migrated?: boolean;
}

export interface PeriodLock {
    lockedUntil: string; // ISO Date (YYYY-MM-DD)
    lockId: string;
    createdAt: string;
    notes?: string;
}

// ----------------------------------------------------

export interface Customer {
  id: string;
  name: string;
  phone: string;
  isVIP: boolean;
  creditBalance: number;
  debtBalance: number; // Derived from Ledger in new system
  lastVisit?: string;
  createdAt: string; 
  notes?: string; 
}

export interface Drink {
  id: string;
  name: string;
  availability: DrinkAvailability;
  smallPrice?: number;
  smallCost?: number;
  largePrice?: number;
  largeCost?: number;
  price?: number; 
  cost?: number; 
}

export interface InternetCard {
  id: string;
  name: string;
  price: number;
  cost: number;
  notes?: string;
}

export type BankAccountType = 'palpay' | 'jawwalpay' | 'bop' | 'isbk' | 'other';

export interface BankAccount {
  id: string;
  name: string;
  accountType?: BankAccountType; 
  accountNumber?: string; 
  phone?: string; 
  active: boolean;
  notes?: string;
}

export type OrderType = 'drink' | 'internet_card';

export interface Order {
  id: string;
  type: OrderType;
  itemId: string;
  itemName: string;
  size?: DrinkSize;
  priceAtOrder: number;
  costAtOrder: number;
  quantity: number;
  timestamp: string;
  drinkId?: string; 
  drinkName?: string; 
}

export type DeviceStatus = 'mobile' | 'laptop'; 

export interface Discount {
    type: 'fixed' | 'percent';
    value: number; 
    amount: number; 
    locked: boolean;
}

export interface PlaceLoan {
    id: string;
    lenderType: 'partner' | 'external';
    lenderName: string;
    partnerId?: string; 
    reason: string;
    principal: number; 
    channel: 'cash' | 'bank'; 
    startDate: string;
    scheduleType: 'daily' | 'weekly' | 'monthly';
    installmentsCount: number;
    installmentAmount: number;
    status: 'active' | 'closed';
    createdAt: string;
    installments: LoanInstallment[];
    payments: LoanPayment[]; 
}

export interface LoanInstallment {
    id: string;
    loanId: string;
    dueDate: string;
    amount: number;
    status: 'due' | 'paid' | 'partial';
}

export interface LoanPayment {
    id: string;
    loanId: string;
    installmentId?: string; 
    date: string;
    amount: number;
    channel: 'cash' | 'bank';
    note?: string;
}

export interface CashTransfer {
    id: string;
    partnerId: string;
    amount: number;
    date: string;
    timestamp: string;
    note?: string;
    targetAccountId?: string; 
}

export interface SessionEvent {
  id: string;
  type: 'device_change';
  timestamp: string; 
  fromDevice: DeviceStatus;
  toDevice: DeviceStatus;
  note?: string;
}

export interface SessionSegment {
  start: string;
  end: string;
  device: DeviceStatus;
  durationMinutes: number;
  ratePerHour: number;
  cost: number;
  isCurrent?: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  entityType: 'session' | 'customer' | 'system' | 'loan' | 'ledger' | 'lock';
  entityId: string; 
  action: string; 
  details: string; 
  diff?: { field: string; before: any; after: any }[];
}

export interface Session {
  id: string;
  customerName: string;
  customerPhone?: string; 
  startTime: string;
  notes?: string;
  orders: Order[];
  deviceStatus: DeviceStatus;
  events: SessionEvent[];
}

export interface Transaction {
    id: string;
    date: string; 
    amount: number;
    type: 'cash' | 'bank' | 'credit_usage'; 
    bankAccountId?: string; 
    senderPhone?: string; 
    senderAccountName?: string; 
    note?: string;
}

export interface Record {
  id: string;
  customerName: string;
  customerPhone?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  
  sessionInvoice: number;
  drinksInvoice: number;
  internetCardsInvoice?: number; 
  totalInvoice: number; 
  totalDue?: number;
  
  discountApplied?: Discount;

  placeCost: number;
  drinksCost: number;
  internetCardsCost?: number; 
  
  grossProfit: number;
  devPercentSnapshot: number;
  devCut: number;
  netProfit: number;
  
  paymentStatus: 'paid' | 'partial' | 'customer_debt';
  isPaid: boolean;
  
  cashPaid: number;
  bankPaid: number;
  
  creditApplied: number; 
  createdDebt: number;   
  createdCredit: number; 
  settledDebt: number;   
  
  bankAccountId?: string; 
  bankAccountNameSnapshot?: string;
  senderPhone?: string; 
  senderAccountName?: string;

  transactions?: Transaction[]; 
  
  paidTotal: number;
  remainingDebt: number; 
  lastPaymentDate?: string; 
  
  excuse?: string;
  timestamp: number;
  orders: Order[];
  deviceStatus: DeviceStatus; 
  
  hourlyRateSnapshot: number; 
  placeCostRateSnapshot: number;
  
  events?: SessionEvent[];
  segmentsSnapshot?: SessionSegment[]; 
  
  totalCost?: number; 
  cost?: number; 
  sessionCost?: number;
  hourlyRate?: number;
  drinksCostLegacy?: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'one_time' | 'auto_purchase' | 'loan_repayment'; 
  date?: string;
  notes?: string;
  linkedPurchaseId?: string; 
  linkedLoanPaymentId?: string; 
  
  paymentMethod?: 'cash' | 'bank';
  fromAccountId?: string; 
  fromAccountNameAtPaymentTime?: string;
}

export interface Purchase {
  id: string;
  name: string;
  amount: number;
  date: string;
  fundingSource: 'place' | 'partner';
  buyer: string;
  source?: string;
  notes?: string;
  
  paymentMethod?: 'cash' | 'bank';
  fromAccountId?: string; 
  fromAccountNameAtPaymentTime?: string; 
}

export interface PricingConfig {
  mobileRate: number;
  laptopRate: number; 
  mobilePlaceCost: number;
  laptopPlaceCost: number;
  devPercent: number;
}

export interface DebtItem {
    id: string;
    partnerId: string;
    amount: number;
    date: string;
    note: string;
    debtSource: 'place' | 'partner';
    debtChannel?: 'cash' | 'bank'; 
    bankAccountId?: string; 
}

export interface DayCycle {
  id: string;
  dateKey: string; 
  monthKey: string; 
  startTime: string; 
  endTime: string; 
  totalRevenue: number;
  cashRevenue: number;
  bankRevenue: number;
  totalDiscounts: number; 
  bankBreakdown: { bankName: string; amount: number }[];
  totalDebt: number;
  totalInvoice: number;
  totalOperationalCosts: number;
  netCashFlow: number; 
  netBankFlow: number; 
  grossProfit: number;
  devCut: number;
  netProfit: number; 
  notes?: string;
  createdAt: number;
  recordCount?: number;
}

export interface DailyClosing {
    id: string;
    date: string;
    totalRevenue: number;
    cashRevenue: number;
    bankRevenue: number;
    bankBreakdown: any[];
    totalDebt: number;
    totalInvoice: number;
    totalOperationalCosts: number;
    grossProfit: number;
    devCut: number;
    netProfit: number;
    partnersDistribution: any[];
    notes?: string;
    recordIds?: string[];
    createdAt: number;
}

export interface MonthlyArchive {
    id: string;
    archiveId: string;
    monthKey: string; 
    monthNameArabic: string;
    title: string;
    createdAt: number;
    totals: {
        revenue: number;
        cashRevenue: number; 
        bankRevenue: number; 
        cashExpenses: number; 
        bankExpenses: number; 
        cashNet: number; 
        bankNet: number; 
        debt: number;
        costs: number;
        netProfit: number;
    };
    bankBreakdown: { bankName: string; amount: number }[];
    partnersDistribution: any[];
}

export interface InventorySnapshot {
  id: string;
  type: 'manual' | 'auto'; 
  archiveId: string;
  archiveDate: string;
  periodStart: string;
  periodEnd: string;
  createdAt: number;
  totalPaidRevenue: number;
  totalCashRevenue: number; 
  totalBankRevenue: number; 
  totalDiscounts: number; 
  totalDebtRevenue: number; // New debts created in period
  totalInvoice: number; 
  totalPlaceCost: number;
  totalDrinksCost: number;
  totalCardsCost: number; 
  totalExpenses: number;
  totalCashExpenses: number; 
  totalBankExpenses: number; 
  netCashInPlace: number;
  netBankInPlace: number;
  grossProfit: number;
  devCut: number;
  netProfitPaid: number;
  /** Added to fix: Property 'devPercentSnapshot' does not exist on type 'InventorySnapshot' */
  devPercentSnapshot?: number;
  partners: {
    name: string;
    sharePercent: number;
    baseShare: number;
    cashShareAvailable: number;
    bankShareAvailable: number;
    purchasesReimbursement: number;
    loanRepaymentCash: number; 
    loanRepaymentBank: number; 
    placeDebtDeducted: number;
    finalPayoutCash: number; 
    finalPayoutBank: number; 
    finalPayoutTotal: number;
    remainingDebt: number;
  }[];
  revenueDetails?: {
      sessions: number;
      drinks: number;
      cards: number;
  };
  expensesDetails?: {
      fixed: { name: string; amount: number; dailyShare: number; periodShare: number }[];
      oneTime: { name: string; amount: number; date: string }[];
      autoPurchases: { name: string; amount: number; date: string }[];
      loanRepayments: { name: string; amount: number; date: string; channel: 'cash' | 'bank' }[]; 
  };
  bankSummary?: { bankName: string; amount: number; count: number }[];
  debtsSummary?: { totalDebt: number; totalRepaid: number; remaining: number };
}

export interface PartnerLedgerItem {
    id: string;
    date: string;
    type: 'profit_share' | 'loan_repayment' | 'withdrawal' | 'purchase_reimbursement' | 'adjustment' | 'debt_settlement' | 'cash_out_transfer';
    channel: 'cash' | 'bank';
    amount: number; // Positive = Credit (Leh), Negative = Debit (3aleh)
    description: string;
    refId?: string; // Links to source
}

export interface OperationLog {
    id: string;
    type: 'start_cycle' | 'close_cycle' | 'auto_month_archive' | 'debt_payment' | 'audit_sync' | 'inventory_archive' | 'credit_added' | 'credit_applied' | 'debt_settled' | 'invoice_closed' | 'loan_payment' | 'archive_rebuild' | 'cash_transfer';
    dateTime: string;
    targetDate?: string;
    notes?: string;
}

export interface SystemState {
    currentDate: string; 
    currentMonth: string; 
    activeCycleId: string | null;
    currentCycleStartTime: string | null; 
    dayStatus: 'open' | 'closed'; 
    monthStatus: 'open' | 'closed'; 
    logs: OperationLog[];
}

// Added 'expenses' to ViewState to resolve type comparison error in App.tsx
export type ViewState = 'dashboard' | 'history' | 'records' | 'summary' | 'settings' | 'cost_analysis' | 'profit_dist' | 'partner_debts' | 'inventory_archive' | 'drinks' | 'purchases' | 'monthly' | 'internet_cards' | 'treasury' | 'vip_customers' | 'place_loans' | 'partners' | 'audit_log' | 'ledger_viewer' | 'backup_restore' | 'expenses';

export interface Stats {
  totalRevenue: number;
  totalDebt: number;
  totalSessions: number;
  todayRevenue: number;
  todayDebt: number;
  sessionsRevenue: number;
  drinksRevenue: number;
}
