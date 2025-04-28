// Based on https://jsonresume.org/schema/

export interface JsonResumeLocation {
    address?: string;
    postalCode?: string;
    city?: string;
    countryCode?: string;
    region?: string;
}

export interface JsonResumeProfile {
    network?: string; // e.g. 'Twitter', 'LinkedIn'
    username?: string;
    url?: string;
}

export interface JsonResumeBasics {
    name?: string;
    label?: string; // e.g. 'Software Engineer'
    image?: string; // URL
    email?: string;
    phone?: string;
    url?: string; // Personal website
    summary?: string;
    location?: JsonResumeLocation;
    profiles?: JsonResumeProfile[];
}

export interface JsonResumeWorkItem {
    name?: string; // Company name
    company?: string; // Alias for name
    position?: string; // Job title
    jobTitle?: string; // Alias for position
    url?: string; // Company website
    location?: string;
    startDate?: string; // Format YYYY-MM-DD or YYYY-MM or YYYY
    endDate?: string; // Format YYYY-MM-DD or YYYY-MM or YYYY or 'Present'
    summary?: string; // Short summary of role/company
    highlights?: string[]; // Array of accomplishments/description points
    description?: string; // Alternative to highlights as single string
}

export interface JsonResumeVolunteerItem {
    organization?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
}

export interface JsonResumeEducationItem {
    institution?: string;
    url?: string;
    area?: string; // e.g. 'Computer Science'
    studyType?: string; // e.g. 'Bachelor', 'Master'
    degree?: string; // Alias for studyType
    startDate?: string;
    endDate?: string;
    score?: string; // e.g. '3.8/4.0', '2.1'
    courses?: string[]; // List of relevant courses
}

export interface JsonResumeAwardItem {
    title?: string;
    date?: string;
    awarder?: string;
    summary?: string;
}

export interface JsonResumeCertificateItem {
    name?: string;
    date?: string;
    issuer?: string;
    url?: string;
}

export interface JsonResumePublicationItem {
    name?: string;
    publisher?: string;
    releaseDate?: string;
    url?: string;
    summary?: string;
}

export interface JsonResumeSkillItem {
    name?: string; // e.g. 'Web Development'
    level?: string; // e.g. 'Master'
    keywords?: string[]; // e.g. ['HTML', 'CSS', 'JavaScript']
}

export interface JsonResumeLanguageItem {
    language?: string; // e.g. 'English', 'German'
    fluency?: string; // e.g. 'Native speaker', 'Fluent', 'C1'
}

export interface JsonResumeInterestItem {
    name?: string;
    keywords?: string[];
}

export interface JsonResumeReferenceItem {
    name?: string;
    reference?: string; // e.g. 'Available upon request'
}

export interface JsonResumeProjectItem {
    name?: string;
    description?: string;
    highlights?: string[];
    keywords?: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
    roles?: string[];
    entity?: string; // e.g. 'Google'
    type?: string; // e.g. 'application'
}

// The root JSON Resume schema interface
export interface JsonResumeSchema {
    basics?: JsonResumeBasics;
    work?: JsonResumeWorkItem[];
    volunteer?: JsonResumeVolunteerItem[];
    education?: JsonResumeEducationItem[];
    awards?: JsonResumeAwardItem[];
    certificates?: JsonResumeCertificateItem[];
    publications?: JsonResumePublicationItem[];
    skills?: JsonResumeSkillItem[];
    languages?: JsonResumeLanguageItem[];
    interests?: JsonResumeInterestItem[];
    references?: JsonResumeReferenceItem[];
    projects?: JsonResumeProjectItem[];
    // Optional meta section for theme configuration etc.
    meta?: {
        canonical?: string;
        version?: string;
        lastModified?: string;
        theme?: string; // Could store preferred theme here too
    };
}