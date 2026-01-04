
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Coffee, 
  ShoppingBag, 
  Wallet, 
  Receipt, 
  History, 
  Settings, 
  Menu, 
  X, 
  PieChart, 
  Archive,
  Wifi,
  Landmark,
  Crown,
  ClipboardList,
  Briefcase,
  Users,
  Search,
  Bell,
  Banknote,
  Database,
  ShieldCheck
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const NavItem = ({ id, label, icon: Icon, active, onClick, badge }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center justify-between w-full px-4 py-3.5 rounded-2xl transition-all duration-300 group font-bold text-sm relative overflow-hidden ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-indigo-600'
    }`}
  >
    <div className="flex items-center gap-3 z-10">
        <Icon size={20} className={`transition-colors duration-300 ${active ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'}`} />
        <span>{label}</span>
    </div>
    {badge && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
            {badge}
        </span>
    )}
    {active && <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-100 -z-0"></div>}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'vip_customers', label: 'الزبائن والديون', icon: Crown },
    { id: 'records', label: 'سجل الجلسات', icon: History },
    { id: 'summary', label: 'ملخص اليوم', icon: ClipboardList },
    { id: 'drinks', label: 'المشروبات', icon: Coffee },
    { id: 'internet_cards', label: 'بطاقات النت', icon: Wifi },
    { id: 'expenses', label: 'المصاريف', icon: Receipt },
    { id: 'place_loans', label: 'ديون المكان', icon: Briefcase }, 
    { id: 'purchases', label: 'المشتريات', icon: ShoppingBag },
    { id: 'partners', label: 'الشركاء والأرباح', icon: Users }, 
    { id: 'partner_debts', label: 'مسحوبات الشركاء', icon: Wallet },
    { id: 'cost_analysis', label: 'التحليل المالي', icon: PieChart },
    { id: 'inventory_archive', label: 'الأرشيف الشهري', icon: Archive },
    { id: 'treasury', label: 'الصندوق', icon: Banknote }, 
    { id: 'ledger_viewer', label: 'دفتر الأستاذ', icon: ShieldCheck },
    { id: 'audit_log', label: 'سجل العمليات', icon: ClipboardList },
    { id: 'backup_restore', label: 'النسخ الاحتياطي', icon: Database },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const BrandLogo = ({ textSize = "text-xl" }: { textSize?: string }) => (
    <span dir="ltr" className={`${textSize} font-black text-gray-800 tracking-tighter flex items-center gap-1`} style={{ fontFamily: 'Tajawal, sans-serif' }}>
      <span className="text-indigo-600 text-2xl">C</span>o'Ma
    </span>
  );

  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-800">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-l border-gray-100 h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30">
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                 <LayoutDashboard size={20}/>
             </div>
             <div>
                <BrandLogo textSize="text-2xl" />
                <p className="text-[10px] text-gray-400 font-bold tracking-wide">WORKSPACE MANAGER</p>
             </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 no-scrollbar">
          {navItems.map((item, idx) => (
              <React.Fragment key={item.id}>
                  {idx === 0 && <p className="px-4 text-[10px] font-extrabold text-gray-300 mb-2 mt-2 uppercase tracking-wider">الرئيسية</p>}
                  {idx === 4 && <p className="px-4 text-[10px] font-extrabold text-gray-300 mb-2 mt-6 uppercase tracking-wider">المنتجات</p>}
                  {idx === 6 && <p className="px-4 text-[10px] font-extrabold text-gray-300 mb-2 mt-6 uppercase tracking-wider">المالية</p>}
                  {idx === 11 && <p className="px-4 text-[10px] font-extrabold text-gray-300 mb-2 mt-6 uppercase tracking-wider">التقارير</p>}
                  {idx === 14 && <p className="px-4 text-[10px] font-extrabold text-gray-300 mb-2 mt-6 uppercase tracking-wider">أدوات الإدارة</p>}
                  <NavItem {...item} active={activeView === item.id} onClick={onNavigate} />
              </React.Fragment>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header Mobile */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 z-20 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
               <LayoutDashboard size={16} />
            </div>
            <BrandLogo textSize="text-lg" />
          </div>
          <button className="relative p-2 text-gray-500">
              <Bell size={20} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 scroll-smooth">
           <div className="max-w-7xl mx-auto">
             {children}
           </div>
        </main>

        {/* Bottom Navigation (Mobile) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 flex justify-around items-end h-20 px-2 z-30 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           <button onClick={() => onNavigate('dashboard')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeView === 'dashboard' ? 'text-indigo-600 -translate-y-1' : 'text-gray-400'}`}>
              <LayoutDashboard size={24} strokeWidth={activeView === 'dashboard' ? 2.5 : 2} className={activeView === 'dashboard' ? 'fill-indigo-100' : ''} />
              <span className="text-[10px] font-bold mt-1">الرئيسية</span>
           </button>
           <button onClick={() => onNavigate('records')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeView === 'records' ? 'text-indigo-600 -translate-y-1' : 'text-gray-400'}`}>
              <History size={24} strokeWidth={activeView === 'records' ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1">السجلات</span>
           </button>
           
           <div className="relative -top-5">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="bg-indigo-900 text-white w-14 h-14 rounded-full shadow-2xl shadow-indigo-400 flex items-center justify-center transform transition-transform active:scale-95 border-4 border-[#F3F4F6]"
              >
                <Menu size={24} />
              </button>
           </div>

           <button onClick={() => onNavigate('vip_customers')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeView === 'vip_customers' ? 'text-indigo-600 -translate-y-1' : 'text-gray-400'}`}>
              <Users size={24} strokeWidth={activeView === 'vip_customers' ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1">الزبائن</span>
           </button>
           <button onClick={() => onNavigate('cost_analysis')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeView === 'cost_analysis' ? 'text-indigo-600 -translate-y-1' : 'text-gray-400'}`}>
              <PieChart size={24} strokeWidth={activeView === 'cost_analysis' ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1">التقارير</span>
           </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative bg-white w-full rounded-t-[32px] p-6 animate-slide-up max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            
            <h3 className="font-extrabold text-xl text-gray-800 mb-6 px-2">القائمة الكاملة</h3>
            
            <div className="grid grid-cols-3 gap-3">
               {navItems.map(item => (
                 <button 
                    key={item.id} 
                    onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                        activeView === item.id 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                        : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200 hover:shadow-sm'
                    }`}
                 >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${activeView === item.id ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-50 text-gray-400'}`}>
                        <item.icon size={20} />
                    </div>
                    <span className="text-[11px] font-bold text-center">{item.label}</span>
                 </button>
               ))}
            </div>
            
            <button onClick={() => setIsMobileMenuOpen(false)} className="mt-8 w-full py-4 bg-gray-100 rounded-xl text-gray-500 font-bold">
                إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
