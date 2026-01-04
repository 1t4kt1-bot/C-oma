
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ToastProps {
  msg: string;
  type: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ msg, type }) => {
  // Use createPortal to render outside the main app root, avoiding backdrop filters/blur
  return createPortal(
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-[9999] text-white font-bold animate-bounce flex items-center gap-3 min-w-[300px] justify-center transition-all duration-300 ${type === 'error' ? 'bg-red-600' : 'bg-indigo-600'}`}>
      {type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
      <span>{msg}</span>
    </div>,
    document.body
  );
};

export default Toast;
