import React, { useRef, useEffect } from 'react';

// Common input class styles
const INPUT_CLASSES =
    'mt-1 px-3 py-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';

interface InputGroupWrapperProps {
    label: string;
    className?: string;
    children: React.ReactNode;
}

/**
 * Wraps an input with a label
 */
export const InputGroupWrapper: React.FC<InputGroupWrapperProps> = ({
    label,
    className = '',
    children,
}) => (
    <label className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}>
        {label}
        {children}
    </label>
);

interface InputProps {
    label: string;
    name: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    labelClassName?: string;
    type?: 'text' | 'email' | 'tel' | 'url' | 'date';
}

/**
 * Standard text input with label
 */
export const Input: React.FC<InputProps> = ({
    label,
    name,
    value,
    placeholder = '',
    onChange,
    labelClassName = '',
    type = 'text',
}) => {
    return (
        <InputGroupWrapper label={label} className={labelClassName}>
            <input
                type={type}
                name={name}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className={INPUT_CLASSES}
            />
        </InputGroupWrapper>
    );
};

interface TextareaProps {
    label: string;
    name: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    labelClassName?: string;
    rows?: number;
}

/**
 * Auto-resizing textarea with label
 */
export const Textarea: React.FC<TextareaProps> = ({
    label,
    name,
    value,
    placeholder = '',
    onChange,
    labelClassName = '',
    rows = 3,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [value]);

    return (
        <InputGroupWrapper label={label} className={labelClassName}>
            <textarea
                ref={textareaRef}
                name={name}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                className={`${INPUT_CLASSES} resize-none overflow-hidden`}
            />
        </InputGroupWrapper>
    );
};

interface BulletListTextareaProps {
    label: string;
    name: string;
    value: string[];
    placeholder?: string;
    onChange: (value: string[]) => void;
    labelClassName?: string;
}

/**
 * Textarea where each line is treated as a bullet point
 */
export const BulletListTextarea: React.FC<BulletListTextareaProps> = ({
    label,
    name,
    value = [],
    placeholder = '',
    onChange,
    labelClassName = '',
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Convert array to bullet-prefixed text
    const textValue = value.map(item => `• ${item}`).join('\n') || '• ';

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.max(textarea.scrollHeight, 80)}px`;
        }
    }, [textValue]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;

        // Split by newlines and process each line
        const lines = text.split('\n');
        const bulletPoints: string[] = [];

        for (const line of lines) {
            // Remove bullet prefix if present, then add item
            let cleanLine = line.replace(/^[•·\-\*]\s*/, '').trim();
            if (cleanLine || lines.length === 1) {
                bulletPoints.push(cleanLine);
            }
        }

        onChange(bulletPoints.filter(bp => bp.length > 0 || bulletPoints.length === 1));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const textarea = e.currentTarget;
            const cursorPos = textarea.selectionStart;
            const textBefore = textarea.value.substring(0, cursorPos);
            const textAfter = textarea.value.substring(textarea.selectionEnd);

            // Insert new bullet point
            const newValue = textBefore + '\n• ' + textAfter;

            // Update through the normal handler
            const syntheticEvent = {
                target: { value: newValue },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleChange(syntheticEvent);

            // Set cursor position after the new bullet
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = cursorPos + 3;
            }, 0);
        }
    };

    return (
        <InputGroupWrapper label={label} className={labelClassName}>
            <textarea
                ref={textareaRef}
                name={name}
                value={textValue}
                placeholder={placeholder || '• Add bullet point'}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className={`${INPUT_CLASSES} resize-none min-h-[80px] pl-2`}
            />
        </InputGroupWrapper>
    );
};

export { INPUT_CLASSES };
