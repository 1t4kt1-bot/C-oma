import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Base styles: Focus rings, transitions, centering, font weight
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  
  const variants = {
    // Primary: High contrast Indigo background, White text
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 border border-transparent",
    
    // Secondary: White background, Dark text, Visible Border
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:ring-gray-500",
    
    // Danger: Red background, White text
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent",
    
    // Success: Green background, White text (for Archiving/Confirming)
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 border border-transparent",

    // Outline: Transparent bg, colored border (usually for low priority actions)
    outline: "bg-transparent text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;