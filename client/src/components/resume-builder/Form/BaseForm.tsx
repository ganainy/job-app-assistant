import React from 'react';

interface BaseFormProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Base wrapper for form sections with consistent styling
 */
export const BaseForm: React.FC<BaseFormProps> = ({ children, className = '' }) => {
    return (
        <section
            className={`flex flex-col gap-3 rounded-lg bg-white dark:bg-gray-800 p-6 pt-4 shadow-md border border-gray-100 dark:border-gray-700 transition-all duration-200 ${className}`}
        >
            {children}
        </section>
    );
};

export default BaseForm;
