import React from 'react';
import { BaseForm } from './BaseForm';

interface FormSectionProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    onAdd?: () => void;
    addButtonText?: string;
    className?: string;
    isCollapsible?: boolean;
    defaultExpanded?: boolean;
}

/**
 * FormSection wraps a section of the resume form with a title, icon, and add button
 */
export const FormSection: React.FC<FormSectionProps> = ({
    title,
    icon,
    children,
    onAdd,
    addButtonText,
    className = '',
    isCollapsible = false,
    defaultExpanded = true,
}) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    return (
        <BaseForm className={className}>
            <div className="flex items-center justify-between gap-4">
                <div
                    className={`flex grow items-center gap-2 ${isCollapsible ? 'cursor-pointer' : ''}`}
                    onClick={isCollapsible ? () => setIsExpanded(!isExpanded) : undefined}
                >
                    {icon && (
                        <span className="text-gray-500 dark:text-gray-400">
                            {icon}
                        </span>
                    )}
                    <h2 className="text-lg font-semibold tracking-wide text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    {isCollapsible && (
                        <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </div>
            </div>

            {(!isCollapsible || isExpanded) && (
                <>
                    <div className="mt-2">
                        {children}
                    </div>

                    {onAdd && addButtonText && (
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={onAdd}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors uppercase tracking-wide"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {addButtonText}
                            </button>
                        </div>
                    )}
                </>
            )}
        </BaseForm>
    );
};

interface FormItemProps {
    index: number;
    total: number;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    children: React.ReactNode;
    className?: string;
}

/**
 * FormItem wraps an individual item (e.g., one work experience) with controls
 */
export const FormItem: React.FC<FormItemProps> = ({
    index,
    total,
    onMoveUp,
    onMoveDown,
    onDelete,
    children,
    className = '',
}) => {
    const showMoveUp = index > 0;
    const showMoveDown = index < total - 1;

    return (
        <div className={`relative ${className}`}>
            {index > 0 && (
                <div className="mb-4 mt-2 border-t border-dashed border-gray-200 dark:border-gray-600" />
            )}

            <div className="grid grid-cols-6 gap-4">
                {children}

                {/* Controls */}
                <div className="absolute right-0 top-0 flex gap-1">
                    {showMoveUp && onMoveUp && (
                        <button
                            type="button"
                            onClick={onMoveUp}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Move up"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    )}
                    {showMoveDown && onMoveDown && (
                        <button
                            type="button"
                            onClick={onMoveDown}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Move down"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormSection;
