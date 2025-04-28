// server/src/utils/pdfGenerator.ts
import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises'; // Use promise-based fs
import { getCvHtml, getCoverLetterHtml } from './pdfTemplates'; // Import templates
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
        if (!dateStr || typeof dateStr !== 'string') return dateStr;

        // Handle "Present" - themes often understand this directly
        if (dateStr.toLowerCase() === 'present') return 'Present';

        // Attempt to parse common formats - this is basic, can be expanded
        // Try YYYY-MM-DD, YYYY-MM, YYYY
        const isoMatch = dateStr.match(/^(\d{4})(-(\d{2}))?(-(\d{2}))?/);
        if (isoMatch) return dateStr; // Keep valid ISO-like formats

        // Try "Month YYYY" or "Mon YYYY"
        try {
            const parsedDate = new Date(dateStr);
            // Check if it's a valid date after parsing attempt
            if (!isNaN(parsedDate.getTime())) {
                // Return in a consistent format themes *might* handle, like YYYY-MM
                // Or just keep the original string if parsing is ambiguous
                // For safety, let's just return the original if it parses but isn't ISO
                // return parsedDate.getFullYear() + '-' + ('0' + (parsedDate.getMonth() + 1)).slice(-2);
                console.warn(`Keeping potentially ambiguous date string: ${dateStr}`);
                return dateStr;
            }
        } catch (e) { /* ignore parse error */ }

        // If unparseable or non-standard, return the original string.
        // The theme *might* just display it as text, or it might still break.
        console.warn(`Returning potentially problematic date string: ${dateStr}`);
        return dateStr;
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
    cvJsonResumeObject: JsonResumeSchema,
    themeName: string, // e.g., 'class', 'elegant', 'even', 'modern'
    filenamePrefix: string
): Promise<string> => {
    await ensureDirExists(TEMP_PDF_DIR);
    // Fallback to default theme if provided name is invalid/empty
    const validThemes = ['class', 'even', 'elegant', 'modern']; // Keep a list of your installed/supported themes
    const effectiveThemeName = validThemes.includes(themeName) ? themeName : 'class'; // Default to 'class'
    console.log(`Attempting to generate CV PDF with theme: ${effectiveThemeName}`);

    let page: Page | undefined;
    const browser = await getBrowser();
    // Include theme in filename using the *effective* theme name
    const uniqueFilename = `${filenamePrefix}_${effectiveThemeName}_${Date.now()}.pdf`;
    const filePath = path.join(TEMP_PDF_DIR, uniqueFilename);

    try {
        // --- Sanitize dates BEFORE rendering ---
        // Deep copy to avoid modifying the original object passed to the function
        const sanitizedResume = sanitizeDatesInResume(JSON.parse(JSON.stringify(cvJsonResumeObject)));

        // --- Ensure basics object exists ---
        if (!sanitizedResume.basics) {
            console.warn(`Resume data was missing 'basics' object. Adding default empty basics object.`);
            sanitizedResume.basics = { // Add a default empty object
                name: "Unknown Applicant", // Add a default name maybe
                label: "",
                email: "",
                phone: "",
                url: "",
                summary: "",
                location: {},
                profiles: []
            };
        }

        // You could add similar checks/defaults for other potentially required top-level fields
        // if other themes complain (e.g., ensure work/education are at least empty arrays if null/undefined)
        if (!sanitizedResume.work) sanitizedResume.work = [];
        if (!sanitizedResume.education) sanitizedResume.education = [];
        if (!sanitizedResume.skills) sanitizedResume.skills = [];
        // etc. for other sections the theme might strictly expect


        // 1. Dynamically load the theme package
        let theme: Theme;
        let themePackageName: string;
        try {
            // Handle scoped vs non-scoped package names
            if (effectiveThemeName === 'class') {
                themePackageName = '@jsonresume/jsonresume-theme-class';
            } else {
                themePackageName = `jsonresume-theme-${effectiveThemeName}`;
            }

            console.log(`Loading theme package: ${themePackageName}`);
            theme = require(themePackageName); // Use require for dynamic loading
            if (typeof theme.render !== 'function') {
                throw new Error(`Theme '${effectiveThemeName}' (${themePackageName}) does not have a valid render function.`);
            }
        } catch (loadError: any) {
            console.error(`Failed to load theme '${effectiveThemeName}':`, loadError.message);
            // Rethrow or handle more gracefully (e.g., try default theme again?)
            throw new Error(`Theme '${effectiveThemeName}' not found or invalid. Ensure '${effectiveThemeName}' is installed correctly.`);
        }


        console.log(`--- Data being passed to theme ${effectiveThemeName}.render() ---`);
        console.log(JSON.stringify(sanitizedResume, null, 2)); // Log the exact object
        console.log(`-------------------------------------------------------------`);

        // 2. Render HTML using the theme with data GUARANTEED to have basics
        console.log(`Rendering HTML using theme: ${effectiveThemeName}`);

        const htmlContent = theme.render(sanitizedResume); // <-- Use sanitizedResume

        console.log(`--- HTML Output from theme ${effectiveThemeName} (truncated) ---`);
        console.log(htmlContent.substring(0, 1000) + (htmlContent.length > 1000 ? '...' : '')); // Log first 1000 chars
        console.log(`-------------------------------------------------------------`);

        if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim().length < 100) { // Check for minimal HTML output
            throw new Error(`Theme '${effectiveThemeName}' rendered empty or invalid HTML.`); // Throw error if output seems empty
        }
        
        if (!htmlContent || typeof htmlContent !== 'string') { throw new Error(`Theme '${effectiveThemeName}' failed to render HTML.`); }
        console.log(`HTML rendered successfully`);

        // 3. Generate PDF using Puppeteer
        console.log(`Generating PDF for: ${uniqueFilename}`);
        page = await browser.newPage();

        // Navigate to blank page first, then set content
        await page.goto('about:blank', { waitUntil: 'networkidle0' });
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // Load the generated HTML

        // Combine default options with theme-specific options (if provided)
        const pdfOptions = {
            path: filePath, // Save directly to file path
            format: 'A4' as const, // Use 'as const' for type safety if needed
            printBackground: true,
            margin: { top: '25px', right: '25px', bottom: '25px', left: '25px' }, // Example margins
            ...(theme.pdfRenderOptions || {}) // Merge theme options if they exist
        };

        await page.pdf(pdfOptions); // Generate the PDF
        console.log(`CV PDF saved temporarily to: ${filePath}`);

        return uniqueFilename; // Return only the filename

    } catch (error: any) { // Catch specific errors if needed, otherwise 'any'
        console.error(`Error generating CV PDF ${uniqueFilename} with theme ${effectiveThemeName}:`, error);
        // Rethrow with a more specific message if possible, including theme name
        throw new Error(`CV PDF generation failed for theme ${effectiveThemeName}: ${error.message}`);
    } finally {
        // Ensure the page is closed to free up resources
        if (page) {
            try {
                await page.close();
            } catch (closeError) {
                console.error(`Error closing Puppeteer page for ${uniqueFilename}:`, closeError);
            }
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