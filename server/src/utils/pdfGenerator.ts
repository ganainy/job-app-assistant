// server/src/utils/pdfGenerator.ts
import puppeteer, { Browser } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises'; // Use promise-based fs
import { getCvHtml, getCoverLetterHtml } from './pdfTemplates'; // Import templates

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

export const generatePdf = async (htmlContent: string, filenamePrefix: string): Promise<string> => {
     await ensureDirExists(TEMP_PDF_DIR); // Make sure directory exists first

     let page;
     const browser = await getBrowser();
     const uniqueFilename = `${filenamePrefix}_${Date.now()}.pdf`;
     const filePath = path.join(TEMP_PDF_DIR, uniqueFilename);

    try {
         console.log(`Generating PDF for: ${uniqueFilename}`);
         page = await browser.newPage();
         await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // Load HTML

        // Generate PDF buffer
         const pdfBuffer = await page.pdf({
             format: 'A4',
             printBackground: true, // Include background colors/images from CSS
             margin: { // Example margins
                top: '40px',
                right: '40px',
                bottom: '40px',
                left: '40px'
             }
         });

        // Save the buffer to the temporary file
         await fs.writeFile(filePath, pdfBuffer);
         console.log(`PDF saved temporarily to: ${filePath}`);

        return uniqueFilename; // Return only the filename

    } catch (error) {
         console.error(`Error generating PDF ${uniqueFilename}:`, error);
         throw new Error(`PDF generation failed: ${error}`);
    } finally {
         if (page) {
             await page.close(); // Close the page
         }
         // Keep browser instance open for potential reuse
         // Consider closing it explicitly on server shutdown or after inactivity
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