import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-95";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-lg shadow-blue-900/20",
    secondary: "bg-gray-700 hover:bg-gray-600 text-gray-100 focus:ring-gray-500 border border-gray-600",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg shadow-red-900/20",
    ghost: "bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white focus:ring-gray-500",
  };

  const sizes = {
    sm: "px-2 py-1 text-[10px] md:text-xs md:px-2.5 md:py-1.5",
    md: "px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm",
    lg: "px-5 py-2.5 text-sm md:px-6 md:py-3 md:text-base",
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