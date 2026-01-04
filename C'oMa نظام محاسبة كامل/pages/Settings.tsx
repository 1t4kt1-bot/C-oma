
import React, { useState, useEffect } from 'react';
import { PricingConfig } from '../types';
import { Save, Info, AlertCircle, DollarSign, ShieldAlert } from 'lucide-react';
import Button from '../components/ui/Button';

interface SettingsProps {
  pricingConfig: PricingConfig;
  onUpdatePricing: (config: PricingConfig) => void;
}

const SettingField = ({ 
  label, 
  value, 
  onChange, 
  unit, 
  placeholder, 
  helpText, 
  step = "0.1" 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  unit?: string; 
  placeholder?: string; 
  helpText?: string;
  step?: string;
}) => (
  <div className="mb-4">
    <label className="block text-sm font-bold text-gray-800 mb-1">
      {label} {unit && <span className="text-gray-500 font-normal text-xs">({unit})</span>}
    </label>
    <div className="relative">
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors shadow-sm"
      />
      {unit && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-xs">{unit}</span>
        </div>
      )}
    </div>
    {helpText && (
      <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
        <Info size={12} /> {helpText}
      </p>
    )}
  </div>
);

const Settings: React.FC<SettingsProps> = ({ 
  pricingConfig,
  onUpdatePricing,
}) => {
  // Pricing State
  const [mobileRate, setMobileRate] = useState(pricingConfig.mobileRate.toString());
  const [laptopRate, setLaptopRate] = useState(pricingConfig.laptopRate.toString());
  const [mobilePlaceCost, setMobilePlaceCost] = useState(pricingConfig.mobilePlaceCost.toString());
  const [laptopPlaceCost, setLaptopPlaceCost] = useState(pricingConfig.laptopPlaceCost.toString());
  const [devPercent, setDevPercent] = useState(pricingConfig.devPercent.toString());
  const [isPriceSaved, setIsPriceSaved] = useState(false);

  useEffect(() => {
    setMobileRate(pricingConfig.mobileRate.toString());
    setLaptopRate(pricingConfig.laptopRate.toString());
    setMobilePlaceCost(pricingConfig.mobilePlaceCost.toString());
    setLaptopPlaceCost(pricingConfig.laptopPlaceCost.toString());
    setDevPercent(pricingConfig.devPercent.toString());
  }, [pricingConfig]);

  const handleSavePricing = () => {
    const mRate = parseFloat(mobileRate);
    const lRate = parseFloat(laptopRate);
    const mCost = parseFloat(mobilePlaceCost);
    const lCost = parseFloat(laptopPlaceCost);
    const dev = parseFloat(devPercent);

    if ([mRate, lRate, mCost, lCost, dev].some(v => isNaN(v) || v < 0)) {
      alert('الرجاء إدخال أرقام صحيحة وموجبة في جميع الحقول.');
      return;
    }

    onUpdatePricing({
      mobileRate: mRate,
      laptopRate: lRate,
      mobilePlaceCost: mCost,
      laptopPlaceCost: lCost,
      devPercent: dev
    });

    setIsPriceSaved(true);
    setTimeout(() => setIsPriceSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      
      <div className="flex items-center gap-2 mb-4">
         <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
           <DollarSign size={24} />
         </div>
         <div>
            <h2 className="text-2xl font-bold text-gray-800">الإعدادات العامة</h2>
            <p className="text-gray-500 text-sm">تعديل أسعار الساعات والتكاليف التشغيلية.</p>
         </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2 mb-2 text-sm">أسعار الزبائن (الإيرادات)</h3>
              <SettingField label="سعر ساعة الجوال للزبون" unit="₪/ساعة" value={mobileRate} onChange={setMobileRate} placeholder="مثال: 10" helpText="المبلغ الذي يدفعه الزبون عن كل ساعة." />
              <SettingField label="سعر ساعة جوال + لابتوب للزبون" unit="₪/ساعة" value={laptopRate} onChange={setLaptopRate} placeholder="مثال: 15" helpText="سعر أعلى لاستخدام اللابتوب." />
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2 mb-2 text-sm">تكلفة المكان التشغيلية (مصاريف)</h3>
              <SettingField label="تكلفة ساعة الجوال على المكان" unit="₪/ساعة" value={mobilePlaceCost} onChange={setMobilePlaceCost} placeholder="مثال: 0.5" helpText="كهرباء، نت، استهلاك (تخصم من الربح)." />
              <SettingField label="تكلفة ساعة جوال + لابتوب على المكان" unit="₪/ساعة" value={laptopPlaceCost} onChange={setLaptopPlaceCost} placeholder="مثال: 1.2" helpText="تكلفة أعلى لاستهلاك الطاقة والمساحة." />
           </div>

           <div className="space-y-4 md:col-span-2">
              <h3 className="font-bold text-gray-700 border-b pb-2 mb-2 text-sm">توزيع الأرباح</h3>
              <div className="max-w-md">
                 <SettingField label="نسبة التطوير" unit="%" value={devPercent} onChange={setDevPercent} placeholder="مثال: 15" step="1" helpText="تُخصم من الربح الإجمالي قبل توزيع الحصص." />
              </div>
              <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-800 border border-amber-100 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>
                  تنبيه: تغيير هذه الإعدادات سيطبق فقط على <strong>الجلسات الجديدة</strong>. السجلات القديمة ستحتفظ بالأسعار التي كانت سارية وقت إنشائها.
                </span>
              </div>
           </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
           <Button onClick={handleSavePricing} className="flex items-center shadow-sm w-full md:w-auto justify-center min-w-[200px]">
             <Save size={18} className="ml-2" />
             {isPriceSaved ? 'تم الحفظ بنجاح' : 'حفظ الإعدادات'}
           </Button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
