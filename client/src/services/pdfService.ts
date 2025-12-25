// client/src/services/pdfService.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Configuration options for PDF generation
 */
interface PdfGenerationOptions {
    /** PDF filename (without extension) */
    filename: string;
    /** Paper size - defaults to 'a4' */
    format?: 'a4' | 'letter';
    /** PDF orientation - defaults to 'portrait' */
    orientation?: 'portrait' | 'landscape';
    /** Scale factor for the canvas capture - higher = better quality but larger file */
    scale?: number;
}

/**
 * Generates a PDF from an HTML element by capturing it as a canvas and converting to PDF.
 * This ensures WYSIWYG output - what you see in the browser is what you get in the PDF.
 * 
 * @param element - The HTML element to capture and convert to PDF
 * @param options - Configuration options for PDF generation
 * @returns Promise that resolves when the PDF has been downloaded
 */
export const downloadElementAsPdf = async (
    element: HTMLElement,
    options: PdfGenerationOptions
): Promise<void> => {
    const {
        filename,
        format = 'a4',
        orientation = 'portrait',
        scale = 2, // Higher scale = better quality
    } = options;

    try {
        // Capture the element as a canvas with high quality settings
        const canvas = await html2canvas(element, {
            scale,
            useCORS: true,
            allowTaint: true,
            logging: false,
            // Use the actual background color
            backgroundColor: '#ffffff',
            // Improve rendering quality
            imageTimeout: 0,
            removeContainer: true,
        });

        // Get dimensions for A4 or Letter size in points (72 points = 1 inch)
        // A4: 210mm x 297mm
        // Letter: 216mm x 279mm
        const pdfWidth = format === 'a4' ? 210 : 216; // mm
        const pdfHeight = format === 'a4' ? 297 : 279; // mm

        // Calculate dimensions to fit content on page
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Calculate the scaling to fit width
        const scaleFactor = pdfWidth / imgWidth;
        const scaledWidth = pdfWidth;
        const scaledHeight = imgHeight * scaleFactor;

        // Create PDF document
        const pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format,
        });

        // If content is taller than one page, we need to split it
        const pageHeight = pdfHeight;
        let heightLeft = scaledHeight;
        let position = 0;
        let pageNumber = 0;

        // Add the image to the PDF, handling multi-page documents
        const imgData = canvas.toDataURL('image/png', 1.0);

        while (heightLeft > 0) {
            if (pageNumber > 0) {
                pdf.addPage();
            }

            // Add the appropriate portion of the image
            pdf.addImage(
                imgData,
                'PNG',
                0,
                position,
                scaledWidth,
                scaledHeight,
                undefined,
                'FAST'
            );

            heightLeft -= pageHeight;
            position -= pageHeight;
            pageNumber++;
        }

        // Trigger download
        pdf.save(`${filename}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Generates a PDF from a CV preview element with optimized settings for CV documents.
 * 
 * @param element - The CV preview container element
 * @param companyName - Company name for the filename
 * @param jobTitle - Job title for the filename
 * @param language - Language code ('en' or 'de') for filename prefix
 * @returns Promise that resolves when the PDF has been downloaded
 */
export const downloadCvAsPdf = async (
    element: HTMLElement,
    companyName: string,
    jobTitle?: string,
    language: 'en' | 'de' = 'en'
): Promise<void> => {
    // Sanitize filename components
    const sanitize = (str: string) =>
        str?.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_').substring(0, 50) || 'Unknown';

    const companySanitized = sanitize(companyName || 'Company');
    const langPrefix = language === 'de' ? 'Lebenslauf' : 'CV';

    let filename = `${langPrefix}_${companySanitized}`;
    if (jobTitle) {
        const titleSanitized = sanitize(jobTitle);
        filename = `${langPrefix}_${companySanitized}_${titleSanitized}`;
    }

    await downloadElementAsPdf(element, {
        filename,
        format: 'a4',
        orientation: 'portrait',
        scale: 2,
    });
};
