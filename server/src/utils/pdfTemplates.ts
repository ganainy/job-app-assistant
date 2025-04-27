// server/src/utils/pdfTemplates.ts

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
export const getCvHtml = (cvData: any): string => {
    // Helper to safely access nested properties
    const get = (obj: any, path: string, defaultValue: any = '') => path.split('.').reduce((acc, part) => acc && acc[part], obj) || defaultValue;

    // Build HTML sections (add more error checking/formatting as needed)
    const personalInfoHtml = `
        <div class="section personal-info">
            <h1>${get(cvData, 'personalInfo.name', 'Name Not Found')}</h1>
            <p>${get(cvData, 'personalInfo.address', '')}</p>
            <p>
                ${get(cvData, 'personalInfo.phone', '')}
                ${get(cvData, 'personalInfo.phone') && get(cvData, 'personalInfo.email') ? ' | ' : ''}
                ${get(cvData, 'personalInfo.email', '')}
            </p>
            <p>${get(cvData, 'personalInfo.linkedin', '')}</p>
        </div>
    `;

    const summaryHtml = get(cvData, 'summary') ? `
        <div class="section summary">
            <h2>Summary</h2>
            <p>${get(cvData, 'summary')}</p>
        </div>
    ` : '';

    const experienceHtml = Array.isArray(get(cvData, 'experience', [])) && get(cvData, 'experience', []).length > 0 ? `
        <div class="section experience">
            <h2>Experience</h2>
            ${get(cvData, 'experience', []).map((exp: any) => `
                <div class="experience-item">
                    ${exp.dates ? `<span class="dates">${exp.dates}</span>` : ''}
                    <h3>${exp.jobTitle || 'Job Title Missing'}</h3>
                    ${exp.company ? `<p class="company">${exp.company}${exp.location ? `, ${exp.location}` : ''}</p>` : ''}
                    <div class="description">
                        ${Array.isArray(exp.description) ? `<ul>${exp.description.map((d: string) => `<li>${d}</li>`).join('')}</ul>` : `<p>${exp.description || ''}</p>`}
                    </div>
                </div>
            `).join('')}
        </div>
    ` : '';

    const educationHtml = Array.isArray(get(cvData, 'education', [])) && get(cvData, 'education', []).length > 0 ? `
         <div class="section education">
            <h2>Education</h2>
             ${get(cvData, 'education', []).map((edu: any) => `
                <div class="education-item">
                    ${edu.dates ? `<span class="dates">${edu.dates}</span>` : ''}
                    <h3>${edu.degree || 'Degree Missing'}</h3>
                    <p class="institution">${edu.institution || 'Institution Missing'}${edu.location ? `, ${edu.location}` : ''}</p>
                </div>
            `).join('')}
        </div>
    ` : '';

    const skillsHtml = get(cvData, 'skills') ? `
        <div class="section skills">
            <h2>Skills</h2>
            ${Array.isArray(get(cvData, 'skills')) ? `
                <ul class="skills-list">${get(cvData, 'skills', []).map((skill: string) => `<li>${skill}</li>`).join('')}</ul>
            ` : typeof get(cvData, 'skills') === 'object' ?
                Object.entries(get(cvData, 'skills', {})).map(([category, skillsList]: [string, any]) => Array.isArray(skillsList) ? `
                    <div>
                        <h4>${category}</h4>
                        <ul class="skills-list">${skillsList.map((skill: string) => `<li>${skill}</li>`).join('')}</ul>
                    </div>
                ` : '').join('')
            : ''}
        </div>
    ` : '';


    // Combine all sections into the final HTML
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>CV - ${get(cvData, 'personalInfo.name', 'Applicant')}</title>
            <style>${basicStyles}</style>
        </head>
        <body>
            ${personalInfoHtml}
            ${summaryHtml}
            ${experienceHtml}
            ${educationHtml}
            ${skillsHtml}
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