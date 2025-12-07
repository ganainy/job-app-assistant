// server/src/services/scrapers/ApifyJobDetailsScraper.ts
import axios from 'axios';
import { IScraper } from '../../interfaces/scraper.interface';
import { LinkedInJobDetails } from '../jobAcquisitionService';

/**
 * Apify-based scraper for fetching individual job details
 * Uses bestscrapers~linkedin-job-details-scraper actor
 */
export class ApifyJobDetailsScraper implements IScraper {
    private readonly actorId = 'bestscrapers~linkedin-job-details-scraper';

    /**
     * Scrape job description from a URL using Apify
     * Note: This requires the apifyToken to be provided via options when calling fetchJobDetails
     * For direct use, you should call fetchJobDetails with the token in options
     */
    async scrapeJobDescription(url: string, userId: string): Promise<string> {
        // Note: scrapeJobDescription requires apifyToken, but we don't have access to it here
        // This method is primarily for interface compliance
        // In practice, use fetchJobDetails directly with the token
        throw new Error('ApifyJobDetailsScraper.scrapeJobDescription requires apifyToken. Use fetchJobDetails(url, { apifyToken }) instead.');
    }

    /**
     * Fetch structured job details from Apify
     * This method is part of the IScraper interface (optional method)
     */
    async fetchJobDetails(url: string, options?: { apifyToken?: string }): Promise<LinkedInJobDetails | null> {
        const apifyToken = options?.apifyToken;
        if (!apifyToken) {
            throw new Error('Apify API token is required for ApifyJobDetailsScraper');
        }

        try {
            // Clean the URL to match the required format: https://www.linkedin.com/jobs/view/{jobId}
            const jobIdMatch = url.match(/\/(\d+)\/?$/);
            const cleanUrl = jobIdMatch
                ? `https://www.linkedin.com/jobs/view/${jobIdMatch[1]}`
                : url;

            console.log(`    Fetching job details from: ${cleanUrl}`);

            const response = await axios.post(
                `https://api.apify.com/v2/acts/${this.actorId}/runs?token=${apifyToken}`,
                {
                    job_url: cleanUrl
                }
            );

            const runId = response.data.data.id;

            // Wait for scraper to finish (polling)
            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000));

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
                        
                        // Priority 1: Check if job_description exists directly at top level
                        if (rawResponse.job_description && typeof rawResponse.job_description === 'string') {
                            if (rawResponse.job_description.length >= 50) {
                                console.log(`    ✓ Successfully fetched job description (${rawResponse.job_description.length} chars)`);
                                return rawResponse as LinkedInJobDetails;
                            } else {
                                console.log(`    ⚠ Warning: Job description too short (${rawResponse.job_description.length} chars)`);
                            }
                        }
                        
                        // Priority 2: Check if data is nested in a 'data' field
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
                        
                        // Priority 4: Check if this is an actual error response
                        if (rawResponse.message && rawResponse.message !== 'ok') {
                            console.log(`    ⚠ Warning: Job details scraper returned error response for ${cleanUrl}`);
                            console.log(`    Error message: ${rawResponse.message}`);
                            return null;
                        }
                        
                        console.log(`    ⚠ Warning: Job details scraper returned empty/short description for ${cleanUrl}`);
                        console.log(`    Description length: ${rawResponse.job_description?.length || 0}`);
                        console.log(`    Available fields: ${Object.keys(rawResponse).join(', ')}`);
                        return null;
                    }
                    
                    // Handle non-array response
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
            console.error(`Error fetching job details for ${url}:`, error.message);
            return null;
        }
    }

}

