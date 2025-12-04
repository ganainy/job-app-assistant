// server/src/services/jobAcquisitionService.ts
import axios from 'axios';

/**
 * Job data from external source
 */
export interface RawJobData {
    jobId: string;
    jobTitle: string;
    companyName: string;
    jobUrl: string;
    jobDescriptionText: string;
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
 * Fetch full job details including description from Apify
 */
const fetchJobDetailsFromApify = async (
    jobUrl: string,
    apifyToken: string
): Promise<string> => {
    try {
        const actorId = 'bestscrapers~linkedin-job-details-scraper';  // Note: tilde, not slash

        // Clean the URL to match the required format: https://www.linkedin.com/jobs/view/{jobId}
        // Extract just the job ID from URLs like: https://www.linkedin.com/jobs/view/it-trainee-at-charles-it-4348323472
        const jobIdMatch = jobUrl.match(/\/(\d+)\/?$/);
        const cleanUrl = jobIdMatch
            ? `https://www.linkedin.com/jobs/view/${jobIdMatch[1]}`
            : jobUrl;

        console.log(`    Cleaned URL: ${cleanUrl}`);

        const response = await axios.post(
            `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
            {
                job_url: cleanUrl  // Must be in this exact format
            }
        );

        const runId = response.data.data.id;

        // Wait for scraper to finish (polling)
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

            const statusResponse = await axios.get(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
            );

            const status = statusResponse.data.data.status;
            if (status === 'SUCCEEDED') {
                const datasetId = statusResponse.data.data.defaultDatasetId;
                const datasetResponse = await axios.get(
                    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
                );

                const data = datasetResponse.data;
                if (data && data.length > 0 && data[0].data) {
                    return data[0].data.job_description || '';
                }
                return '';
            } else if (status === 'FAILED') {
                console.error(`Job details scraping failed for ${cleanUrl}`);
                return '';
            }
        }

        console.error(`Timeout waiting for job details: ${cleanUrl}`);
        return '';
    } catch (error: any) {
        console.error(`Error fetching job details for ${jobUrl}:`, error.message);
        return '';
    }
};

/**
 * Retrieve jobs using Apify LinkedIn scraper
 * Note: Requires Apify API token
 */
export const retrieveJobsFromApify = async (
    searchUrl: string,
    apifyToken: string,
    maxJobs: number = 50
): Promise<RawJobData[]> => {
    try {
        if (!apifyToken) {
            throw new Error('Apify API token is not configured. Please add your Apify token in the Integrations settings page.');
        }

        // Updated Apify actor ID for LinkedIn job scraper
        const actorId = '4NagaIHzI0lwMxdrI';

        const response = await axios.post(
            `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
            {
                start_urls: [{ url: searchUrl }],  // Updated: start_urls instead of startUrls
                max_jobs: Math.min(100, Math.max(20, maxJobs)),  // Ensure 20-100 range
                avoid_duplicates: false
            }
        );

        const runId = response.data.data.id;

        // Wait for scraper to finish (polling)
        let dataset: any[] = [];
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

            const statusResponse = await axios.get(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
            );

            const status = statusResponse.data.data.status;
            if (status === 'SUCCEEDED') {
                const datasetId = statusResponse.data.data.defaultDatasetId;
                const datasetResponse = await axios.get(
                    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
                );
                dataset = datasetResponse.data;
                break;
            } else if (status === 'FAILED') {
                throw new Error('Apify scraping failed');
            }
        }

        // Transform Apify results to our format
        // Note: Field names may vary, adjust based on actual response structure
        const results: RawJobData[] = [];

        console.log(`\n→ Fetching full descriptions for ${dataset.length} jobs...`);

        for (let index = 0; index < dataset.length; index++) {
            const item = dataset[index];

            // Debug: log first 3 items to see the structure
            if (index < 3) {
                console.log(`\nApify item ${index + 1}:`, JSON.stringify(item, null, 2));
            }

            // Prefer the 'id' field from Apify if available, otherwise extract from URL
            const directId = item.id;
            const jobUrl = item.link || item.url || item.job_url || item.jobUrl || '';
            const extractedId = directId || extractJobId(jobUrl);

            // Debug: log URL and extracted ID for first 3 items
            if (index < 3) {
                console.log(`Direct ID: ${directId}`);
                console.log(`URL: ${jobUrl}`);
                console.log(`Final ID: ${extractedId}\n`);
            }

            // Fetch full job description using the details scraper
            console.log(`  [${index + 1}/${dataset.length}] Fetching description for: ${item.title || 'Unknown'}`);
            const fullDescription = await fetchJobDetailsFromApify(jobUrl, apifyToken);

            results.push({
                jobId: extractedId,
                jobTitle: item.title || item.position || item.job_title || item.jobTitle || '',
                companyName: item.company || item.companyName || item.company_name || '',
                jobUrl: jobUrl,
                jobDescriptionText: fullDescription
            });
        }

        console.log(`✓ Fetched descriptions for ${results.length} jobs\n`);
        return results;
    } catch (error: any) {
        console.error('Error retrieving jobs from Apify:', error.message);

        // Provide clearer error messages
        if (error.response?.status === 404) {
            throw new Error('Apify actor not found. Please verify your Apify token is valid and has access to the LinkedIn scraper.');
        } else if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error('Apify authentication failed. Please check your Apify API token in the Integrations settings page.');
        } else if (error.message?.includes('not configured')) {
            throw error; // Re-throw our custom message
        } else {
            throw new Error(`Failed to retrieve jobs from Apify: ${error.message}`);
        }
    }
};

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
 * Tries Apify if token available, falls back to simple method
 */
export const retrieveJobs = async (
    searchUrl: string,
    apifyToken?: string,
    maxJobs: number = 50
): Promise<RawJobData[]> => {
    const sanitizedUrl = sanitizeLinkedInUrl(searchUrl);

    if (apifyToken) {
        return await retrieveJobsFromApify(sanitizedUrl, apifyToken, maxJobs);
    } else {
        return await retrieveJobsSimple(sanitizedUrl);
    }
};
