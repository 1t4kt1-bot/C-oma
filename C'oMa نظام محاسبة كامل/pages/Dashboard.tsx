
import React, { useState, useMemo, useEffect } from 'react';
import { Session, DeviceStatus, SystemState, Order, Customer, Record, PricingConfig, DayCycle, LedgerEntry } from '../types';
import { LogOut, Plus, Clock, User, StickyNote, Search, Coffee, Smartphone, Laptop, PieChart, Activity, Wallet, ChevronRight, Lock, Calendar, PlayCircle, Edit2, Trash2, Wifi, StopCircle, Package, Star, CreditCard, Banknote, Timer, Monitor, ArrowRightLeft, History, RotateCcw, Landmark, Box } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatDate, calculateOrdersTotal, formatCurrency, calculateTimeCost, getCurrentTimeOnly, mergeDateAndTime, getLocalDate, calculateSessionSegments } from '../utils';
import { getLedgerTotals, getLedgerBalance } from '../accounting_core';

interface DashboardProps {
  sessions: Session[];
  records?: Record[];
  dayCycles?: DayCycle[]; 
  onAddCustomer: () => void;
  onCheckout: (session: Session) => void;
  onAddDrink: (session: Session) => void;
  onNavigate: (view: any) => void;
  onCloseDay?: () => void; 
  systemState?: SystemState;
  onStartNewDay?: () => void;
  onInventory?: () => void; 
  onStartNewMonth?: () => void;
  onEditOrder: (session: Session, order: Order) => void;
  onDeleteOrder: (session: Session, orderId: string) => void;
  onDeviceChange: (sessionId: string, newDevice: DeviceStatus) => void;
  onUndoEvent: (sessionId: string) => void;
  onViewAudit: () => void;
  customers?: Customer[];
  pricingConfig?: PricingConfig;
  ledger?: LedgerEntry[];
}

const DeviceBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  const config = {
    mobile: { icon: Smartphone, text: 'جوال', color: 'bg-blue-100 text-blue-700' },
    laptop: { icon: Laptop, text: 'لابتوب', color: 'bg-indigo-100 text-indigo-700' },
  };
  const { icon: Icon, text, color } = config[status] || config.mobile;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>
      <Icon size={10} className="ml-1" />{text}
    </span>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
    sessions, 
    records = [],
    dayCycles = [], 
    onAddCustomer, 
    onCheckout, 
    onAddDrink, 
    onNavigate, 
    onCloseDay, 
    systemState, 
    onStartNewDay, 
    onInventory, 
    onEditOrder, 
    onDeleteOrder, 
    onDeviceChange,
    onUndoEvent,
    onViewAudit,
    customers = [],
    pricingConfig,
    ledger = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredSessions = sessions.filter(session => 
    session.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
      const today = getLocalDate();
      let estimatedOpenRevenue = 0;
      if (pricingConfig) {
          const nowIso = currentTime.toISOString(); 
          sessions.forEach(s => {
             const { totalCost } = calculateSessionSegments(
                 s.startTime, 
                 nowIso, 
                 s.events && s.events.length > 0 ? s.events[0].fromDevice : s.deviceStatus,
                 s.events || [],
                 pricingConfig
             );
             estimatedOpenRevenue += (totalCost + calculateOrdersTotal(s.orders));
          });
      }
      const bankBalance = getLedgerBalance(ledger, 'bank');
      const cashBalance = getLedgerBalance(ledger, 'cash');
      const ledgerStatsToday = getLedgerTotals(ledger, 'today', today);
      const sessionCountToday = records.filter(r => r.startTime.startsWith(today)).length;

      return {
          openRevenue: Math.round(estimatedOpenRevenue),
          bankBalance: bankBalance || 0,
          cashBalance: cashBalance || 0,
          collectedToday: ledgerStatsToday.income || 0,
          totalActive: sessions.length,
          totalToday: sessionCountToday + sessions.length
      };
  }, [sessions, ledger, pricingConfig, currentTime, records]);
  
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* 1. Quick Control Component (The Re-added UI piece) */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                  <span className="text-gray-400 text-sm font-bold">النظام متصل</span>
              </div>
              <h3 className="text-gray-600 font-bold text-lg">التحكم السريع</h3>
          </div>

          <div className="space-y-4">
              {systemState?.activeCycleId ? (
                  <Button 
                    onClick={onCloseDay} 
                    className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
                  >
                      <StopCircle size={24} />
                      إغلاق الدورة / اليوم
                  </Button>
              ) : (
                  <Button 
                    onClick={onStartNewDay} 
                    className="w-full py-4 text-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
                  >
                      <PlayCircle size={24} />
                      فتح دورة / يوم جديد
                  </Button>
              )}

              <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => onNavigate('records')}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors text-gray-500 hover:text-indigo-600 group"
                  >
                      <History size={20} className="mb-1 group-hover:scale-110 transition-transform"/>
                      <span className="text-sm font-bold">السجل</span>
                  </button>
                  <button 
                    onClick={onInventory}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors text-gray-500 hover:text-indigo-600 group"
                  >
                      <Box size={20} className="mb-1 group-hover:scale-110 transition-transform"/>
                      <span className="text-sm font-bold">الجرد</span>
                  </button>
                  <button 
                    onClick={() => onNavigate('cost_analysis')}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors text-gray-500 hover:text-indigo-600 group"
                  >
                      <PieChart size={20} className="mb-1 group-hover:scale-110 transition-transform"/>
                      <span className="text-sm font-bold">التقارير</span>
                  </button>
              </div>
          </div>
      </div>

      {/* 2. Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-100 relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('treasury')}>
              <div className="relative z-10">
                  <p className="text-indigo-100 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                      <Landmark size={12}/> صافي البنك/التطبيق
                  </p>
                  <h3 className="text-2xl font-black">{formatCurrency(stats.bankBalance)}</h3>
              </div>
              <Landmark size={64} className="absolute -left-2 -bottom-2 text-white opacity-10 group-hover:opacity-20 transition-opacity" />
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
              <div className="relative z-10">
                  <p className="text-gray-400 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                      <Banknote size={12} className="text-emerald-500"/> صافي الكاش (الدرج)
                  </p>
                  <h3 className="text-2xl font-black text-emerald-700">{formatCurrency(stats.cashBalance)}</h3>
              </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                  <p className="text-gray-400 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                      <Timer size={12} className="text-indigo-500"/> دخل متوقع (جلسات)
                  </p>
                  <h3 className="text-2xl font-black text-gray-800">{formatCurrency(stats.openRevenue)}</h3>
              </div>
          </div>
      </div>

      {/* 3. Active Sessions Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                الجلسات الحالية
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">{sessions.length}</span>
            </h2>
          </div>
          <div className="flex w-full sm:w-auto gap-3">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="بحث..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="block w-full rounded-xl border-0 bg-white py-2.5 pr-10 text-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600 shadow-sm" 
                />
             </div>
             <Button onClick={onAddCustomer} className="shadow-lg shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700" disabled={!systemState?.activeCycleId}>
                <Plus className="ml-1 w-5 h-5" /> جديد
             </Button>
          </div>
        </div>

        {/* 4. Session Cards Grid */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">لا يوجد جلسات نشطة</h3>
            <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة زبون جديد لبدء الاحتساب.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredSessions.map((session) => {
              const ordersTotal = calculateOrdersTotal(session.orders || []);
              const customerInfo = customers.find(c => c.phone === session.customerPhone);
              
              let liveCost = 0;
              if (pricingConfig) {
                  const nowIso = new Date().toISOString();
                  const { totalCost } = calculateSessionSegments(
                      session.startTime, 
                      nowIso, 
                      session.events && session.events.length > 0 ? session.events[0].fromDevice : session.deviceStatus,
                      session.events || [],
                      pricingConfig
                  );
                  liveCost = totalCost;
              }

              return (
                <div key={session.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group flex flex-col h-full relative overflow-hidden">
                  
                  <div className={`absolute top-0 left-0 right-0 h-1 ${session.deviceStatus === 'mobile' ? 'bg-blue-500' : 'bg-indigo-500'}`}></div>

                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl relative ${session.deviceStatus === 'mobile' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              <User size={24} />
                              {customerInfo?.isVIP && (
                                  <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-300 to-yellow-500 p-0.5 rounded-full border border-white shadow-sm">
                                      <Star size={10} className="text-white fill-white"/>
                                  </div>
                              )}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-gray-900 leading-tight">{session.customerName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                  <DeviceBadge status={session.deviceStatus} />
                                  <span className="text-[10px] text-gray-400 flex items-center bg-gray-50 px-1.5 py-0.5 rounded">
                                      <Clock size={10} className="ml-1" /> {formatDate(session.startTime)}
                                  </span>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="mb-4 flex gap-2">
                      {session.deviceStatus === 'mobile' ? (
                          <button 
                            onClick={() => onDeviceChange(session.id, 'laptop')}
                            className="flex-1 text-xs bg-indigo-50 text-indigo-700 py-1.5 px-2 rounded-lg border border-indigo-100 font-bold flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors"
                          >
                             <Monitor size={12}/> شبك اللابتوب
                          </button>
                      ) : (
                          <button 
                            onClick={() => onDeviceChange(session.id, 'mobile')}
                            className="flex-1 text-xs bg-blue-50 text-blue-700 py-1.5 px-2 rounded-lg border border-blue-100 font-bold flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors"
                          >
                             <Smartphone size={12}/> فصل اللابتوب
                          </button>
                      )}
                      
                      {session.events && session.events.length > 0 && (
                          <button 
                              onClick={() => onUndoEvent(session.id)}
                              className="px-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors"
                              title="تراجع عن آخر تغيير"
                          >
                              <RotateCcw size={14} />
                          </button>
                      )}
                  </div>

                  {customerInfo && (customerInfo.creditBalance > 0 || customerInfo.debtBalance > 0) && (
                      <div className="flex gap-2 mb-3 text-[10px] font-bold">
                          {customerInfo.creditBalance > 0 && <span className="bg-green-50 text-green-700 px-2 py-1 rounded">رصيد: {formatCurrency(customerInfo.creditBalance)}</span>}
                          {customerInfo.debtBalance > 0 && <span className="bg-red-50 text-red-700 px-2 py-1 rounded">دين: {formatCurrency(customerInfo.debtBalance)}</span>}
                      </div>
                  )}

                  {session.notes && (
                      <div className="mb-4 bg-yellow-50/50 border border-yellow-100 p-2 rounded-lg flex items-start text-xs text-yellow-800">
                          <StickyNote size={12} className="ml-1.5 mt-0.5 flex-shrink-0 opacity-50" />
                          <p className="line-clamp-2">{session.notes}</p>
                      </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">الفاتورة الحالية</span>
                        <div className="flex gap-2">
                            <span className="text-sm font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded" title="تكلفة الوقت">{formatCurrency(liveCost)}</span>
                            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded" title="الطلبات">{formatCurrency(ordersTotal)}</span>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-2 min-h-[60px] max-h-[120px] overflow-y-auto no-scrollbar space-y-1 mb-4 border border-gray-100">
                        {session.orders && session.orders.length > 0 ? (
                            session.orders.map(order => (
                                <div key={order.id} className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-gray-100 shadow-sm group/order">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                        {order.type === 'internet_card' ? <Wifi size={12} className="text-blue-500"/> : <Coffee size={12} className="text-amber-500"/>}
                                        <span><span className="font-bold text-indigo-600">{order.quantity}x</span> {order.itemName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-800">{formatCurrency(order.priceAtOrder * order.quantity)}</span>
                                        <div className="flex opacity-0 group-hover/order:opacity-100 transition-opacity">
                                            <button onClick={() => onEditOrder(session, order)} className="text-blue-500 p-0.5 hover:bg-blue-50 rounded"><Edit2 size={12}/></button>
                                            <button onClick={() => onDeleteOrder(session, order.id)} className="text-red-500 p-0.5 hover:bg-red-50 rounded"><Trash2 size={12}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 text-xs py-2">
                                <Coffee size={16} className="mb-1 opacity-50"/>
                                لا يوجد طلبات
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mt-auto pt-4 border-t border-gray-100">
                     <Button onClick={() => onAddDrink(session)} variant="secondary" className="col-span-2 text-xs bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700" disabled={!systemState?.activeCycleId}>
                        <Plus size={14} className="ml-1" /> طلب
                     </Button>
                     <Button onClick={() => onCheckout(session)} className="col-span-3 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100" disabled={!systemState?.activeCycleId}>
                        <LogOut size={14} className="ml-1" /> إغلاق الحساب
                     </Button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
