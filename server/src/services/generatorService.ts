import { generateStructuredResponse } from '../utils/geminiClient';

/**
 * Improves a CV section using AI
 * @param sectionName - The name of the section (e.g., "work", "education", "skills")
 * @param sectionData - The original section data from the frontend
 * @returns The improved section data in the same JSON structure
 */
export const improveSectionWithAi = async (
    sectionName: string,
    sectionData: any
): Promise<any> => {
    console.log(`Improving CV section: ${sectionName}`);

    const improvementPrompt = `
You are a professional CV writing expert. Your task is to improve a specific section of a CV.

Section Name: ${sectionName}
Original Section Data:
${JSON.stringify(sectionData, null, 2)}

Instructions:
1. Analyze the provided section data
2. Rewrite and improve the content while maintaining the exact same JSON structure
3. Focus on:
   - Using strong action verbs (e.g., "Engineered", "Led", "Optimized", "Developed")
   - Adding quantifiable achievements and metrics where possible
   - Improving clarity and impact
   - Ensuring ATS-friendliness
   - Maintaining professional tone
4. Keep all the same fields and structure - only improve the content within those fields
5. Do not add new fields or remove existing fields
6. Preserve dates, names, and factual information - only improve descriptions, summaries, and highlights

Return ONLY a JSON object with the exact same structure as the input sectionData, but with improved content.
The output should be ready to use as a direct replacement for the original section data.

Example:
If input is:
{
  "company": "Example Inc.",
  "position": "Software Developer",
  "summary": "Worked on projects",
  "highlights": ["Did some coding", "Fixed bugs"]
}

Output should be:
{
  "company": "Example Inc.",
  "position": "Software Developer",
  "summary": "Developed and maintained web applications, leading to improved user engagement and system performance.",
  "highlights": [
    "Engineered scalable web applications using modern frameworks, reducing load times by 30%",
    "Resolved critical production bugs, improving system stability and reducing downtime by 25%"
  ]
}
`;

    try {
        const improvedData = await generateStructuredResponse<any>(improvementPrompt);

        if (!improvedData || typeof improvedData !== 'object') {
            throw new Error('AI response did not return valid section data');
        }

        // Validate that the structure matches (at least has the same top-level keys)
        const originalKeys = Object.keys(sectionData || {});
        const improvedKeys = Object.keys(improvedData || {});

        // Check if at least some keys match (allowing for some flexibility)
        const matchingKeys = originalKeys.filter(key => improvedKeys.includes(key));
        if (matchingKeys.length === 0 && originalKeys.length > 0) {
            console.warn(`Warning: Improved section structure may differ from original. Original keys: ${originalKeys.join(', ')}, Improved keys: ${improvedKeys.join(', ')}`);
        }

        return improvedData;
    } catch (error: any) {
        console.error(`Error improving section ${sectionName}:`, error);
        throw new Error(`Failed to improve CV section: ${error.message}`);
    }
};

