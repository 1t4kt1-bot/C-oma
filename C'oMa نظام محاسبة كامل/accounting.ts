

import { Record, Session, PricingConfig, Order, Expense, Purchase, DailyClosing, DebtItem, BankAccount, DayCycle, Customer, Discount, PlaceLoan, InventorySnapshot, PartnerLedgerItem, CashTransfer } from './types';
import { calculateTimeCost, calculateOrdersTotal, calculateOrdersCost, getDaysInMonth, calculateSessionSegments, generateId, formatCurrency } from './utils';

// --- CORE CALCULATIONS ---

export const calcRecordFinancials = (
    session: Session, 
    endTimeIso: string, 
    config: PricingConfig,
    orders: Order[] = [],
    discount?: Discount
): Partial<Record> => {
    
    // 1. Calculate Base Time Cost
    const { segments, totalCost, placeCost } = calculateSessionSegments(
        session.startTime,
        endTimeIso,
        session.events && session.events.length > 0 
            ? session.events[0].fromDevice 
            : session.deviceStatus,
        session.events || [],
        config
    );

    const sessionInvoice = totalCost; 
    const durationMinutes = segments.reduce((acc, s) => acc + s.durationMinutes, 0);

    const currentOrders = orders.length > 0 ? orders : session.orders;
    const drinkOrders = currentOrders.filter(o => o.type === 'drink' || !o.type); 
    const cardOrders = currentOrders.filter(o => o.type === 'internet_card');

    const drinksInv = calculateOrdersTotal(drinkOrders);
    const cardsInv = calculateOrdersTotal(cardOrders);
    const drinksCost = calculateOrdersCost(drinkOrders);
    const cardsCost = calculateOrdersCost(cardOrders);

    // 2. Total Before Discount
    let rawTotal = sessionInvoice + drinksInv + cardsInv;
    
    // 3. Apply Discount
    let discountAmount = 0;
    if (discount) {
        if (discount.type === 'fixed') {
            discountAmount = discount.value;
        } else {
            discountAmount = rawTotal * (discount.value / 100);
        }
    }
    // Prevent negative total
    discountAmount = Math.min(discountAmount, rawTotal);
    
    // 4. Final Total (Rounded)
    const totalInvoice = Math.round(rawTotal - discountAmount);
    
    // Fill the actual discount applied amount for record
    const finalDiscount: Discount | undefined = discount ? { ...discount, amount: discountAmount, locked: true } : undefined;

    const totalDirectCost = placeCost + drinksCost + cardsCost;

    const grossProfit = totalInvoice - totalDirectCost;
    const devCut = grossProfit > 0 ? grossProfit * (config.devPercent / 100) : 0;
    const netProfit = grossProfit - devCut;

    return {
        durationMinutes: Math.floor(durationMinutes),
        sessionInvoice,
        drinksInvoice: drinksInv,
        internetCardsInvoice: cardsInv,
        totalInvoice,
        totalDue: totalInvoice, // Initially Total Due equals Total Invoice
        discountApplied: finalDiscount,
        placeCost,
        drinksCost,
        internetCardsCost: cardsCost,
        grossProfit,
        devPercentSnapshot: config.devPercent,
        devCut,
        netProfit,
        hourlyRateSnapshot: session.deviceStatus === 'mobile' ? config.mobileRate : config.laptopRate,
        placeCostRateSnapshot: session.deviceStatus === 'mobile' ? config.mobilePlaceCost : config.laptopPlaceCost,
        segmentsSnapshot: segments
    };
};

// --- CUSTOMER TRANSACTION LOGIC ---
export const calculateCustomerTransaction = (
    totalDue: number,
    paidAmount: number, // Cash + Bank
    customer: Customer
) => {
    const startCredit = customer.creditBalance || 0;
    const startDebt = customer.debtBalance || 0;

    const appliedCredit = Math.min(startCredit, totalDue);
    const dueAfterCredit = totalDue - appliedCredit;
    const creditAfterApply = startCredit - appliedCredit;

    const delta = paidAmount - dueAfterCredit;

    let createdDebt = 0;
    let createdCredit = 0;
    
    let preSettleCredit = creditAfterApply;
    let preSettleDebt = startDebt;

    if (delta > 0) {
        createdCredit = delta;
        preSettleCredit += createdCredit;
    } else if (delta < 0) {
        createdDebt = Math.abs(delta);
        preSettleDebt += createdDebt;
    } 

    let settledDebt = 0;
    if (preSettleCredit > 0 && preSettleDebt > 0) {
        settledDebt = Math.min(preSettleCredit, preSettleDebt);
    }

    const finalCredit = preSettleCredit - settledDebt;
    const finalDebt = preSettleDebt - settledDebt;

    return {
        totalDue,
        paidAmount,
        appliedCredit,
        createdDebt,
        createdCredit,
        settledDebt,
        finalCredit,
        finalDebt,
        isFullyPaid: finalDebt === 0 && (totalDue <= (paidAmount + appliedCredit))
    };
};

export const calcCycleTotals = (
    startTime: string,
    endTime: string, 
    records: Record[],
    expenses: Expense[],
    purchases: Purchase[],
    bankAccounts: BankAccount[],
    pricingConfig: PricingConfig
): Partial<DayCycle> => {
    
    const cycleRecords = records.filter(r => r.endTime >= startTime && r.endTime <= endTime);
    
    // Revenue Split
    const cashRevenue = cycleRecords.reduce((s, r) => s + (r.cashPaid || 0), 0);
    const bankRevenue = cycleRecords.reduce((s, r) => s + (r.bankPaid || 0), 0);
    const totalRevenue = cashRevenue + bankRevenue; // Note: Doesn't include credit usage, only actual money in

    const totalDiscounts = cycleRecords.reduce((s, r) => s + (r.discountApplied?.amount || 0), 0);

    const dateKey = startTime.split('T')[0];
    
    // Outflows
    const dayOutflows = expenses.filter(e => e.date === dateKey); // All recorded expenses/repayments
    const dayPlacePurchases = purchases.filter(p => p.date === dateKey && p.fundingSource === 'place');
    
    const cashOutflows = 
        dayOutflows.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + (e.amount || 0), 0) +
        dayPlacePurchases.filter(p => p.paymentMethod === 'cash').reduce((s, p) => s + (p.amount || 0), 0);
        
    const bankOutflows = 
        dayOutflows.filter(e => e.paymentMethod === 'bank').reduce((s, e) => s + (e.amount || 0), 0) +
        dayPlacePurchases.filter(p => p.paymentMethod === 'bank').reduce((s, p) => s + (p.amount || 0), 0);

    const netCashFlow = cashRevenue - cashOutflows;
    const netBankFlow = bankRevenue - bankOutflows;

    // Bank Breakdown
    const bankBreakdownMap = new Map<string, number>();
    cycleRecords.forEach(r => {
        if(r.bankPaid > 0 && r.bankAccountId) {
            const current = bankBreakdownMap.get(r.bankAccountId) || 0;
            bankBreakdownMap.set(r.bankAccountId, current + r.bankPaid);
        }
    });
    const bankBreakdown = Array.from(bankBreakdownMap.entries()).map(([id, amount]) => ({
        bankName: bankAccounts.find(b => b.id === id)?.name || 'غير معروف',
        amount
    }));

    // Profit Logic (Operational)
    const totalDebt = cycleRecords.reduce((s, r) => s + (r.remainingDebt || 0), 0);
    const totalInvoice = cycleRecords.reduce((s, r) => s + (r.totalInvoice || 0), 0);
    
    const directCosts = cycleRecords.reduce((s, r) => s + (r.placeCost || 0) + (r.drinksCost || 0) + (r.internetCardsCost || 0), 0);
    
    // Revenue for Profit calculation
    const revenueForProfit = totalRevenue; 

    const grossProfit = revenueForProfit - directCosts; 
    const devCut = grossProfit > 0 ? grossProfit * (pricingConfig.devPercent / 100) : 0;
    const netProfit = grossProfit - devCut;

    return {
        totalRevenue,
        cashRevenue,
        bankRevenue,
        totalDiscounts,
        bankBreakdown,
        totalDebt,
        totalInvoice,
        totalOperationalCosts: directCosts,
        netCashFlow,
        netBankFlow,
        grossProfit,
        devCut,
        netProfit
    };
};

export const calcEndDayPreview = (
    records: Record[],
    sessions: Session[],
    expenses: Expense[],
    purchases: Purchase[],
    bankAccounts: BankAccount[],
    currentDate: string,
    pricingConfig: PricingConfig,
    cycleStartTime: string
) => {
    const now = new Date().toISOString();
    const stats = calcCycleTotals(cycleStartTime, now, records, expenses, purchases, bankAccounts, pricingConfig);
    const cycleRecords = records.filter(r => r.endTime >= cycleStartTime && r.endTime <= now);
    
    return {
        ...stats,
        recordCount: cycleRecords.length
    };
};

// --- BALANCE GUARD (NEW) ---

interface DataStore {
    records: Record[];
    expenses: Expense[];
    purchases: Purchase[]; // Though usually purchases create expenses, we need to check if any non-linked exist
    cashTransfers: CashTransfer[];
    debts: DebtItem[];
    loans: PlaceLoan[];
}

export const getAvailableBalance = (
    channel: 'cash' | 'bank',
    data: DataStore,
    bankAccountId?: string
): number => {
    let inflow = 0;
    let outflow = 0;

    if (channel === 'cash') {
        // --- CASH INFLOW ---
        // 1. Sales Revenue (Cash)
        inflow += data.records.reduce((sum, r) => sum + (r.cashPaid || 0), 0);
        
        // 2. Loans Principal (Cash)
        inflow += data.loans.filter(l => l.channel === 'cash').reduce((sum, l) => sum + l.principal, 0);

        // --- CASH OUTFLOW ---
        // 1. Expenses (Cash) - Includes Purchase-linked expenses and LoanRepayment-linked expenses
        outflow += data.expenses.filter(e => e.paymentMethod === 'cash').reduce((sum, e) => sum + e.amount, 0);

        // 2. Purchases (Place) paid by Cash that are NOT linked to expenses (Fallback)
        // Generally system creates expense, but if there are any rogue records:
        outflow += data.purchases
            .filter(p => p.paymentMethod === 'cash' && p.fundingSource === 'place' && !data.expenses.some(e => e.linkedPurchaseId === p.id))
            .reduce((sum, p) => sum + p.amount, 0);

        // 3. Cash Transfers (Liquidation) - Always Out from Cash
        outflow += data.cashTransfers.reduce((sum, t) => sum + t.amount, 0);

        // 4. Partner Withdrawals (Place Debts) taken as Cash
        outflow += data.debts
            .filter(d => (d.debtSource === 'place' || !d.debtSource) && d.debtChannel === 'cash')
            .reduce((sum, d) => sum + d.amount, 0);

    } else {
        // --- BANK INFLOW ---
        if (!bankAccountId) return 0; // Strict check for specific account

        // 1. Sales Revenue (Bank) - Specific Account
        // Prefer transactions array if available
        data.records.forEach(r => {
            if (r.transactions && r.transactions.length > 0) {
                r.transactions.forEach(tx => {
                    if (tx.type === 'bank' && tx.bankAccountId === bankAccountId) {
                        inflow += tx.amount;
                    }
                });
            } else {
                // Legacy support
                if (r.bankPaid > 0 && r.bankAccountId === bankAccountId) {
                    inflow += r.bankPaid;
                }
            }
        });

        // 2. Cash Transfers (Taseel) coming INTO this bank account
        inflow += data.cashTransfers
            .filter(t => t.targetAccountId === bankAccountId)
            .reduce((sum, t) => sum + t.amount, 0);

        // Note: Loans Principal (Bank) - We don't have targetAccountId on PlaceLoan inflow yet. 
        // We assume they are external or manually added if not tracked. 
        // For safety, we rely on revenue + transfers for balance.

        // --- BANK OUTFLOW ---
        // 1. Expenses (Bank) - Specific Account
        outflow += data.expenses
            .filter(e => e.paymentMethod === 'bank' && e.fromAccountId === bankAccountId)
            .reduce((sum, e) => sum + e.amount, 0);

        // 2. Purchases (Place) paid by Bank (Unlinked fallback)
        outflow += data.purchases
            .filter(p => p.paymentMethod === 'bank' && p.fundingSource === 'place' && p.fromAccountId === bankAccountId && !data.expenses.some(e => e.linkedPurchaseId === p.id))
            .reduce((sum, p) => sum + p.amount, 0);

        // 3. Partner Withdrawals (Place Debts) taken as Bank Transfer
        outflow += data.debts
            .filter(d => (d.debtSource === 'place' || !d.debtSource) && d.debtChannel === 'bank' && d.bankAccountId === bankAccountId)
            .reduce((sum, d) => sum + d.amount, 0);
    }

    return inflow - outflow;
};

export const assertSufficientFunds = (
    params: { 
        channel: 'cash' | 'bank', 
        amount: number, 
        bankAccountId?: string,
        context: DataStore 
    }
): void => {
    const { channel, amount, bankAccountId, context } = params;
    const available = getAvailableBalance(channel, context, bankAccountId);

    if (available < amount) {
        const currency = formatCurrency(amount);
        const availFormatted = formatCurrency(available);
        if (channel === 'cash') {
            throw new Error(`رصيد الصندوق (الكاش) غير كافٍ. المتوفر: ${availFormatted}، المطلوب: ${currency}.`);
        } else {
            throw new Error(`رصيد الحساب البنكي غير كافٍ. المتوفر: ${availFormatted}، المطلوب: ${currency}.`);
        }
    }
};

// ---------------------------

export const calcInventoryPreview = (
    startDate: string,
    endDate: string,
    records: Record[],
    expenses: Expense[],
    purchases: Purchase[],
    debtsList: DebtItem[],
    pricingConfig: PricingConfig,
    placeLoans: PlaceLoan[] = [],
    cashTransfers: CashTransfer[] = [] 
): InventorySnapshot | null => {
    
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return null;

    const isInRange = (dateStr: string) => dateStr >= startDate && dateStr <= endDate;

    const periodRecords = records.filter(r => {
        try {
            const rDateStr = new Date(r.startTime).toISOString().split('T')[0];
            return isInRange(rDateStr);
        } catch(e) { return false; }
    });

    // 1. Income Split
    const totalCashRevenue = periodRecords.reduce((s, r) => s + (r.cashPaid || 0), 0);
    const totalBankRevenue = periodRecords.reduce((s, r) => s + (r.bankPaid || 0), 0);
    const totalPaidRevenue = totalCashRevenue + totalBankRevenue;
    const totalDiscounts = periodRecords.reduce((s, r) => s + (r.discountApplied?.amount || 0), 0);
    
    const totalDebtRevenue = periodRecords.reduce((s, r) => s + (r.remainingDebt || 0), 0);
    const totalInvoice = periodRecords.reduce((s, r) => s + (r.totalInvoice || 0), 0);

    const totalPlaceCost = periodRecords.reduce((s, r) => s + (r.placeCost || 0), 0);
    const totalDrinksCost = periodRecords.reduce((s, r) => s + (r.drinksCost || 0), 0);
    const totalCardsCost = periodRecords.reduce((s, r) => s + (r.internetCardsCost || 0), 0);

    // Revenue Details for Report
    const revSessions = periodRecords.reduce((s, r) => s + (r.sessionInvoice || 0), 0);
    const revDrinks = periodRecords.reduce((s, r) => s + (r.drinksInvoice || 0), 0);
    const revCards = periodRecords.reduce((s, r) => s + (r.internetCardsInvoice || 0), 0);

    // 2. Expenses Split
    const periodExpenses = expenses.filter(e => e.date && isInRange(e.date));
    const periodPlacePurchases = purchases.filter(p => p.fundingSource === 'place' && p.date && isInRange(p.date));
    
    // Identify Partner Repayment Expenses
    const partnerRepaymentExpenses = periodExpenses.filter(e => {
        if (e.type !== 'loan_repayment') return false;
        const loan = placeLoans.find(l => l.payments.some(pay => pay.id === e.linkedLoanPaymentId));
        return loan && loan.lenderType === 'partner';
    });

    const partnerRepaymentIds = new Set(partnerRepaymentExpenses.map(e => e.id));

    // Calculate Operational Expenses (Excluding Partner Repayments)
    const trueOpsExpenses = periodExpenses.filter(e => !partnerRepaymentIds.has(e.id));

    const totalCashExpenses = trueOpsExpenses.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + (e.amount || 0), 0);
    const totalBankExpenses = trueOpsExpenses.filter(e => e.paymentMethod === 'bank').reduce((s, e) => s + (e.amount || 0), 0);
    
    const totalCashPurchases = periodPlacePurchases.filter(p => p.paymentMethod === 'cash').reduce((s, p) => s + (p.amount || 0), 0);
    const totalBankPurchases = periodPlacePurchases.filter(p => p.paymentMethod === 'bank').reduce((s, p) => s + (p.amount || 0), 0);

    const periodDebts = debtsList.filter(d => (d.debtSource === 'place' || !d.debtSource) && d.date && isInRange(d.date));
    const cashDebts = periodDebts.filter(d => d.debtChannel === 'cash').reduce((s, d) => s + (d.amount || 0), 0);
    const bankDebts = periodDebts.filter(d => d.debtChannel === 'bank').reduce((s, d) => s + (d.amount || 0), 0);

    // Partner Repayments totals
    const partnerCashRepaymentsTotal = partnerRepaymentExpenses.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + (e.amount || 0), 0);
    const partnerBankRepaymentsTotal = partnerRepaymentExpenses.filter(e => e.paymentMethod === 'bank').reduce((s, e) => s + (e.amount || 0), 0);

    // Cash Transfers (Liquidation to App)
    const periodTransfers = cashTransfers.filter(t => t.date && isInRange(t.date));
    const totalTransferred = periodTransfers.reduce((s, t) => s + t.amount, 0);

    // Net Cash/Bank In Place (Actual Drawer Count)
    // Substract Transfers from Cash, Add to Bank
    const netCashInPlace = totalCashRevenue - totalCashExpenses - totalCashPurchases - cashDebts - partnerCashRepaymentsTotal - totalTransferred;
    const netBankInPlace = totalBankRevenue - totalBankExpenses - totalBankPurchases - bankDebts - partnerBankRepaymentsTotal + totalTransferred;

    // Profit Calculation (Accrual-ish for Overhead)
    let allocatedFixedExpenses = 0;
    const fixedBreakdownMap = new Map<string, any>();
    let d = new Date(dStart);
    const fixedExpenses = expenses.filter(e => e.type === 'fixed');
    let loops = 0;
    while (d <= dEnd && loops < 366) {
        const dateKey = d.toISOString().split('T')[0];
        const dim = getDaysInMonth(dateKey);
        fixedExpenses.forEach(fe => {
            const dailyShare = (fe.amount || 0) / dim;
            allocatedFixedExpenses += dailyShare;
            const existing = fixedBreakdownMap.get(fe.id) || { amount: 0, days: 0, monthlyAmount: fe.amount };
            fixedBreakdownMap.set(fe.id, { amount: existing.amount + dailyShare, days: existing.days + 1, monthlyAmount: fe.amount });
        });
        d.setDate(d.getDate() + 1);
        loops++;
    }
    
    const oneTimeTotal = trueOpsExpenses.filter(e => e.type === 'one_time').reduce((s,e)=>s+(e.amount || 0), 0);
    const autoPurchasesTotal = trueOpsExpenses.filter(e => e.type === 'auto_purchase').reduce((s,e)=>s+(e.amount || 0), 0);

    const totalOverhead = allocatedFixedExpenses + oneTimeTotal + autoPurchasesTotal;
    const totalDirectCosts = totalPlaceCost + totalDrinksCost + totalCardsCost;
    
    const grossProfit = totalPaidRevenue - totalDirectCosts - totalOverhead;
    const devCut = grossProfit > 0 ? grossProfit * (pricingConfig.devPercent / 100) : 0;
    const netProfitPaid = grossProfit - devCut;

    const partnersList = [
        { id: 'abu_khaled', name: 'أبو خالد', percent: 0.34 },
        { id: 'khaled', name: 'خالد', percent: 0.33 },
        { id: 'abdullah', name: 'عبد الله', percent: 0.33 },
    ];

    const partners = partnersList.map(p => {
        const baseShare = Math.max(0, netProfitPaid * p.percent);
        
        // This implicitly distributes the 'Transferred' amount into the Bank Share because NetBank is higher
        const opsNetCash = netCashInPlace + partnerCashRepaymentsTotal + cashDebts;
        const opsNetBank = netBankInPlace + partnerBankRepaymentsTotal + bankDebts;
        const totalOpsNet = opsNetCash + opsNetBank;
        
        const cashRatio = totalOpsNet > 0 ? (opsNetCash / totalOpsNet) : 0;
        const bankRatio = totalOpsNet > 0 ? (opsNetBank / totalOpsNet) : 0;
        
        let cashShareAvailable = baseShare * cashRatio;
        let bankShareAvailable = baseShare * bankRatio;

        const reimbursements = purchases
            .filter(pur => pur.fundingSource === 'partner' && pur.buyer === p.id && pur.date && isInRange(pur.date))
            .reduce((s, pur) => s + (pur.amount || 0), 0);
        
        const myDebts = periodDebts.filter(d => d.partnerId === p.id);
        const myCashDebt = myDebts.filter(d => d.debtChannel === 'cash').reduce((s,d)=>s+(d.amount || 0), 0);
        const myBankDebt = myDebts.filter(d => d.debtChannel === 'bank').reduce((s,d)=>s+(d.amount || 0), 0);
        const placeDebtDeducted = myCashDebt + myBankDebt;

        const myRepayments = partnerRepaymentExpenses.filter(e => {
             const loan = placeLoans.find(l => l.payments.some(pay => pay.id === e.linkedLoanPaymentId));
             return loan?.partnerId === p.id;
        });
        
        const myCashRepayment = myRepayments.filter(e => e.paymentMethod === 'cash').reduce((s,e) => s + e.amount, 0);
        const myBankRepayment = myRepayments.filter(e => e.paymentMethod === 'bank').reduce((s,e) => s + e.amount, 0);

        let finalPayoutCash = (cashShareAvailable) - myCashDebt;
        let finalPayoutBank = (bankShareAvailable) - myBankDebt;
        
        finalPayoutCash += (reimbursements * cashRatio);
        finalPayoutBank += (reimbursements * bankRatio);

        const finalPayoutTotal = Math.max(0, finalPayoutCash + finalPayoutBank);

        return {
            name: p.name,
            sharePercent: p.percent,
            baseShare,
            cashShareAvailable,
            bankShareAvailable,
            purchasesReimbursement: reimbursements,
            placeDebtDeducted,
            loanRepaymentCash: myCashRepayment,
            loanRepaymentBank: myBankRepayment,
            finalPayoutCash,
            finalPayoutBank,
            finalPayoutTotal,
            remainingDebt: 0 
        };
    });

    const fixedDetails = Array.from(fixedBreakdownMap.entries()).map(([id, val]) => ({
        name: expenses.find(e => e.id === id)?.name || 'Unknown',
        amount: val.amount,
        dailyShare: val.monthlyAmount / (val.days > 0 ? getDaysInMonth(startDate) : 30),
        periodShare: val.amount
    }));

    return {
        id: generateId(),
        type: 'manual', // Default for preview
        archiveId: 'TEMP',
        archiveDate: new Date().toISOString(),
        periodStart: startDate,
        periodEnd: endDate,
        createdAt: Date.now(),
        totalPaidRevenue,
        totalCashRevenue,
        totalBankRevenue,
        totalDiscounts,
        totalDebtRevenue,
        totalInvoice,
        totalPlaceCost,
        totalDrinksCost,
        totalCardsCost,
        totalExpenses: totalOverhead,
        totalCashExpenses,
        totalBankExpenses,
        netCashInPlace,
        netBankInPlace,
        grossProfit,
        devCut,
        netProfitPaid,
        // Added devPercentSnapshot to fix property access error in InventoryArchive
        devPercentSnapshot: pricingConfig.devPercent,
        partners,
        
        // --- EXPANDED DETAILS ---
        revenueDetails: {
            sessions: revSessions,
            drinks: revDrinks,
            cards: revCards
        },
        expensesDetails: { 
            fixed: fixedDetails, 
            oneTime: trueOpsExpenses.filter(e => e.type === 'one_time').map(e=>({name:e.name, amount:e.amount, date:e.date!})), 
            autoPurchases: trueOpsExpenses.filter(e => e.type === 'auto_purchase').map(e=>({name:e.name, amount:e.amount, date:e.date!})),
            loanRepayments: periodExpenses.filter(e => e.type === 'loan_repayment').map(e => ({ name: e.name, amount: e.amount, date: e.date || '', channel: e.paymentMethod || 'cash' }))
        },
        bankSummary: [],
        debtsSummary: { totalDebt: totalDebtRevenue, totalRepaid: 0, remaining: totalDebtRevenue }
    };
};

// --- NEW: PARTNER LEDGER GENERATOR ---
export const generatePartnerLedger = (
    partnerId: string,
    snapshots: InventorySnapshot[],
    purchases: Purchase[],
    debtItems: DebtItem[],
    placeLoans: PlaceLoan[],
    cashTransfers: CashTransfer[] = []
): PartnerLedgerItem[] => {
    const items: PartnerLedgerItem[] = [];

    // 1. Profit Shares from Snapshots
    snapshots.forEach(snap => {
        const p = snap.partners.find(part => part.name === PARTNERS.find(x => x.id === partnerId)?.name);
        if (p) {
            // Cash Share (Credit)
            if (p.cashShareAvailable > 0) {
                items.push({
                    id: generateId(),
                    date: snap.periodEnd,
                    type: 'profit_share',
                    channel: 'cash',
                    amount: p.cashShareAvailable,
                    description: `حصة أرباح (كاش) - ${snap.archiveId || snap.periodEnd}`,
                    refId: snap.id
                });
            }
            // Bank Share (Credit)
            if (p.bankShareAvailable > 0) {
                items.push({
                    id: generateId(),
                    date: snap.periodEnd,
                    type: 'profit_share',
                    channel: 'bank',
                    amount: p.bankShareAvailable,
                    description: `حصة أرباح (بنك) - ${snap.archiveId || snap.periodEnd}`,
                    refId: snap.id
                });
            }
        }
    });

    // 2. Purchases (Reimbursements) -> Credit (+)
    purchases.filter(pur => pur.fundingSource === 'partner' && pur.buyer === partnerId).forEach(pur => {
        items.push({
            id: pur.id,
            date: pur.date,
            type: 'purchase_reimbursement',
            channel: pur.paymentMethod || 'cash', // Adjusted to respect actual payment method
            amount: pur.amount,
            description: `شراء للمكان: ${pur.name}`,
            refId: pur.id
        });
    });

    // 3. Withdrawals (Debts) -> Debit (-)
    debtItems.filter(d => d.partnerId === partnerId).forEach(d => {
        const isPlaceSource = d.debtSource === 'place' || !d.debtSource;
        if (isPlaceSource) {
            items.push({
                id: d.id,
                date: d.date,
                type: 'withdrawal',
                channel: d.debtChannel || 'cash',
                amount: -Math.abs(d.amount), // Debit
                description: `سحب من مال المكان: ${d.note || ''}`,
                refId: d.id
            });
        }
    });

    // 4. Place Loan Repayments (Place paying Partner) -> Credit (+) on Ledger
    placeLoans.filter(l => l.lenderType === 'partner' && l.partnerId === partnerId).forEach(loan => {
        loan.payments.forEach(pay => {
            items.push({
                id: pay.id,
                date: pay.date,
                type: 'loan_repayment',
                channel: pay.channel,
                amount: pay.amount, // Credit (Money Received)
                description: `سداد دين مكان (${loan.reason})`,
                refId: pay.id
            });
        });
    });

    // 5. Cash Transfers (Liquidation) -> Treated as a record of action
    // "I moved Cash to App".
    // This isn't technically income or expense for the *partner*, but a record of movement.
    // However, if we want to track "Total Cashed Out", we add it here.
    cashTransfers.filter(t => t.partnerId === partnerId).forEach(t => {
        items.push({
            id: t.id,
            date: t.date,
            type: 'cash_out_transfer',
            channel: 'cash',
            amount: t.amount, // Informational
            description: `تسييل كاش إلى التطبيق`,
            refId: t.id
        });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// --- NEW: REBUILD ARCHIVES ---
export const rebuildAllArchives = (
    currentSnapshots: InventorySnapshot[],
    records: Record[],
    expenses: Expense[],
    purchases: Purchase[],
    debtsList: DebtItem[],
    pricingConfig: PricingConfig,
    placeLoans: PlaceLoan[]
): InventorySnapshot[] => {
    return currentSnapshots.map(snap => {
        // Re-calculate based on the period stored in the snapshot
        const reCalc = calcInventoryPreview(
            snap.periodStart,
            snap.periodEnd,
            records,
            expenses,
            purchases,
            debtsList,
            pricingConfig,
            placeLoans,
            [] // Pass empty transfers for now, or need to pass real state if we persist transfers
        );
        
        if (reCalc) {
            return {
                ...reCalc,
                id: snap.id,
                type: snap.type || 'manual', // Preserve or Default to manual
                archiveId: snap.archiveId,
                createdAt: snap.createdAt // Keep original creation date
            };
        }
        return snap;
    });
};

export const auditSystem = (records: Record[], cycles: DayCycle[]) => {
    return { consistent: true, messages: [] };
};

const PARTNERS = [
    { id: 'abu_khaled', name: 'أبو خالد' },
    { id: 'khaled', name: 'خالد' },
    { id: 'abdullah', name: 'عبد الله' }
];
