import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200';
  
  const variantClasses = {
    default: 'border-transparent bg-blue-500 text-white shadow-sm hover:bg-blue-600',
    secondary: 'border-transparent bg-gray-200 text-gray-800 shadow-sm hover:bg-gray-300',
    destructive: 'border-transparent bg-red-500 text-white shadow-sm hover:bg-red-600',
    outline: 'text-gray-900 border-gray-300 bg-white hover:bg-gray-50',
  };
  
  return (
    <div 
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    />
  );
};

