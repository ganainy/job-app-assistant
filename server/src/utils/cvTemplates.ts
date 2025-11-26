import { JsonResumeSchema, JsonResumeWorkItem, JsonResumeEducationItem, JsonResumeSkillItem } from '../types/jsonresume';

export enum CVTemplate {
    CLASSIC = 'classic',
    HARVARD = 'harvard',
    MODERN_ATS = 'modern_ats',
    MINIMAL = 'minimal'
}

// --- Helper: Date Formatter ---
const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    // Assuming YYYY-MM-DD or YYYY-MM
    return dateString; // Keep as is for now, or add moment/date-fns if needed
};

// --- Template: Harvard (Classic, Serif, High ATS Score) ---
const getHarvardTemplate = (resume: JsonResumeSchema): string => {
    const basics = resume.basics || { name: "Applicant", profiles: [] };
    const location = basics.location || {};

    const styles = `
        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            margin: 40px;
        }
        h1 {
            font-size: 20pt;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 5px;
            font-weight: bold;
        }
        .contact-info {
            text-align: center;
            font-size: 10pt;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 12pt;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            margin-top: 15px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .item {
            margin-bottom: 10px;
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
        }
        .item-subheader {
            display: flex;
            justify-content: space-between;
            font-style: italic;
        }
        ul {
            margin: 5px 0;
            padding-left: 20px;
        }
        li {
            margin-bottom: 2px;
        }
        a { color: #000; text-decoration: none; }
    `;

    // Header
    const header = `
        <h1>${basics.name}</h1>
        <div class="contact-info">
            ${location.city ? `${location.city}, ` : ''}${location.region || ''} | 
            ${basics.phone || ''} | 
            <a href="mailto:${basics.email}">${basics.email}</a>
            ${basics.url ? ` | <a href="${basics.url}">${basics.url}</a>` : ''}
            ${basics.profiles?.map(p => ` | <a href="${p.url}">${p.network}</a>`).join('') || ''}
        </div>
    `;

    // Professional Summary
    const summary = basics.summary ? `
        <div class="section">
            <div class="section-title">Professional Summary</div>
            <p>${basics.summary}</p>
        </div>
    ` : '';

    // Education
    const education = resume.education?.length ? `
        <div class="section">
            <div class="section-title">Education</div>
            ${resume.education.map(edu => `
                <div class="item">
                    <div class="item-header">
                        <span>${edu.institution}</span>
                        <span>${formatDate(edu.startDate)} - ${formatDate(edu.endDate) || 'Present'}</span>
                    </div>
                    <div class="item-subheader">
                        <span>${edu.studyType} in ${edu.area}</span>
                    </div>
                    ${edu.score ? `<div>GPA: ${edu.score}</div>` : ''}
                    ${edu.courses?.length ? `<div>Relevant Coursework: ${edu.courses.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';

    // Experience
    const work = resume.work?.length ? `
        <div class="section">
            <div class="section-title">Professional Experience</div>
            ${resume.work.map(job => `
                <div class="item">
                    <div class="item-header">
                        <span>${job.company}</span>
                        <span>${formatDate(job.startDate)} - ${formatDate(job.endDate) || 'Present'}</span>
                    </div>
                    <div class="item-subheader">
                        <span>${job.position}</span>
                        <span>${job.location || ''}</span>
                    </div>
                    ${job.summary ? `<p>${job.summary}</p>` : ''}
                    ${job.highlights?.length ? `<ul>${job.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';

    // Skills
    const skills = resume.skills?.length ? `
        <div class="section">
            <div class="section-title">Skills</div>
            <p>
                ${resume.skills.map(skill => `
                    <strong>${skill.name}:</strong> ${skill.keywords?.join(', ')}
                `).join(' | ')}
            </p>
        </div>
    ` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>${styles}</style>
        </head>
        <body>
            ${header}
            ${summary}
            ${education}
            ${work}
            ${skills}
        </body>
        </html>
    `;
};

// --- Template: Modern ATS (Clean Sans-Serif, Subtle Styling) ---
const getModernAtsTemplate = (resume: JsonResumeSchema): string => {
    const basics = resume.basics || { name: "Applicant", profiles: [] };
    const location = basics.location || {};

    const styles = `
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: #333;
            margin: 40px;
        }
        h1 {
            font-size: 24pt;
            text-transform: uppercase;
            margin-bottom: 5px;
            color: #2c3e50;
            letter-spacing: 1px;
        }
        .contact-info {
            font-size: 9pt;
            margin-bottom: 25px;
            color: #666;
        }
        .section-title {
            font-size: 12pt;
            text-transform: uppercase;
            border-bottom: 2px solid #2c3e50;
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 15px;
            font-weight: bold;
            padding-bottom: 5px;
        }
        .item {
            margin-bottom: 15px;
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }
        .company-name {
            font-weight: bold;
            font-size: 11pt;
            color: #000;
        }
        .date-range {
            font-size: 9pt;
            color: #666;
        }
        .position-title {
            font-style: italic;
            color: #444;
            margin-bottom: 5px;
        }
        ul {
            margin: 5px 0;
            padding-left: 18px;
        }
        li {
            margin-bottom: 4px;
        }
        a { color: #2980b9; text-decoration: none; }
    `;

    // Header
    const header = `
        <h1>${basics.name}</h1>
        <div class="contact-info">
            ${location.city ? `${location.city}, ` : ''}${location.region || ''} • 
            ${basics.phone || ''} • 
            <a href="mailto:${basics.email}">${basics.email}</a>
            ${basics.url ? ` • <a href="${basics.url}">${basics.url}</a>` : ''}
            ${basics.profiles?.map(p => ` • <a href="${p.url}">${p.network}</a>`).join('') || ''}
        </div>
    `;

    // Professional Summary
    const summary = basics.summary ? `
        <div class="section">
            <div class="section-title">Professional Summary</div>
            <p>${basics.summary}</p>
        </div>
    ` : '';

    // Experience
    const work = resume.work?.length ? `
        <div class="section">
            <div class="section-title">Experience</div>
            ${resume.work.map(job => `
                <div class="item">
                    <div class="item-header">
                        <span class="company-name">${job.company}</span>
                        <span class="date-range">${formatDate(job.startDate)} - ${formatDate(job.endDate) || 'Present'}</span>
                    </div>
                    <div class="position-title">${job.position}</div>
                    ${job.summary ? `<p>${job.summary}</p>` : ''}
                    ${job.highlights?.length ? `<ul>${job.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';

    // Education
    const education = resume.education?.length ? `
        <div class="section">
            <div class="section-title">Education</div>
            ${resume.education.map(edu => `
                <div class="item">
                    <div class="item-header">
                        <span class="company-name">${edu.institution}</span>
                        <span class="date-range">${formatDate(edu.startDate)} - ${formatDate(edu.endDate) || 'Present'}</span>
                    </div>
                    <div class="position-title">${edu.studyType} in ${edu.area}</div>
                    ${edu.score ? `<div>GPA: ${edu.score}</div>` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';

    // Skills
    const skills = resume.skills?.length ? `
        <div class="section">
            <div class="section-title">Skills</div>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${resume.skills.map(skill => `
                    <div>
                        <strong>${skill.name}:</strong> ${skill.keywords?.join(', ')}
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>${styles}</style>
        </head>
        <body>
            ${header}
            ${summary}
            ${work}
            ${education}
            ${skills}
        </body>
        </html>
    `;
};

// --- Template: Minimalist (Clean, Whitespace, Content Focus) ---
const getMinimalistTemplate = (resume: JsonResumeSchema): string => {
    const basics = resume.basics || { name: "Applicant", profiles: [] };
    const location = basics.location || {};

    const styles = `
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.6;
            color: #222;
            margin: 50px;
        }
        h1 {
            font-size: 28pt;
            font-weight: 300;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }
        .contact-info {
            font-size: 9pt;
            color: #888;
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #888;
            margin-top: 30px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .item {
            margin-bottom: 25px;
        }
        .item-header {
            margin-bottom: 5px;
        }
        .company-name {
            font-weight: 600;
            font-size: 11pt;
        }
        .date-range {
            color: #888;
            font-size: 9pt;
            float: right;
        }
        .position-title {
            color: #555;
            margin-bottom: 8px;
        }
        ul {
            margin: 0;
            padding-left: 15px;
            color: #444;
        }
        li {
            margin-bottom: 5px;
        }
        a { color: #222; text-decoration: underline; }
    `;

    // Header
    const header = `
        <h1>${basics.name}</h1>
        <div class="contact-info">
            ${location.city ? `${location.city}, ` : ''}${location.region || ''}<br>
            ${basics.phone || ''}<br>
            <a href="mailto:${basics.email}">${basics.email}</a>
        </div>
    `;

    // Professional Summary
    const summary = basics.summary ? `
        <div class="section">
            <div class="section-title">Profile</div>
            <p>${basics.summary}</p>
        </div>
    ` : '';

    // Experience
    const work = resume.work?.length ? `
        <div class="section">
            <div class="section-title">Experience</div>
            ${resume.work.map(job => `
                <div class="item">
                    <div class="item-header">
                        <span class="company-name">${job.company}</span>
                        <span class="date-range">${formatDate(job.startDate)} - ${formatDate(job.endDate) || 'Present'}</span>
                    </div>
                    <div class="position-title">${job.position}</div>
                    ${job.summary ? `<p>${job.summary}</p>` : ''}
                    ${job.highlights?.length ? `<ul>${job.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';

    // Education
    const education = resume.education?.length ? `
        <div class="section">
            <div class="section-title">Education</div>
            ${resume.education.map(edu => `
                <div class="item">
                    <div class="item-header">
                        <span class="company-name">${edu.institution}</span>
                        <span class="date-range">${formatDate(edu.startDate)} - ${formatDate(edu.endDate) || 'Present'}</span>
                    </div>
                    <div class="position-title">${edu.studyType} in ${edu.area}</div>
                </div>
            `).join('')}
        </div>
    ` : '';

    // Skills
    const skills = resume.skills?.length ? `
        <div class="section">
            <div class="section-title">Skills</div>
            <p>
                ${resume.skills.map(skill => skill.name).join(' • ')}
            </p>
        </div>
    ` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>${styles}</style>
        </head>
        <body>
            ${header}
            ${summary}
            ${work}
            ${education}
            ${skills}
        </body>
        </html>
    `;
};

// --- Main Export ---
export const getCvTemplateHtml = (resume: JsonResumeSchema, template: CVTemplate = CVTemplate.CLASSIC): string => {
    switch (template) {
        case CVTemplate.HARVARD:
            return getHarvardTemplate(resume);
        case CVTemplate.MODERN_ATS:
            return getModernAtsTemplate(resume);
        case CVTemplate.MINIMAL:
            return getMinimalistTemplate(resume);
        case CVTemplate.CLASSIC:
        default:
            // Fallback to Harvard for now as "Classic" replacement or import original
            return getHarvardTemplate(resume);
    }
};
