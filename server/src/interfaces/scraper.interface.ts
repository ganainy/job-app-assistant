// server/src/interfaces/scraper.interface.ts
import { RawJobData, JobSearchOptions } from '../services/jobAcquisitionService';

/**
 * Interface for scrapers that extract job descriptions from URLs
 */
export interface IScraper {
    /**
     * Scrape job description from a given URL
     * @param url - The URL of the job posting
     * @param userId - The user ID for context (e.g., for AI provider selection)
     * @returns The extracted job description text
     */
    scrapeJobDescription(url: string, userId: string): Promise<string>;

    /**
     * Fetch structured job details from a URL (optional)
     * @param url - The URL of the job posting
     * @param options - Optional configuration for the scraper
     * @returns Structured job details or null if not available
     */
    fetchJobDetails?(url: string, options?: any): Promise<any>;
}

/**
 * Interface for scrapers that retrieve lists of jobs
 */
export interface IJobListScraper {
    /**
     * Retrieve a list of jobs based on search options
     * @param options - Search criteria (keywords, location, etc.)
     * @param credentials - Optional credentials (e.g., API tokens)
     * @returns Array of raw job data
     */
    retrieveJobs(options: JobSearchOptions, credentials?: any): Promise<RawJobData[]>;
}

