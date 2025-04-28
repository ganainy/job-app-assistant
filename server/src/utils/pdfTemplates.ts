import { JsonResumeSchema, JsonResumeWorkItem, JsonResumeEducationItem, JsonResumeSkillItem } from '../types/jsonresume'; // Use our types

// Basic inline CSS - expand significantly for real styling
const basicStyles = `
    body { font-family: sans-serif; line-height: 1.4; margin: 40px; }
    h1, h2, h3 { color: #333; margin-bottom: 0.5em; }
    h1 { font-size: 24px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    h2 { font-size: 18px; margin-top: 1.5em; }
    h3 { font-size: 14px; font-weight: bold; margin-bottom: 0.2em;}
    p, li { font-size: 12px; color: #555; margin-bottom: 0.5em; }
    ul { padding-left: 20px; margin-top: 0.5em; }
    .section { margin-bottom: 1.5em; }
    .personal-info p { margin-bottom: 0.1em; }
    .experience-item, .education-item { margin-bottom: 1em; }
    .company, .institution { font-style: italic; color: #666; }
    .dates { font-size: 11px; color: #777; float: right; }
    .description { margin-top: 0.3em; }
    .skills-list { list-style: none; padding-left: 0; }
    .skills-list li { display: inline-block; background-color: #eee; padding: 3px 8px; margin-right: 5px; margin-bottom: 5px; border-radius: 4px; font-size: 11px; }
`;

// --- CV Template Function ---
// Takes the tailored CV JSON and returns an HTML string
export const getCvHtml = (resume: JsonResumeSchema): string => {
    // Helper to safely access nested properties (optional, can access directly)
    // const get = (obj: any, path: string, defaultValue: any = '') => path.split('.').reduce((acc, part) => acc && acc[part], obj) || defaultValue;

    const basics = resume.basics || { name: "Applicant", profiles: [] };
    const location = basics.location || {};
    const profiles = basics.profiles || [];

    // --- Header & Contact ---
    const headerHtml = `
        <div class="header section">
            <h1>${basics.name || 'Name Not Found'}</h1>
            ${basics.label ? `<p style="font-size: 16px; color: #555; margin-top: 5px;">${basics.label}</p>` : ''}
            <div class="contact-info">
                ${location.city ? `<span>${location.city}${location.region ? `, ${location.region}` : ''}</span>` : ''}
                ${basics.phone ? `<span> | ${basics.phone}</span>` : ''}
                ${basics.email ? `<span> | <a href="mailto:${basics.email}">${basics.email}</a></span>` : ''}
                ${basics.url ? `<span> | <a href="${basics.url}" target="_blank">${basics.url}</a></span>` : ''}
                ${profiles.map(p => p.url ? `<span> | <a href="${p.url}" target="_blank">${p.network || 'Profile'}</a></span>` : '').join('')}
            </div>
        </div>
    `;

    // --- Summary ---
    const summaryHtml = basics.summary ? `
        <div class="section summary">
            <h2>Summary</h2>
            <p>${basics.summary}</p>
        </div>
    ` : '';

    // --- Work Experience ---
    const workHtml = resume.work && resume.work.length > 0 ? `
        <div class="section work">
            <h2>Work Experience</h2>
            ${resume.work.map((item: JsonResumeWorkItem) => `
                <div class="item">
                    <div class="item-header">
                        <span class="item-title">${item.position || item.jobTitle || ''}</span>
                        <span class="item-dates">${item.startDate || ''}${item.endDate ? ` - ${item.endDate}` : ''}</span>
                    </div>
                    ${item.name || item.company ? `<div class="item-subtitle">${item.name || item.company}${item.location ? ` | ${item.location}` : ''}</div>` : ''}
                    ${item.summary ? `<p class="item-summary">${item.summary}</p>` : ''}
                    ${item.highlights && item.highlights.length > 0 ? `<div class="item-highlights"><ul>${item.highlights.map(h => `<li>${h}</li>`).join('')}</ul></div>` : ''}
                    ${!item.highlights && item.description ? `<p class="item-summary">${item.description}</p>` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';

     // --- Projects --- (Similar to Work)
    const projectsHtml = resume.projects && resume.projects.length > 0 ? `
        <div class="section projects">
            <h2>Projects</h2>
            ${resume.projects.map((item) => `
                <div class="item">
                    <div class="item-header">
                        <span class="item-title">${item.name || ''}</span>
                        <span class="item-dates">${item.startDate || ''}${item.endDate ? ` - ${item.endDate}` : ''}</span>
                    </div>
                    ${item.description ? `<p class="item-summary">${item.description}</p>` : ''}
                    ${item.highlights && item.highlights.length > 0 ? `<div class="item-highlights"><ul>${item.highlights.map(h => `<li>${h}</li>`).join('')}</ul></div>` : ''}
                    ${item.keywords && item.keywords.length > 0 ? `<p style="font-size:11px; margin-top: 4px;"><em>Keywords: ${item.keywords.join(', ')}</em></p>`: ''}
                    ${item.url ? `<p style="font-size:11px;"><a href="${item.url}" target="_blank">Project Link</a></p>` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';


    // --- Education ---
    const educationHtml = resume.education && resume.education.length > 0 ? `
         <div class="section education">
            <h2>Education</h2>
             ${resume.education.map((item: JsonResumeEducationItem) => `
                <div class="item">
                     <div class="item-header">
                        <span class="item-title">${item.institution || ''}</span>
                        <span class="item-dates">${item.startDate || ''}${item.endDate ? ` - ${item.endDate}` : ''}</span>
                    </div>
                     <div class="item-subtitle">
                        ${item.studyType || item.degree || ''}${item.area ? ` in ${item.area}` : ''}
                        ${item.score ? ` (Score: ${item.score})` : ''}
                     </div>
                    ${item.courses && item.courses.length > 0 ? `<p style="font-size:11px; margin-top: 4px;"><em>Relevant Courses: ${item.courses.join(', ')}</em></p>`: ''}
                </div>
            `).join('')}
        </div>
    ` : '';

    // --- Skills ---
    const skillsHtml = resume.skills && resume.skills.length > 0 ? `
        <div class="section skills">
            <h2>Skills</h2>
            ${resume.skills.map((skillCat: JsonResumeSkillItem) => skillCat.keywords && skillCat.keywords.length > 0 ? `
                <div class="skills-category">
                    ${skillCat.name ? `<h4>${skillCat.name}</h4>` : ''}
                    <ul class="skills-list">
                        ${skillCat.keywords.map(keyword => `<li>${keyword}</li>`).join('')}
                    </ul>
                </div>
            ` : '').join('')}
        </div>
    ` : '';

     // --- Languages --- (Example)
     const languagesHtml = resume.languages && resume.languages.length > 0 ? `
         <div class="section languages">
             <h2>Languages</h2>
             <ul style="list-style:none; padding:0;">
                 ${resume.languages.map(lang => `
                     <li style="margin-bottom: 5px;">
                         <strong>${lang.language || ''}</strong>${lang.fluency ? `: ${lang.fluency}` : ''}
                     </li>
                 `).join('')}
             </ul>
         </div>
     ` : '';


    // Combine all sections into the final HTML
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>CV - ${basics.name || 'Applicant'}</title>
            <style>${basicStyles}</style>
        </head>
        <body>
            ${headerHtml}
            ${summaryHtml}
            ${workHtml}
            ${projectsHtml}
            ${educationHtml}
            ${skillsHtml}
            ${languagesHtml}
        </body>
        </html>
    `;
};

// --- Cover Letter Template Function ---
// Takes the cover letter text and returns an HTML string
export const getCoverLetterHtml = (letterText: string, cvData: any): string => {
     const get = (obj: any, path: string, defaultValue: any = '') => path.split('.').reduce((acc, part) => acc && acc[part], obj) || defaultValue;
     // Simple template, just wraps the text in basic HTML
     // You might want to add sender address etc. based on cvData later
     const formattedText = letterText.replace(/\n/g, '<br>'); // Convert newlines to <br>

    return `
         <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Cover Letter - ${get(cvData, 'personalInfo.name', 'Applicant')}</title>
             <style>${basicStyles}</style>
        </head>
        <body>
            <h1>Cover Letter</h1>
             <p>${formattedText}</p>
        </body>
        </html>
    `;
};