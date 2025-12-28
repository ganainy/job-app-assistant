// Resume Builder Types
// Simplified types that work with JsonResumeSchema but are easier to work with in forms

import { JsonResumeSchema } from '../../../../server/src/types/jsonresume';

export interface ResumeBuilderProps {
    data: JsonResumeSchema;
    onChange: (data: JsonResumeSchema) => void;
    onImproveSection?: (sectionName: string, sectionIndex: number, originalData: any, customInstructions?: string) => void;
    improvingSections?: Record<string, boolean>;
}

export interface FormSectionProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    onAdd?: () => void;
    addButtonText?: string;
    className?: string;
}

export interface InputProps {
    label: string;
    name: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    className?: string;
    labelClassName?: string;
    type?: 'text' | 'email' | 'tel' | 'url' | 'date';
}

export interface TextareaProps {
    label: string;
    name: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    className?: string;
    labelClassName?: string;
    rows?: number;
}

export interface BulletListTextareaProps {
    label: string;
    name: string;
    value: string[];
    placeholder?: string;
    onChange: (value: string[]) => void;
    className?: string;
    labelClassName?: string;
}

export interface FormItemControlsProps {
    index: number;
    total: number;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    showDelete?: boolean;
}

export type SectionType =
    | 'profile'
    | 'work'
    | 'education'
    | 'skills'
    | 'projects'
    | 'languages'
    | 'certificates';
