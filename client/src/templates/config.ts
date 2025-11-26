import { ForwardRefExoticComponent, RefAttributes } from 'react';
import { ResumeData } from '../utils/cvDataTransform';
import ModernCleanResume from './ModernCleanResume';
import ATSOptimizedResume from './ATSOptimizedResume';
import ClassicProfessionalResume from './ClassicProfessionalResume';
import MinimalistResume from './MinimalistResume';
import BoldCreativeResume from './BoldCreativeResume';
import CorporateProfessionalResume from './CorporateProfessionalResume';
import CreativeDesignResume from './CreativeDesignResume';
import ElegantMinimalistResume from './ElegantMinimalistResume';
import ElitePremiumResume from './ElitePremiumResume';
import EngineeringResume from './EngineeringResume';
import ModernA4Resume from './ModernA4Resume';
import ModernTwoColumnResume from './ModernTwoColumnResume';
import SoftwareEngineerResume from './SoftwareEngineerResume';

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'modern' | 'ats-optimized' | 'minimalist';
  previewImage?: string;
  component: ForwardRefExoticComponent<{ data: ResumeData } & RefAttributes<HTMLDivElement>>;
}

export const TEMPLATES: Record<string, TemplateConfig> = {
  'modern-clean': {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'A clean, modern design with excellent readability',
    category: 'modern',
    component: ModernCleanResume,
  },
  'ats-optimized': {
    id: 'ats-optimized',
    name: 'ATS Optimized',
    description: 'Designed for maximum ATS compatibility',
    category: 'ats-optimized',
    component: ATSOptimizedResume,
  },
  'classic-professional': {
    id: 'classic-professional',
    name: 'Classic Professional',
    description: 'Traditional professional layout',
    category: 'professional',
    component: ClassicProfessionalResume,
  },
  'minimalist': {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Simple and elegant minimalist design',
    category: 'minimalist',
    component: MinimalistResume,
  },
  'bold-creative': {
    id: 'bold-creative',
    name: 'Bold Creative',
    description: 'Bold and creative design for creative professionals',
    category: 'creative',
    component: BoldCreativeResume,
  },
  'corporate-professional': {
    id: 'corporate-professional',
    name: 'Corporate Professional',
    description: 'Professional corporate style',
    category: 'professional',
    component: CorporateProfessionalResume,
  },
  'creative-design': {
    id: 'creative-design',
    name: 'Creative Design',
    description: 'Creative design for designers and artists',
    category: 'creative',
    component: CreativeDesignResume,
  },
  'elegant-minimalist': {
    id: 'elegant-minimalist',
    name: 'Elegant Minimalist',
    description: 'Elegant minimalist design',
    category: 'minimalist',
    component: ElegantMinimalistResume,
  },
  'elite-premium': {
    id: 'elite-premium',
    name: 'Elite Premium',
    description: 'Premium design for executives',
    category: 'professional',
    component: ElitePremiumResume,
  },
  'engineering': {
    id: 'engineering',
    name: 'Engineering',
    description: 'Designed for engineering professionals',
    category: 'professional',
    component: EngineeringResume,
  },
  'modern-a4': {
    id: 'modern-a4',
    name: 'Modern A4',
    description: 'Modern A4 format design',
    category: 'modern',
    component: ModernA4Resume,
  },
  'modern-two-column': {
    id: 'modern-two-column',
    name: 'Modern Two Column',
    description: 'Modern two-column layout',
    category: 'modern',
    component: ModernTwoColumnResume,
  },
  'software-engineer': {
    id: 'software-engineer',
    name: 'Software Engineer',
    description: 'Optimized for software engineers',
    category: 'professional',
    component: SoftwareEngineerResume,
  },
};

export const getTemplate = (id: string): TemplateConfig | undefined => {
  return TEMPLATES[id];
};

export const getAllTemplates = (): TemplateConfig[] => {
  return Object.values(TEMPLATES);
};

export const getTemplatesByCategory = (category: TemplateConfig['category']): TemplateConfig[] => {
  return Object.values(TEMPLATES).filter(template => template.category === category);
};

