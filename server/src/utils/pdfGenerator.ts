// server/src/utils/pdfGenerator.ts
import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises'; // Use promise-based fs
import { getCvHtml, getCoverLetterHtml } from './pdfTemplates';
import { JsonResumeSchema } from '../types/jsonresume';

interface Theme {
    render: (resume: JsonResumeSchema) => string;
    pdfRenderOptions?: any;
}

// Ensure temp directory exists
const TEMP_PDF_DIR = path.join(__dirname, '..', '..', 'temp_pdfs'); // Place it in server root maybe? Adjust path as needed.

// --- Function to ensure directory exists ---
const ensureDirExists = async (dirPath: string) => {
    try {
        await fs.access(dirPath);
    } catch (error) {
        // Directory does not exist, create it
        try {
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`Created temporary PDF directory: ${dirPath}`);
        } catch (mkdirError) {
            console.error(`Error creating directory ${dirPath}:`, mkdirError);
            throw new Error(`Could not create temp directory: ${mkdirError}`);
        }
    }
};

// --- Helper function to sanitize dates in JSON Resume object ---
function sanitizeDatesInResume(resume: JsonResumeSchema): JsonResumeSchema {
    const sanitizeDateString = (dateStr: string | undefined): string | undefined => {
        if (!dateStr || typeof dateStr !== 'string') return undefined;

        // Handle "Present" case
        if (dateStr.toLowerCase() === 'present') return 'Present';

        // Try to parse the date string
        try {
            // First check if it's already in YYYY-MM-DD format
            const isoMatch = dateStr.match(/^(\d{4})(-(\d{2}))?(-(\d{2}))?/);
            if (isoMatch) {
                const [_, year, __, month, ___, day] = isoMatch;
                // If only year is provided
                if (!month) return `${year}-01-01`;
                // If year and month are provided
                if (!day) return `${year}-${month}-01`;
                // Full date is provided
                return dateStr;
            }

            // Try parsing as a regular date
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
            }

            // If we can't parse it, return undefined instead of the original string
            console.warn(`Unable to parse date string: ${dateStr}, removing it`);
            return undefined;

        } catch (e) {
            console.warn(`Error parsing date string: ${dateStr}, removing it`);
            return undefined;
        }
    };

    // Sanitize dates in work experience
    if (resume.work) {
        resume.work = resume.work.map(item => ({
            ...item,
            startDate: sanitizeDateString(item.startDate),
            endDate: sanitizeDateString(item.endDate),
        }));
    }
    // Sanitize dates in education
    if (resume.education) {
        resume.education = resume.education.map(item => ({
            ...item,
            startDate: sanitizeDateString(item.startDate),
            endDate: sanitizeDateString(item.endDate),
        }));
    }
    // Add for other sections with dates if needed (e.g., projects, awards)
    if (resume.projects) {
        resume.projects = resume.projects.map(item => ({
            ...item,
            startDate: sanitizeDateString(item.startDate),
            endDate: sanitizeDateString(item.endDate),
        }));
    }

    return resume;
}


// --- Function to generate PDF from HTML content ---
// Consider managing browser instance globally for performance if generating many PDFs
let browserInstance: Browser | null = null;

const getBrowser = async (): Promise<Browser> => {
    if (!browserInstance) {
        console.log('Launching new Puppeteer browser instance...');
        browserInstance = await puppeteer.launch({
            headless: true, // Run in headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Common args for server environments
        });
        // Optional: Handle browser disconnection?
        browserInstance.on('disconnected', () => {
            console.log('Puppeteer browser disconnected.');
            browserInstance = null;
        });
    }
    return browserInstance;
};

export const generateCvPdfFromJsonResume = async (
    // Expects schema-compliant data, but template might be forgiving
    cvJsonResumeObject: JsonResumeSchema,
    // No themeName needed anymore
    filenamePrefix: string
): Promise<string> => {
    await ensureDirExists(TEMP_PDF_DIR);
    console.log(`Attempting to generate CV PDF using internal template...`);

    let page: Page | undefined;
    const browser = await getBrowser();
    // Filename no longer needs theme
    const uniqueFilename = `${filenamePrefix}_${Date.now()}.pdf`;
    const filePath = path.join(TEMP_PDF_DIR, uniqueFilename);

    try {
        // --- Add Defaults for required top-level objects as safety net ---
         const resumeDataForTemplate: JsonResumeSchema = {
             basics: { name: "Applicant", profiles: [], ...cvJsonResumeObject.basics },
             work: Array.isArray(cvJsonResumeObject.work) ? cvJsonResumeObject.work : [],
             education: Array.isArray(cvJsonResumeObject.education) ? cvJsonResumeObject.education : [],
             skills: Array.isArray(cvJsonResumeObject.skills) ? cvJsonResumeObject.skills : [],
             projects: Array.isArray(cvJsonResumeObject.projects) ? cvJsonResumeObject.projects : [],
             languages: Array.isArray(cvJsonResumeObject.languages) ? cvJsonResumeObject.languages : [],
             // Add other sections if needed
             ...cvJsonResumeObject // Spread the rest
         };
         // Ensure basics has minimum content
         if (!resumeDataForTemplate.basics || Object.keys(resumeDataForTemplate.basics).length === 0) {
              resumeDataForTemplate.basics = { name: "Applicant", profiles: [] };
          }


        // 1. Generate HTML using our internal template function
        console.log("Rendering HTML using internal template...");
        // --- Log data being sent to template ---
        console.log(`--- Data being passed to getCvHtml ---`);
        console.log(JSON.stringify(resumeDataForTemplate, null, 2));
        console.log(`---------------------------------------`);
        const htmlContent = getCvHtml(resumeDataForTemplate); // <-- Use our template function
        // --- Log HTML output ---
        console.log(`--- HTML Output from internal template (truncated) ---`);
        console.log(htmlContent.substring(0, 1000) + (htmlContent.length > 1000 ? '...' : ''));
        console.log(`------------------------------------------------------`);
        if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim().length < 100) {
             throw new Error(`Internal template rendered empty or invalid HTML.`);
         }
        console.log(`HTML rendered successfully`);

        // 2. Generate PDF using Puppeteer (as before)
        console.log(`Generating PDF for: ${uniqueFilename}`);
        page = await browser.newPage();
        await page.goto('about:blank', { waitUntil: 'networkidle0' });
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfOptions = {
            path: filePath,
            format: 'A4' as const,
            printBackground: true,
            margin: { top: '25px', right: '25px', bottom: '25px', left: '25px' }, // Use consistent margins
        };
        await page.pdf(pdfOptions);
        console.log(`CV PDF saved temporarily to: ${filePath}`);
        return uniqueFilename;

    } catch (error: any) {
        console.error(`Error generating CV PDF ${uniqueFilename}:`, error);
        throw new Error(`CV PDF generation failed: ${error.message || error}`);
    } finally {
        if (page) {
            try { await page.close(); } catch (closeError) { console.error(`Error closing page:`, closeError); }
        }
    }
};

// --- Generate Cover Letter PDF function ---
export const generateCoverLetterPdf = async (
    coverLetterText: string,
    cvJsonResumeObject: JsonResumeSchema | null, // Optional CV data for context
    filenamePrefix: string
): Promise<string> => {
    await ensureDirExists(TEMP_PDF_DIR); // Ensure temp dir exists

    let page: Page | undefined; // Use correct Puppeteer Page type
    const browser = await getBrowser(); // Get shared browser instance
    const uniqueFilename = `${filenamePrefix}_${Date.now()}.pdf`;
    const filePath = path.join(TEMP_PDF_DIR, uniqueFilename);

    try {
        console.log(`Generating Cover Letter PDF for: ${uniqueFilename}`);
        page = await browser.newPage();

        // Get HTML content for the cover letter
        const htmlContent = getCoverLetterHtml(coverLetterText, cvJsonResumeObject || {}); // Use template function

        // Set content and generate PDF
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' } // Standard margins
        });

        // Save the generated PDF to the temp directory
        await fs.writeFile(filePath, pdfBuffer);
        console.log(`Cover Letter PDF saved temporarily to: ${filePath}`);

        return uniqueFilename; // Return the generated filename

    } catch (error: any) {
        console.error(`Error generating Cover Letter PDF ${uniqueFilename}:`, error);
        throw new Error(`Cover Letter PDF generation failed: ${error.message}`);
    } finally {
        // Ensure the page is closed even if errors occur
        if (page) {
            await page.close();
        }
    }
};

// Optional: Function to close the browser instance gracefully on shutdown
export const closeBrowser = async () => {
    if (browserInstance) {
        console.log('Closing Puppeteer browser instance...');
        await browserInstance.close();
        browserInstance = null;
    }
};