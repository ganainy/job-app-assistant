// server/src/services/jobAcquisitionService.ts
import axios from 'axios';

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
 * Fetch full job details including structured data from Apify
 * Returns the full structured object from LinkedIn scraper
 */
/**
 * Fetch full job details including description using bestscrapers LinkedIn job details scraper
 * This should be used for each individual job to get complete information
 * Actor: bestscrapers/linkedin-job-details-scraper
 */
const fetchJobDetailsFromApify = async (
    jobUrl: string,
    apifyToken: string
): Promise<LinkedInJobDetails | null> => {
    try {
        // Use bestscrapers scraper for individual job details (includes full descriptions)
        const actorId = 'bestscrapers~linkedin-job-details-scraper';  // Note: tilde, not slash

        // Clean the URL to match the required format: https://www.linkedin.com/jobs/view/{jobId}
        // Extract just the job ID from URLs like: https://www.linkedin.com/jobs/view/it-trainee-at-charles-it-4348323472
        const jobIdMatch = jobUrl.match(/\/(\d+)\/?$/);
        const cleanUrl = jobIdMatch
            ? `https://www.linkedin.com/jobs/view/${jobIdMatch[1]}`
            : jobUrl;

        console.log(`    Fetching job details from: ${cleanUrl}`);

        const response = await axios.post(
            `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
            {
                job_url: cleanUrl  // Must be in this exact format for bestscrapers scraper
            }
        );

        const runId = response.data.data.id;

        // Wait for scraper to finish (polling)
        // Increased timeout for details scraper as it needs to fetch full job page
        for (let i = 0; i < 30; i++) { // Increased from 20 to 30 (60 seconds total)
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
                
                if (!data) {
                    console.log(`    ⚠ Warning: Job details scraper returned null/undefined data for ${cleanUrl}`);
                    return null;
                }
                
                // Handle array response (normal case)
                if (Array.isArray(data) && data.length > 0) {
                    const rawResponse = data[0];
                    
                    // Priority 1: Check if job_description exists directly at top level (normal success case)
                    // Note: Some scrapers return message: "ok" along with the data, so we check for job_description first
                    if (rawResponse.job_description && typeof rawResponse.job_description === 'string') {
                        if (rawResponse.job_description.length >= 50) {
                            console.log(`    ✓ Successfully fetched job description (${rawResponse.job_description.length} chars)`);
                            return rawResponse as LinkedInJobDetails;
                        } else {
                            console.log(`    ⚠ Warning: Job description too short (${rawResponse.job_description.length} chars)`);
                        }
                    }
                    
                    // Priority 2: Check if data is nested in a 'data' field (some responses wrap data)
                    if (rawResponse.data && typeof rawResponse.data === 'object') {
                        if (rawResponse.data.job_description && typeof rawResponse.data.job_description === 'string') {
                            if (rawResponse.data.job_description.length >= 50) {
                                console.log(`    ✓ Found job description in nested data field (${rawResponse.data.job_description.length} chars)`);
                                return rawResponse.data as LinkedInJobDetails;
                            }
                        }
                    }
                    
                    // Priority 3: Check for alternative field names
                    const altFields = ['description', 'jobDescription', 'jobDescriptionText', 'text', 'content'];
                    for (const field of altFields) {
                        if (rawResponse[field] && typeof rawResponse[field] === 'string' && rawResponse[field].length >= 50) {
                            console.log(`    ✓ Found description in alternative field: ${field} (${rawResponse[field].length} chars)`);
                            const jobDetails = rawResponse as LinkedInJobDetails;
                            jobDetails.job_description = rawResponse[field];
                            return jobDetails;
                        }
                    }
                    
                    // Priority 4: Check if this is an actual error response (has error message but no job_description)
                    if (rawResponse.message && rawResponse.message !== 'ok') {
                        console.log(`    ⚠ Warning: Job details scraper returned error response for ${cleanUrl}`);
                        console.log(`    Error message: ${rawResponse.message}`);
                        return null;
                    }
                    
                    // If we get here, description is missing or too short
                    console.log(`    ⚠ Warning: Job details scraper returned empty/short description for ${cleanUrl}`);
                    console.log(`    Description length: ${rawResponse.job_description?.length || 0}`);
                    console.log(`    Available fields: ${Object.keys(rawResponse).join(', ')}`);
                    return null;
                }
                
                // Handle non-array response (shouldn't happen, but handle it)
                console.log(`    ⚠ Warning: Job details scraper returned unexpected response format for ${cleanUrl}`);
                console.log(`    Response type: ${typeof data}, Is array: ${Array.isArray(data)}`);
                if (typeof data === 'object' && !Array.isArray(data)) {
                    console.log(`    Response keys: ${Object.keys(data).join(', ')}`);
                }
                return null;
            } else if (status === 'FAILED') {
                const errorInfo = statusResponse.data.data;
                console.error(`Job details scraping failed for ${cleanUrl}`);
                console.error(`  Status: ${status}, Error: ${JSON.stringify(errorInfo.stats || errorInfo.errorInfo || 'Unknown error')}`);
                return null;
            }
            
            // Log progress every 10 iterations
            if (i > 0 && i % 10 === 0) {
                console.log(`    Still waiting for job details... (${i * 2}s elapsed)`);
            }
        }

        console.error(`Timeout waiting for job details after 60s: ${cleanUrl}`);
        return null;
    } catch (error: any) {
        console.error(`Error fetching job details for ${jobUrl}:`, error.message);
        return null;
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

        // Use patrickvicente's LinkedIn job scraper for getting job list only
        // This scraper is fast and cheap, but doesn't return full job descriptions
        // Actor: patrickvicente/linkedin-job-scraper---ultra-fast-and-cheap
        const actorId = '4NagaIHzI0lwMxdrI'; // Verify this is the correct actor ID for patrickvicente's scraper

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
        // The list scraper (patrickvicente) only returns basic job info, not full descriptions
        // We need to use the details scraper (bestscrapers) for each job to get full descriptions
        const results: RawJobData[] = [];

        console.log(`\n→ List scraper returned ${dataset.length} jobs`);
        console.log(`→ Now fetching full job details for each job using details scraper...`);

        for (let index = 0; index < dataset.length; index++) {
            const item = dataset[index];

            // Debug: log first 3 items to see the structure from list scraper
            if (index < 3) {
                console.log(`\nList scraper item ${index + 1}:`, JSON.stringify(item, null, 2));
            }

            // Extract job URL from list scraper result
            // The list scraper should provide job URLs that we can use with the details scraper
            const jobUrl = item.link || item.url || item.job_url || item.jobUrl || '';
            const directId = item.id;
            const extractedId = directId || extractJobId(jobUrl);

            if (!jobUrl) {
                console.log(`  [${index + 1}/${dataset.length}] ⚠ Skipping: No job URL found for ${item.title || 'Unknown'}`);
                continue;
            }

            // Debug: log URL and extracted ID for first 3 items
            if (index < 3) {
                console.log(`Direct ID: ${directId}`);
                console.log(`Job URL: ${jobUrl}`);
                console.log(`Final ID: ${extractedId}\n`);
            }

            // Fetch full job details using bestscrapers details scraper
            // This is the correct scraper for getting complete job information including descriptions
            console.log(`  [${index + 1}/${dataset.length}] Fetching full details for: ${item.title || 'Unknown'}`);
            const jobDetails = await fetchJobDetailsFromApify(jobUrl, apifyToken);

            // Use structured data if available, otherwise fall back to basic fields
            const structuredData = jobDetails;
            
            // Try to get description from details scraper first, then fall back to search result
            let jobDescriptionText = jobDetails?.job_description || '';
            
            // Fallback: Check if search result already has description
            if (!jobDescriptionText || jobDescriptionText.length < 50) {
                jobDescriptionText = item.description || item.job_description || item.jobDescription || '';
            }
            
            const finalJobTitle = jobDetails?.job_title || item.title || item.position || item.job_title || item.jobTitle || '';
            const finalCompanyName = jobDetails?.company_name || item.company || item.companyName || item.company_name || '';
            const finalJobId = jobDetails?.job_id || extractedId;
            const finalJobUrl = jobDetails?.job_url || jobUrl;
            
            // Log if description is still missing
            if (!jobDescriptionText || jobDescriptionText.length < 50) {
                console.log(`    ⚠ Warning: No description found for job ${finalJobTitle} at ${finalCompanyName}`);
                console.log(`    URL: ${finalJobUrl}`);
                console.log(`    Details scraper returned: ${jobDetails ? 'data object' : 'null'}`);
            }

            results.push({
                jobId: finalJobId,
                jobTitle: finalJobTitle,
                companyName: finalCompanyName,
                jobUrl: finalJobUrl,
                jobDescriptionText: jobDescriptionText,
                structuredData: structuredData || undefined
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
