// server/src/services/jobAcquisitionService.ts
import { ScraperService } from './scraperService';

/**
 * LinkedIn scraper structured data
 */
export interface LinkedInJobDetails {
    job_id: string;
    job_title: string;
    company_name: string;
    job_url: string;
    job_description: string;
    skills?: string[];
    salary_details?: {
        min_salary?: string;
        max_salary?: string;
        currency_code?: string;
        pay_period?: string;
    };
    job_location?: string;
    remote_allow?: boolean;
    experience_level?: string;
    company_description?: string;
    [key: string]: any; // Allow other fields
}

/**
 * Job data from external source
 */
export interface RawJobData {
    jobId: string;
    jobTitle: string;
    companyName: string;
    jobUrl: string;
    jobDescriptionText: string;
    jobPostDate?: Date; // When the job was posted (from crawler)
    structuredData?: LinkedInJobDetails; // Full structured data from scraper
}

/**
 * Sanitize LinkedIn job search URL
 * Removes current job ID parameters and other noise
 */
export const sanitizeLinkedInUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);

        // Remove specific job ID parameters that would limit results
        urlObj.searchParams.delete('currentJobId');
        urlObj.searchParams.delete('refId');
        urlObj.searchParams.delete('trackingId');

        return urlObj.toString();
    } catch (error) {
        // If URL parsing fails, return as-is
        return url;
    }
};

/**
 * Extract unique job ID from various job board URLs
 */
export const extractJobId = (jobUrl: string): string => {
    try {
        const urlObj = new URL(jobUrl);

        // LinkedIn: Extract from path or query parameters
        if (jobUrl.includes('linkedin.com')) {
            // Try to extract from path (e.g., /jobs/view/1234567890)
            const pathMatch = urlObj.pathname.match(/\/view\/(\d+)/);
            if (pathMatch) return pathMatch[1];

            // Try to extract from query param (e.g., currentJobId=1234567890)
            const currentJobId = urlObj.searchParams.get('currentJobId');
            if (currentJobId) return currentJobId;

            // Try to extract any numeric ID from the path
            const numericMatch = urlObj.pathname.match(/\/(\d{10,})/);
            if (numericMatch) return numericMatch[1];
        }

        // Indeed: Extract from jk parameter
        if (jobUrl.includes('indeed.com')) {
            const jk = urlObj.searchParams.get('jk');
            if (jk) return jk;
        }

        // Fallback: use hash of full URL (first 24 chars for readability)
        const hash = Buffer.from(jobUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
        return hash || jobUrl;
    } catch (error) {
        // Fallback: use hash of URL
        return Buffer.from(jobUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
    }
};

/**
 * Filter array of items to only include job postings
 * Removes articles, ads, and other non-job content
 */
export const filterJobPostings = (items: any[]): any[] => {
    return items.filter(item => {
        // Basic filtering - adjust based on actual data structure
        const title = item.title || item.jobTitle || '';
        const type = item.type || item.contentType || '';

        // Exclude articles, news, ads
        if (type.toLowerCase().includes('article')) return false;
        if (type.toLowerCase().includes('news')) return false;
        if (type.toLowerCase().includes('ad')) return false;

        // Must have a title
        if (!title) return false;

        return true;
    });
};

/**
 * Job search options for retrieving jobs
 */
export interface JobSearchOptions {
    keywords?: string; // Job search keywords (max 200 chars)
    location?: string; // Job search location (max 100 chars)
    jobType?: string[]; // Job types: "full-time", "part-time", "contract", "internship"
    experienceLevel?: string[]; // Experience levels: "entry level", "associate", "mid-senior level", "director", "internship"
    datePosted?: string; // Date filter: "any time", "past 24 hours", "past week", "past month"
    maxJobs?: number; // Maximum number of jobs (20-1000, default 100)
    avoidDuplicates?: boolean; // Skip already scraped jobs
}


/**
 * Simple job retrieval using RSS or direct scraping
 * This is a placeholder - you might want to use RSS.app or custom scraper
 */
export const retrieveJobsSimple = async (searchUrl: string): Promise<RawJobData[]> => {
    // This would need actual implementation based on your chosen service
    // For now, returning empty array as placeholder
    console.warn('Simple job retrieval not yet implemented - use Apify integration');
    return [];
};

/**
 * Main job retrieval function
 * Uses ScraperService to get the appropriate job list scraper
 */
export const retrieveJobs = async (
    apifyToken: string,
    options: JobSearchOptions
): Promise<RawJobData[]> => {
    if (!apifyToken) {
        throw new Error('Apify API token is required');
    }
    const scraper = ScraperService.getJobListScraper();
    return await scraper.retrieveJobs(options, { apifyToken });
};
