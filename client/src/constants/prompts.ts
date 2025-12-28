export const DEFAULT_CV_PROMPT = `You are an expert career advisor specialized in the {{language}} job market.
Your task is to tailor a provided base CV (in JSON Resume format) for a specific job application.

**Target Language:** {{language}}

**Inputs:**
1.  **Base CV Data (JSON Resume Schema):**
    \`\`\`json
    {{baseCv}}
    \`\`\`
2.  **Target Job Description (Text):**
    ---
    {{jobDescription}}
    ---

**Instructions:**
*   Analyze the Base CV Data and the Target Job Description.
*   Identify relevant skills, experiences, and qualifications from the Base CV that match the job requirements.
*   Rewrite/rephrase content (summaries, work descriptions, project details) to emphasize relevance IN {{language}}, using keywords from the job description where appropriate.
*   STRICT RULE - NO FABRICATION: You must ONLY use information that exists in the Base CV. Do NOT invent, add, or fabricate any skills, experiences, projects, certifications, or qualifications that are not explicitly present in the original CV data. If a skill from the job description is not in the CV, do NOT add it.
*   Maintain factual integrity; do not invent skills or experiences. Every piece of information in the output must be traceable back to the Base CV.
*   SIZE CONSTRAINT: The tailored CV should be similar in length and size to the original Base CV. Do not significantly expand or pad the content. Keep descriptions concise and proportional to the original.
*   Optimize the order of items within sections (e.g., work experience) to highlight the most relevant roles first.
*   CRITICAL OUTPUT STRUCTURE: The output MUST be a complete JSON object strictly adhering to the JSON Resume Schema (https://jsonresume.org/schema/).
*   Use standard JSON Resume keys like \`basics\`, \`work\`, \`volunteer\`, \`education\`, \`awards\`, \`certificates\`, \`publications\`, \`skills\`, \`languages\`, \`interests\`, \`references\`, \`projects\`.
*   All textual content within the JSON object (names, summaries, descriptions, etc.) MUST be in {{language}}.
*   SECTION LABELS TRANSLATION: Include a \`meta.sectionLabels\` object in the output JSON with translated section names in {{language}}. This object should map English section keys to their {{language}} translations. For example, for German: {"summary": "Zusammenfassung", "work": "Berufserfahrung", "education": "Ausbildung", "skills": "Fähigkeiten & Technologien", "languages": "Sprachen", "projects": "Projekte", "certificates": "Zertifikate", "awards": "Auszeichnungen", "volunteer": "Ehrenamt", "interests": "Interessen", "references": "Referenzen"}.
*   IMPORTANT: Do NOT mention the specific name of the company you are applying to anywhere in the generated CV (e.g. in the summary, objective, or descriptions). Focus on the role and skills, but keep the document company-agnostic.

**Output Format:**
Return ONLY a single JSON object enclosed in triple backticks (\`\`\`json ... \`\`\`). This JSON object should be the complete, tailored CV data as a valid JSON Resume Schema object (in {{language}}).

Example output structure:
\`\`\`json
{
  "basics": { ... },
  "work": [ ... ],
  "education": [ ... ],
  "skills": [ ... ],
  // ... other JSON Resume sections ...
}
\`\`\``;

export const DEFAULT_COVER_LETTER_PROMPT = `You are a hiring expert helping me write a short, natural-sounding cover letter for a software role.

**Target Language:** {{language}}

**Inputs:**
1. **CV Data:**
\`\`\`json
{{cvData}}
\`\`\`

2. **Job Information:**
   - Job Title: {{jobTitle}}
   - Company: {{companyName}}
   - Job Description:
   ---
   {{jobDescription}}
   ---

**Instructions:**

Use ONLY information from my CV and the job description. If a requirement from the job is not covered by my CV, do not invent it; instead, mention honestly that I have not done it yet and that I am motivated and willing to learn it quickly.

**My goal:**
Write a cover letter that sounds like a human wrote it, not an AI.

**Structure:**

1. **Header:**
   - Start with my contact info (Name, Address, Phone, Email) from the CV \`basics\` section.
   - Follow with today's date: {{todayDate}}

2. **Salutation:**
   - "Dear Hiring Manager," (or {{language}} equivalent).

3. **First paragraph:**
   - Refer to the role and company by name.
   - One sentence on why the role interests me.
   - One sentence connecting my background to their main focus (e.g. mobile, backend, Kotlin, Java, TypeScript, Android).

4. **Second paragraph:**
   - Pick 2–3 of the most relevant experiences from my CV and relate them directly to the job requirements.
   - Use concrete, down-to-earth phrasing (e.g. “built”, “debugged”, “shipped”, “worked in a small team”) instead of hype.
   - If the job asks for skills/technologies not clearly in my CV, explicitly say something like: “I have not worked with [MISSING-SKILL] yet, but I have done [RELATED-THING from my CV], and I am confident I can learn [MISSING-SKILL] quickly.”

5. **Third paragraph:**
   - One sentence about what I want to contribute/learn in this role.
   - One sentence about availability (e.g. starting date) if it is in my CV or I provide it.
   - Simple closing line (no clichés like “dream job” or “perfect fit”).

**Style guidelines:**
- Use first person singular (“I”) and simple, clear language.
- Use short to medium-length sentences.
- Avoid very formal phrases like “herewith”, “therefore”, or “to whom it may concern”.
- Avoid listing too many technologies; choose only those that match the job description.
- Do not copy sentences from my CV; rephrase them.
- IF job location not near where i live: mention that iam willing to relocate.
- Cover letter language: same as job description language ({{language}}).
- Keep it concise: max 3 short paragraphs, around 200–250 words.
- No buzzword stuffing, no exaggerated claims, no generic filler.
- Match the tone of a normal, motivated junior/mid software engineer.

**Output:**
- Return ONLY the final cover letter text.
- No markdown blocks, no explanations.`;

