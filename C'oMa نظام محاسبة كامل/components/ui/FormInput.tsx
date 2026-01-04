
import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  unit?: string;
  helpText?: string;
  error?: string;
  as?: 'input' | 'select' | 'textarea';
  children?: React.ReactNode;
}

const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  unit, 
  helpText, 
  error, 
  className = '', 
  as = 'input',
  children,
  ...props 
}) => {
  const baseInputStyles = `
    block w-full rounded-lg border 
    bg-white p-3 text-sm text-gray-900 
    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none 
    transition-all duration-200 shadow-sm
    disabled:bg-gray-100 disabled:text-gray-500
    ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300'}
    ${unit ? 'pl-10' : ''}
  `;

  return (
    <div className={`mb-5 ${className}`}>
      <label className="block text-sm font-bold text-gray-800 mb-1.5">
        {label}
      </label>
      
      <div className="relative">
        {as === 'select' ? (
           <select className={baseInputStyles} {...(props as any)}>
             {children}
           </select>
        ) : (
           <input className={baseInputStyles} {...props} />
        )}
        
        {unit && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-xs font-bold bg-gray-50 px-2 py-1 rounded border border-gray-200">
              {unit}
            </span>
          </div>
        )}
      </div>

      {helpText && !error && (
        <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
          {helpText}
        </p>
      )}
      
      {error && (
        <p className="mt-1.5 text-xs text-red-600 font-medium animate-pulse">
          * {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;
