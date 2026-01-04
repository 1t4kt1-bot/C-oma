
import { LedgerEntry, TransactionType, FinancialChannel, Record, Expense, Purchase, CashTransfer, DebtItem, PlaceLoan, BankAccount, InventorySnapshot, PricingConfig, DayCycle, PeriodLock } from './types';
import { generateId, getLocalDate, getDaysInMonth, getAllDaysOfMonth } from './utils';

// --- PARTNERS CONSTANT (Matching App.tsx) ---
export const GLOBAL_PARTNERS = [
    { id: 'abu_khaled', name: 'أبو خالد', percent: 34 },
    { id: 'khaled', name: 'خالد', percent: 33 },
    { id: 'abdullah', name: 'عبد الله', percent: 33 }
];

// --- CORE SELECTORS ---

export const getLedgerBalance = (ledger: LedgerEntry[], channel: FinancialChannel, accountId?: string): number => {
    return ledger.reduce((acc, entry) => {
        if (entry.channel !== channel) return acc;
        if (accountId !== undefined && entry.accountId !== accountId) return acc;
        if (entry.direction === 'in') return acc + (entry.amount || 0);
        if (entry.direction === 'out') return acc - (entry.amount || 0);
        return acc;
    }, 0);
};

export const resolveActorName = (entry: LedgerEntry): string => {
    if (entry.partnerName) return entry.partnerName;
    if (entry.partnerId) {
        return GLOBAL_PARTNERS.find(p => p.id === entry.partnerId)?.name || 'غير معروف';
    }
    return 'النظام';
};

export const getLedgerStatsForPeriod = (ledger: LedgerEntry[], startDate: string, endDate: string) => {
    const periodEntries = ledger.filter(e => e.dateKey >= startDate && e.dateKey <= endDate);
    const income = periodEntries
        .filter(e => e.type === TransactionType.INCOME_SESSION || e.type === TransactionType.INCOME_PRODUCT)
        .reduce((s, e) => s + (e.amount || 0), 0);
    const sessionIncome = periodEntries.filter(e => e.type === TransactionType.INCOME_SESSION).reduce((s,e) => s + (e.amount || 0), 0);
    const productIncome = periodEntries.filter(e => e.type === TransactionType.INCOME_PRODUCT).reduce((s,e) => s + (e.amount || 0), 0);
    const expenses = periodEntries
        .filter(e => e.type === TransactionType.EXPENSE_OPERATIONAL || e.type === TransactionType.EXPENSE_PURCHASE || e.type === TransactionType.LOAN_REPAYMENT)
        .reduce((s, e) => s + (e.amount || 0), 0);
    const debtCreated = periodEntries
        .filter(e => e.type === TransactionType.DEBT_CREATE)
        .reduce((s, e) => s + (e.amount || 0), 0);
    const debtPaid = periodEntries
        .filter(e => e.type === TransactionType.DEBT_PAYMENT)
        .reduce((s, e) => s + (e.amount || 0), 0);
    const periodCashIn = periodEntries.filter(e => e.channel === 'cash' && e.direction === 'in').reduce((s,e) => s+(e.amount || 0), 0);
    const periodCashOut = periodEntries.filter(e => e.channel === 'cash' && e.direction === 'out').reduce((s,e) => s+(e.amount || 0), 0);
    return { 
        income, sessionIncome, productIncome, expenses, debtCreated, debtPaid, 
        netCashFlow: periodCashIn - periodCashOut,
        totalNetCash: getLedgerBalance(ledger, 'cash'),
        totalNetBank: getLedgerBalance(ledger, 'bank')
    };
};

export const getLedgerTotals = (ledger: LedgerEntry[], period: 'today' | 'month' | 'custom', dateReference: string) => {
    let startDate = dateReference;
    let endDate = dateReference;
    if (period === 'month') {
        startDate = dateReference.slice(0, 7) + '-01';
        const year = parseInt(startDate.split('-')[0]);
        const month = parseInt(startDate.split('-')[1]);
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    }
    return getLedgerStatsForPeriod(ledger, startDate, endDate);
};

export const getPartnerStats = (ledger: LedgerEntry[], partnerId: string) => {
    const entries = ledger.filter(e => e.partnerId === partnerId);
    const withdrawals = entries.filter(e => e.type === TransactionType.PARTNER_WITHDRAWAL).reduce((s, e) => s + (e.amount || 0), 0);
    const repayments = entries.filter(e => e.type === TransactionType.PARTNER_DEPOSIT || e.type === TransactionType.PARTNER_DEBT_PAYMENT).reduce((s, e) => s + (e.amount || 0), 0);
    return { withdrawals, repayments, currentNet: withdrawals - repayments, entries };
};

export const getTreasuryStats = (ledger: LedgerEntry[], accounts: BankAccount[]) => {
    const cashBalance = getLedgerBalance(ledger, 'cash');
    const totalBankBalance = getLedgerBalance(ledger, 'bank');
    const accountsStats = accounts.map(acc => {
        const accEntries = ledger.filter(e => e.channel === 'bank' && e.accountId === acc.id);
        const totalIn = accEntries.filter(e => e.direction === 'in').reduce((s, e) => s + (e.amount || 0), 0);
        const totalOut = accEntries.filter(e => e.direction === 'out').reduce((s, e) => s + (e.amount || 0), 0);
        return { ...acc, balance: getLedgerBalance(ledger, 'bank', acc.id), totalIn, totalOut };
    });
    return { cashBalance, totalBankBalance, accountsStats };
};

export const getPartnerDebtSummary = (debtsList: DebtItem[], partnerId: string) => {
    const items = debtsList.filter(d => d.partnerId === partnerId);
    const totalDebt = items.reduce((sum, d) => sum + (d.amount || 0), 0);
    const placeDebt = items.filter(d => d.debtSource === 'place' || !d.debtSource).reduce((sum, d) => sum + (d.amount || 0), 0);
    return { totalDebt, placeDebt, items };
};

export const getPlaceLoanStats = (loan: PlaceLoan) => {
    const paid = loan.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = loan.principal - paid;
    const progress = loan.principal > 0 ? Math.min(100, (paid / loan.principal) * 100) : 0;
    return { paid, remaining, progress, isFullyPaid: remaining <= 0.01 };
};

export const checkLoanStatusAfterPayment = (loan: PlaceLoan, newAmount: number): 'active' | 'closed' => {
     const currentPaid = loan.payments.reduce((s, p) => s + p.amount, 0);
     return (currentPaid + newAmount) >= (loan.principal - 0.01) ? 'closed' : 'active';
};

export const getCostAnalysisView = (ledger: LedgerEntry[], monthKey: string) => {
    const days = getAllDaysOfMonth(monthKey);
    return days.map(date => {
        const periodEntries = ledger.filter(e => e.dateKey === date);
        const income = periodEntries.filter(e => e.type === TransactionType.INCOME_SESSION || e.type === TransactionType.INCOME_PRODUCT || e.type === TransactionType.DEBT_PAYMENT).reduce((s, e) => s + (e.amount || 0), 0);
        const expenses = periodEntries.filter(e => e.type.startsWith('EXPENSE') || e.type === TransactionType.LOAN_REPAYMENT).reduce((s, e) => s + (e.amount || 0), 0);
        
        const cashIn = periodEntries.filter(e => e.channel === 'cash' && e.direction === 'in').reduce((s, e) => s + (e.amount || 0), 0);
        const cashOut = periodEntries.filter(e => e.channel === 'cash' && e.direction === 'out').reduce((s, e) => s + (e.amount || 0), 0);
        
        const bankIn = periodEntries.filter(e => e.channel === 'bank' && e.direction === 'in').reduce((s, e) => s + (e.amount || 0), 0);
        const bankOut = periodEntries.filter(e => e.channel === 'bank' && e.direction === 'out').reduce((s, e) => s + (e.amount || 0), 0);

        return {
            date,
            totalRevenue: income,
            totalExpenses: expenses,
            netCash: cashIn - cashOut,
            netBank: bankIn - bankOut,
            netProfit: income - expenses
        };
    }).filter(d => d.totalRevenue > 0 || d.totalExpenses > 0 || d.netCash !== 0 || d.netBank !== 0);
};

export const validateOperation = (date: string, lock: PeriodLock | null) => {
    if (lock && date <= lock.lockedUntil) throw new Error(`لا يمكن إجراء عمليات في فترة مغلقة (قبل ${lock?.lockedUntil}). يرجى فتح الفترة أولاً.`);
};

export const checkLedgerIntegrity = (ledger: LedgerEntry[]): string[] => {
    const errors: string[] = [];
    const cash = getLedgerBalance(ledger, 'cash');
    if (cash < -0.01) errors.push(`Critical: Negative Cash Balance (${cash})`);
    return errors;
};

export const validateTransaction = (ledger: LedgerEntry[], amount: number, channel: FinancialChannel, accountId?: string): void => {
    if (channel === 'receivable') return;
    const currentBalance = getLedgerBalance(ledger, channel, accountId);
    if ((currentBalance - amount) < -0.01) throw new Error(`رصيد ${channel === 'cash' ? 'الصندوق' : 'الحساب'} غير كافٍ. المتوفر: ${currentBalance.toFixed(2)}.`);
};

export const createEntry = (type: TransactionType, amount: number, direction: 'in' | 'out', channel: FinancialChannel, description: string, accountId?: string, entityId?: string, partnerId?: string, date?: string, referenceId?: string, partnerName?: string): LedgerEntry => {
    return { id: generateId(), timestamp: new Date().toISOString(), dateKey: date || getLocalDate(), type, amount, direction, channel, accountId, description, entityId, partnerId, partnerName, referenceId };
};

export const calcEndDayPreviewFromLedger = (ledger: LedgerEntry[], startDate: string, bankAccounts: BankAccount[], pricingConfig: PricingConfig): DayCycle => {
    const now = new Date().toISOString();
    const todayKey = startDate.split('T')[0];
    const cycleEntries = ledger.filter(e => e.timestamp >= startDate && e.timestamp <= now);
    
    const incomeEntries = cycleEntries.filter(e => 
        e.type === TransactionType.INCOME_SESSION || 
        e.type === TransactionType.INCOME_PRODUCT || 
        e.type === TransactionType.DEBT_PAYMENT
    );

    const cashRevenue = incomeEntries.filter(e => e.channel === 'cash').reduce((s, e) => s + (e.amount || 0), 0);
    const bankRevenue = incomeEntries.filter(e => e.channel === 'bank').reduce((s, e) => s + (e.amount || 0), 0);
    const totalRevenue = cashRevenue + bankRevenue;

    const totalDebt = cycleEntries.filter(e => e.type === TransactionType.DEBT_CREATE).reduce((s, e) => s + (e.amount || 0), 0);
    
    const expenses = cycleEntries.filter(e => 
        e.type.startsWith('EXPENSE') || 
        e.type === TransactionType.LOAN_REPAYMENT
    ).reduce((s, e) => s + (e.amount || 0), 0);

    const cashFlowIn = cycleEntries.filter(e => e.channel === 'cash' && e.direction === 'in').reduce((s, e) => s + (e.amount || 0), 0);
    const cashFlowOut = cycleEntries.filter(e => e.channel === 'cash' && e.direction === 'out').reduce((s, e) => s + (e.amount || 0), 0);
    
    const bankFlowIn = cycleEntries.filter(e => e.channel === 'bank' && e.direction === 'in').reduce((s, e) => s + (e.amount || 0), 0);
    const bankFlowOut = cycleEntries.filter(e => e.channel === 'bank' && e.direction === 'out').reduce((s, e) => s + (e.amount || 0), 0);

    const netCashFlow = cashFlowIn - cashFlowOut;
    const netBankFlow = bankFlowIn - bankFlowOut;

    // Estimate records by unique entityId from sessions
    const recordIds = new Set(cycleEntries.filter(e => e.type === TransactionType.INCOME_SESSION).map(e => e.entityId).filter(Boolean));

    return { 
        id: 'PREVIEW', 
        dateKey: todayKey, 
        monthKey: todayKey.slice(0, 7), 
        startTime: startDate, 
        endTime: now, 
        totalRevenue, 
        cashRevenue, 
        bankRevenue, 
        totalDiscounts: 0, 
        bankBreakdown: [], 
        totalDebt, 
        totalInvoice: totalRevenue + totalDebt, 
        totalOperationalCosts: expenses, 
        netCashFlow, 
        netBankFlow, 
        grossProfit: totalRevenue - expenses, 
        devCut: 0, 
        netProfit: 0, 
        recordCount: recordIds.size, 
        createdAt: Date.now() 
    };
};

export const calcLedgerInventory = (
    ledger: LedgerEntry[],
    startDate: string,
    endDate: string,
    expenses: Expense[],
    pricingConfig: PricingConfig
): InventorySnapshot => {
    const periodEntries = ledger.filter(e => e.dateKey >= startDate && e.dateKey <= endDate);
    
    // 1. Incomes by Channel
    const cashIncome = periodEntries
        .filter(e => e.channel === 'cash' && (e.type === TransactionType.INCOME_SESSION || e.type === TransactionType.INCOME_PRODUCT || e.type === TransactionType.DEBT_PAYMENT))
        .reduce((s, e) => s + (e.amount || 0), 0);
    const bankIncome = periodEntries
        .filter(e => e.channel === 'bank' && (e.type === TransactionType.INCOME_SESSION || e.type === TransactionType.INCOME_PRODUCT || e.type === TransactionType.DEBT_PAYMENT))
        .reduce((s, e) => s + (e.amount || 0), 0);

    // 2. Expenses by Channel
    const cashExpenses = periodEntries
        .filter(e => e.channel === 'cash' && (e.type === TransactionType.EXPENSE_OPERATIONAL || e.type === TransactionType.EXPENSE_PURCHASE || e.type === TransactionType.LOAN_REPAYMENT))
        .reduce((s, e) => s + (e.amount || 0), 0);
    const bankExpenses = periodEntries
        .filter(e => e.channel === 'bank' && (e.type === TransactionType.EXPENSE_OPERATIONAL || e.type === TransactionType.EXPENSE_PURCHASE || e.type === TransactionType.LOAN_REPAYMENT))
        .reduce((s, e) => s + (e.amount || 0), 0);

    // 3. Liquidation (Transfer from Cash to Bank)
    const liquidated = periodEntries
        .filter(e => e.type === TransactionType.LIQUIDATION_TO_APP && e.direction === 'out' && e.channel === 'cash')
        .reduce((s, e) => s + (e.amount || 0), 0);

    // 4. Net Channel Analysis for Profit Splitting
    const netCashSource = cashIncome - cashExpenses - liquidated;
    const netBankSource = bankIncome - bankExpenses + liquidated;
    const totalNetSource = Math.max(0, netCashSource) + Math.max(0, netBankSource);
    
    // Calculate split ratios based on where the money actually is
    const cashRatio = totalNetSource > 0 ? (Math.max(0, netCashSource) / totalNetSource) : 1;
    const bankRatio = totalNetSource > 0 ? (Math.max(0, netBankSource) / totalNetSource) : 0;

    const totalPaidRevenue = cashIncome + bankIncome;
    const totalDebtRevenue = periodEntries.filter(e => e.type === TransactionType.DEBT_CREATE).reduce((s, e) => s + (e.amount || 0), 0);
    const totalInvoice = totalPaidRevenue + totalDebtRevenue;
    const totalLedgerExpenses = cashExpenses + bankExpenses;

    const grossProfit = totalInvoice - totalLedgerExpenses;
    const devCut = grossProfit > 0 ? grossProfit * (pricingConfig.devPercent / 100) : 0;
    const netProfitPaid = grossProfit - devCut;

    const partners = GLOBAL_PARTNERS.map(p => {
        const baseShare = Math.max(0, netProfitPaid * (p.percent / 100));
        
        // Distribution based on channel ratio
        const cashShareAvailable = baseShare * cashRatio;
        const bankShareAvailable = baseShare * bankRatio;

        const myCashWithdrawals = periodEntries.filter(e => e.partnerId === p.id && e.channel === 'cash' && e.type === TransactionType.PARTNER_WITHDRAWAL).reduce((s, w) => s + (w.amount || 0), 0);
        const myBankWithdrawals = periodEntries.filter(e => e.partnerId === p.id && e.channel === 'bank' && e.type === TransactionType.PARTNER_WITHDRAWAL).reduce((s, w) => s + (w.amount || 0), 0);
        const myRepayments = periodEntries.filter(e => e.partnerId === p.id && (e.type === TransactionType.PARTNER_DEPOSIT || e.type === TransactionType.PARTNER_DEBT_PAYMENT)).reduce((s, r) => s + (r.amount || 0), 0);
        const netWithdrawal = (myCashWithdrawals + myBankWithdrawals) - myRepayments;

        return {
            name: p.name, sharePercent: p.percent / 100, baseShare, 
            cashShareAvailable, bankShareAvailable,
            purchasesReimbursement: 0, loanRepaymentCash: 0, loanRepaymentBank: 0, 
            placeDebtDeducted: netWithdrawal,
            finalPayoutCash: cashShareAvailable - myCashWithdrawals + myRepayments, 
            finalPayoutBank: bankShareAvailable - myBankWithdrawals,
            finalPayoutTotal: baseShare - netWithdrawal, 
            remainingDebt: 0
        };
    });

    return {
        id: generateId(), type: 'manual', archiveId: 'LEDGER-SNAP', archiveDate: new Date().toISOString(),
        periodStart: startDate, periodEnd: endDate, createdAt: Date.now(), totalPaidRevenue, totalCashRevenue: cashIncome, totalBankRevenue: bankIncome,
        totalDiscounts: 0, totalDebtRevenue, totalInvoice, totalPlaceCost: 0, totalDrinksCost: 0, totalCardsCost: 0,
        totalExpenses: totalLedgerExpenses, totalCashExpenses: cashExpenses, totalBankExpenses: bankExpenses,
        netCashInPlace: getLedgerBalance(ledger, 'cash'), netBankInPlace: getLedgerBalance(ledger, 'bank'),
        grossProfit, devCut, netProfitPaid, devPercentSnapshot: pricingConfig.devPercent, partners
    };
};

export const rebuildArchivesFromLedger = (currentSnapshots: InventorySnapshot[], ledger: LedgerEntry[], expenses: Expense[], pricingConfig: PricingConfig): InventorySnapshot[] => {
    return currentSnapshots.map(snap => {
        const result = calcLedgerInventory(ledger, snap.periodStart, snap.periodEnd, expenses, pricingConfig);
        return { ...result, id: snap.id, type: snap.type, archiveId: snap.archiveId, createdAt: snap.createdAt };
    });
};

export const migrateLegacyDataToLedger = (records: Record[], expenses: Expense[], transfers: CashTransfer[], debts: DebtItem[], placeLoans: PlaceLoan[]): LedgerEntry[] => {
    const ledger: LedgerEntry[] = [];
    records.forEach(r => {
        const date = r.endTime.split('T')[0];
        if (r.cashPaid > 0) ledger.push(createEntry(TransactionType.INCOME_SESSION, r.cashPaid, 'in', 'cash', `جلسة: ${r.customerName}`, undefined, r.id, undefined, date));
        if (r.remainingDebt > 0) ledger.push(createEntry(TransactionType.DEBT_CREATE, r.remainingDebt, 'in', 'receivable', `دين: ${r.customerName}`, undefined, r.id, undefined, date));
    });
    return ledger.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
