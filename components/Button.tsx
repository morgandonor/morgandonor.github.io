import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
  label?: string;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  icon, 
  label, 
  fullWidth = false, 
  className = '', 
  children,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none touch-manipulation";
  
  const variants = {
    primary: "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50",
    ghost: "bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`} 
      {...props}
    >
      {icon && <span className={label || children ? "mr-2" : ""}>{icon}</span>}
      {label || children}
    </button>
  );
};

export default Button;