// Utility to convert JSON Resume schema to plain text for ATS API submission
import { JsonResumeSchema } from '../types/jsonresume';

/**
 * Converts a JSON Resume schema to plain text format suitable for ATS API submission
 * @param cvJson - The JSON Resume schema object
 * @returns Plain text representation of the CV
 */
export function convertJsonResumeToText(cvJson: JsonResumeSchema): string {
    const sections: string[] = [];

    // Basics section
    if (cvJson.basics) {
        const basics = cvJson.basics;
        if (basics.name) sections.push(`Name: ${basics.name}`);
        if (basics.label) sections.push(`Title: ${basics.label}`);
        if (basics.email) sections.push(`Email: ${basics.email}`);
        if (basics.phone) sections.push(`Phone: ${basics.phone}`);
        if (basics.url) sections.push(`Website: ${basics.url}`);
        if (basics.summary) sections.push(`\nSummary:\n${basics.summary}`);
        if (basics.location) {
            const loc = basics.location;
            const locationParts = [
                loc.address,
                loc.city,
                loc.region,
                loc.postalCode,
                loc.countryCode
            ].filter(Boolean);
            if (locationParts.length > 0) {
                sections.push(`Location: ${locationParts.join(', ')}`);
            }
        }
        if (basics.profiles && basics.profiles.length > 0) {
            const profiles = basics.profiles.map(p => `${p.network}: ${p.url || p.username || ''}`).join(', ');
            sections.push(`Profiles: ${profiles}`);
        }
    }

    // Work experience
    if (cvJson.work && cvJson.work.length > 0) {
        sections.push('\n\nWORK EXPERIENCE\n');
        cvJson.work.forEach((job, index) => {
            if (index > 0) sections.push('\n---\n');
            if (job.name) sections.push(`Company: ${job.name}`);
            if (job.position) sections.push(`Position: ${job.position}`);
            if (job.startDate) sections.push(`Start Date: ${job.startDate}`);
            if (job.endDate) sections.push(`End Date: ${job.endDate || 'Present'}`);
            if (job.url) sections.push(`URL: ${job.url}`);
            if (job.summary) sections.push(`Summary: ${job.summary}`);
            if (job.highlights && job.highlights.length > 0) {
                sections.push('Highlights:');
                job.highlights.forEach(highlight => sections.push(`  • ${highlight}`));
            }
            if (job.description) sections.push(`Description: ${job.description}`);
        });
    }

    // Education
    if (cvJson.education && cvJson.education.length > 0) {
        sections.push('\n\nEDUCATION\n');
        cvJson.education.forEach((edu, index) => {
            if (index > 0) sections.push('\n---\n');
            if (edu.institution) sections.push(`Institution: ${edu.institution}`);
            if (edu.area) sections.push(`Area: ${edu.area}`);
            if (edu.studyType) sections.push(`Degree: ${edu.studyType}`);
            if (edu.startDate) sections.push(`Start Date: ${edu.startDate}`);
            if (edu.endDate) sections.push(`End Date: ${edu.endDate || 'Present'}`);
            if (edu.score) sections.push(`GPA/Score: ${edu.score}`);
            if (edu.courses && edu.courses.length > 0) {
                sections.push(`Courses: ${edu.courses.join(', ')}`);
            }
        });
    }

    // Skills
    if (cvJson.skills && cvJson.skills.length > 0) {
        sections.push('\n\nSKILLS\n');
        cvJson.skills.forEach(skill => {
            if (skill.name) sections.push(`Category: ${skill.name}`);
            if (skill.level) sections.push(`Level: ${skill.level}`);
            if (skill.keywords && skill.keywords.length > 0) {
                sections.push(`Skills: ${skill.keywords.join(', ')}`);
            }
        });
    }

    // Projects
    if (cvJson.projects && cvJson.projects.length > 0) {
        sections.push('\n\nPROJECTS\n');
        cvJson.projects.forEach((project, index) => {
            if (index > 0) sections.push('\n---\n');
            if (project.name) sections.push(`Project: ${project.name}`);
            if (project.description) sections.push(`Description: ${project.description}`);
            if (project.highlights && project.highlights.length > 0) {
                sections.push('Highlights:');
                project.highlights.forEach(highlight => sections.push(`  • ${highlight}`));
            }
            if (project.keywords && project.keywords.length > 0) {
                sections.push(`Technologies: ${project.keywords.join(', ')}`);
            }
            if (project.url) sections.push(`URL: ${project.url}`);
            if (project.startDate) sections.push(`Start Date: ${project.startDate}`);
            if (project.endDate) sections.push(`End Date: ${project.endDate || 'Present'}`);
        });
    }

    // Languages
    if (cvJson.languages && cvJson.languages.length > 0) {
        sections.push('\n\nLANGUAGES\n');
        cvJson.languages.forEach(lang => {
            const langParts = [lang.language];
            if (lang.fluency) langParts.push(`(${lang.fluency})`);
            sections.push(langParts.join(' '));
        });
    }

    // Certificates
    if (cvJson.certificates && cvJson.certificates.length > 0) {
        sections.push('\n\nCERTIFICATES\n');
        cvJson.certificates.forEach(cert => {
            if (cert.name) sections.push(`Certificate: ${cert.name}`);
            if (cert.date) sections.push(`Date: ${cert.date}`);
            if (cert.issuer) sections.push(`Issuer: ${cert.issuer}`);
            if (cert.url) sections.push(`URL: ${cert.url}`);
        });
    }

    // Awards
    if (cvJson.awards && cvJson.awards.length > 0) {
        sections.push('\n\nAWARDS\n');
        cvJson.awards.forEach(award => {
            if (award.title) sections.push(`Award: ${award.title}`);
            if (award.date) sections.push(`Date: ${award.date}`);
            if (award.awarder) sections.push(`Awarder: ${award.awarder}`);
            if (award.summary) sections.push(`Summary: ${award.summary}`);
        });
    }

    // Publications
    if (cvJson.publications && cvJson.publications.length > 0) {
        sections.push('\n\nPUBLICATIONS\n');
        cvJson.publications.forEach(pub => {
            if (pub.name) sections.push(`Publication: ${pub.name}`);
            if (pub.publisher) sections.push(`Publisher: ${pub.publisher}`);
            if (pub.releaseDate) sections.push(`Release Date: ${pub.releaseDate}`);
            if (pub.url) sections.push(`URL: ${pub.url}`);
            if (pub.summary) sections.push(`Summary: ${pub.summary}`);
        });
    }

    // Volunteer
    if (cvJson.volunteer && cvJson.volunteer.length > 0) {
        sections.push('\n\nVOLUNTEER EXPERIENCE\n');
        cvJson.volunteer.forEach(vol => {
            if (vol.organization) sections.push(`Organization: ${vol.organization}`);
            if (vol.position) sections.push(`Position: ${vol.position}`);
            if (vol.startDate) sections.push(`Start Date: ${vol.startDate}`);
            if (vol.endDate) sections.push(`End Date: ${vol.endDate || 'Present'}`);
            if (vol.summary) sections.push(`Summary: ${vol.summary}`);
            if (vol.highlights && vol.highlights.length > 0) {
                sections.push('Highlights:');
                vol.highlights.forEach(highlight => sections.push(`  • ${highlight}`));
            }
        });
    }

    return sections.join('\n');
}

