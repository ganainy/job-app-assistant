import { JsonResumeSchema } from '../../../server/src/types/jsonresume';

export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  gpa: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  url?: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: "Native" | "Fluent" | "Conversational" | "Basic";
  rating: number;
}

export interface CustomSection {
  id: string;
  heading: string;
  content: string;
}

export interface SectionLabels {
  summary?: string;
  work?: string;
  education?: string;
  skills?: string;
  languages?: string;
  projects?: string;
  certificates?: string;
  awards?: string;
  volunteer?: string;
  interests?: string;
  references?: string;
}

export interface ResumeData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  linkedIn: string;
  website: string;
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  languages: Language[];
  customSections: CustomSection[];
  selectedTemplate: string;
  sectionLabels?: SectionLabels;
}

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function mapFluencyToProficiency(fluency?: string): "Native" | "Fluent" | "Conversational" | "Basic" {
  if (!fluency) return "Basic";
  const lower = fluency.toLowerCase();
  if (lower.includes("native")) return "Native";
  if (lower.includes("fluent") || lower.includes("c2") || lower.includes("c1")) return "Fluent";
  if (lower.includes("conversational") || lower.includes("b2") || lower.includes("b1")) return "Conversational";
  return "Basic";
}

function mapProficiencyToRating(proficiency: "Native" | "Fluent" | "Conversational" | "Basic"): number {
  switch (proficiency) {
    case "Native": return 5;
    case "Fluent": return 4;
    case "Conversational": return 3;
    case "Basic": return 2;
    default: return 2;
  }
}

function splitName(name?: string): { firstName: string; lastName: string } {
  if (!name) return { firstName: '', lastName: '' };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  return { firstName, lastName };
}

function extractLinkedIn(profiles?: Array<{ network?: string; url?: string }>): string {
  if (!profiles || !Array.isArray) return '';
  const linkedInProfile = profiles.find(p =>
    p.network && p.network.toLowerCase().includes('linkedin')
  );
  return linkedInProfile?.url || '';
}

function extractWebsite(basics?: { url?: string; profiles?: Array<{ network?: string; url?: string }> }): string {
  if (basics?.url) return basics.url;
  if (basics?.profiles && Array.isArray(basics.profiles)) {
    const websiteProfile = basics.profiles.find(p =>
      p.network && !p.network.toLowerCase().includes('linkedin')
    );
    return websiteProfile?.url || '';
  }
  return '';
}

function formatDescription(workItem: { summary?: string; highlights?: string[] }): string {
  if (workItem.summary) return workItem.summary;
  if (workItem.highlights && Array.isArray(workItem.highlights) && workItem.highlights.length > 0) {
    return workItem.highlights.join('\n');
  }
  return '';
}

export function transformJsonResumeToResumeData(jsonResume: JsonResumeSchema, selectedTemplate: string = 'modern-clean'): ResumeData {
  const basics = jsonResume.basics || {};
  const location = basics.location || {};
  const { firstName, lastName } = splitName(basics.name);

  const experiences: Experience[] = (jsonResume.work || []).map((workItem, index) => {
    const company = workItem.name || workItem.company || '';
    const position = workItem.position || workItem.jobTitle || '';
    const endDate = workItem.endDate || '';
    const isCurrent = endDate === '' || endDate.toLowerCase() === 'present' || !endDate;

    return {
      id: generateId(),
      company,
      title: position,
      location: workItem.location || '',
      startDate: workItem.startDate || '',
      endDate: isCurrent ? '' : endDate,
      current: isCurrent,
      description: formatDescription(workItem),
    };
  });

  const education: Education[] = (jsonResume.education || []).map((eduItem) => {
    const endDate = eduItem.endDate || '';
    const isCurrent = endDate === '' || endDate.toLowerCase() === 'present' || !endDate;

    return {
      id: generateId(),
      school: eduItem.institution || '',
      degree: eduItem.studyType || eduItem.degree || '',
      field: eduItem.area || '',
      location: '',
      startDate: eduItem.startDate || '',
      endDate: isCurrent ? '' : endDate,
      current: isCurrent,
      gpa: eduItem.score || '',
    };
  });

  const skills: string[] = [];
  if (jsonResume.skills && Array.isArray(jsonResume.skills)) {
    jsonResume.skills.forEach(skill => {
      if (skill.keywords && Array.isArray(skill.keywords)) {
        skills.push(...skill.keywords.filter(k => k && k.trim()));
      }
    });
  }

  const certifications: Certification[] = (jsonResume.certificates || []).map((cert) => ({
    id: generateId(),
    name: cert.name || '',
    issuer: cert.issuer || '',
    date: cert.date || '',
    url: cert.url,
  }));

  const languages: Language[] = (jsonResume.languages || []).map((lang) => {
    const proficiency = mapFluencyToProficiency(lang.fluency);
    return {
      id: generateId(),
      name: lang.language || '',
      proficiency,
      rating: mapProficiencyToRating(proficiency),
    };
  });

  // Extract section labels from meta if available
  const sectionLabels: SectionLabels | undefined = (jsonResume as any).meta?.sectionLabels;

  const customSections: CustomSection[] = [];
  if (jsonResume.projects && Array.isArray(jsonResume.projects) && jsonResume.projects.length > 0) {
    const projectContent = jsonResume.projects.map(project => {
      let content = project.name ? `**${project.name}**\n` : '';
      content += project.description ? `${project.description}\n` : '';
      if (project.highlights && project.highlights.length > 0) {
        content += project.highlights.join('\n');
      }
      return content;
    }).join('\n\n');

    if (projectContent.trim()) {
      customSections.push({
        id: generateId(),
        heading: sectionLabels?.projects || 'Projects',
        content: projectContent.trim(),
      });
    }
  }

  return {
    firstName,
    lastName,
    email: basics.email || '',
    phone: basics.phone || '',
    address: location.address || '',
    city: location.city || '',
    state: location.region || '',
    zipCode: location.postalCode || '',
    linkedIn: extractLinkedIn(basics.profiles),
    website: extractWebsite(basics),
    summary: basics.summary || '',
    experiences,
    education,
    skills,
    certifications,
    languages,
    customSections,
    selectedTemplate,
    sectionLabels,
  };
}

