// server/src/services/scrapers/ApifyJobListScraper.ts
import axios from 'axios';
import { IJobListScraper } from '../../interfaces/scraper.interface';
import { RawJobData, JobSearchOptions, extractJobId, LinkedInJobDetails } from '../jobAcquisitionService';
import { ApifyJobDetailsScraper } from './ApifyJobDetailsScraper';

/**
 * Apify-based scraper for retrieving lists of jobs
 * Uses patrickvicente/linkedin-job-scraper---ultra-fast-and-cheap for job lists
 * Uses bestscrapers~linkedin-job-details-scraper (via ApifyJobDetailsScraper) for individual job details
 */
export class ApifyJobListScraper implements IJobListScraper {
    private readonly listActorId = '4NagaIHzI0lwMxdrI'; // patrickvicente/linkedin-job-scraper---ultra-fast-and-cheap
    private detailsScraper: ApifyJobDetailsScraper;

    constructor() {
        this.detailsScraper = new ApifyJobDetailsScraper();
    }

    /**
     * Retrieve jobs using Apify LinkedIn scrapers
     */
    async retrieveJobs(options: JobSearchOptions, credentials?: { apifyToken?: string }): Promise<RawJobData[]> {
        const apifyToken = credentials?.apifyToken;
        if (!apifyToken) {
            throw new Error('Apify API token is not configured. Please add your Apify token in the Integrations settings page.');
        }

        // Validate required fields
        if (!options.keywords && !options.location) {
            throw new Error('Either keywords or location must be provided');
        }

        // Build request payload with all supported parameters
        const requestPayload: any = {
            max_jobs: Math.min(1000, Math.max(20, options.maxJobs || 100)),
            avoid_duplicates: options.avoidDuplicates || false
        };

        // Add optional parameters if provided
        if (options.keywords) {
            requestPayload.keywords = options.keywords.substring(0, 200);
        }
        if (options.location) {
            requestPayload.location = options.location.substring(0, 100);
        }
        if (options.jobType && options.jobType.length > 0) {
            requestPayload.job_type = options.jobType;
        }
        if (options.experienceLevel && options.experienceLevel.length > 0) {
            requestPayload.experience_level = options.experienceLevel;
        }
        if (options.datePosted) {
            const validDatePosted = options.datePosted === 'past hour' ? 'past 24 hours' : options.datePosted;
            const validValues = ['any time', 'past 24 hours', 'past week', 'past month'];
            if (validValues.includes(validDatePosted)) {
                requestPayload.date_posted = validDatePosted;
            }
        }

        console.log(`→ Job search parameters:`, JSON.stringify(requestPayload, null, 2));

        const response = await axios.post(
            `https://api.apify.com/v2/acts/${this.listActorId}/runs?token=${apifyToken}`,
            requestPayload
        );

        const runId = response.data.data.id;

        // Wait for scraper to finish (polling)
        let dataset: any[] = [];
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
            console.log(`  [${index + 1}/${dataset.length}] Fetching full details for: ${item.title || 'Unknown'}`);
            const jobDetails = this.detailsScraper.fetchJobDetails 
                ? await this.detailsScraper.fetchJobDetails(jobUrl, { apifyToken })
                : null;

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
            
            // Extract job post date from scraper response
            let jobPostDate: Date | undefined;
            const postDateValue = item.posted_at || item.posted_date || item.date_posted || item.postedAt || item.posted ||
                                 jobDetails?.posted_at || jobDetails?.posted_date || jobDetails?.date_posted || jobDetails?.postedAt;
            
            if (postDateValue) {
                try {
                    if (postDateValue instanceof Date) {
                        jobPostDate = postDateValue;
                    } else if (typeof postDateValue === 'string') {
                        let dateString = postDateValue.trim();
                        if (dateString.endsWith(' UTC')) {
                            dateString = dateString.replace(' UTC', 'Z');
                        }
                        const parsed = new Date(dateString);
                        if (!isNaN(parsed.getTime())) {
                            jobPostDate = parsed;
                        } else {
                            console.log(`    ⚠ Warning: Could not parse post date string: ${postDateValue}`);
                        }
                    } else if (typeof postDateValue === 'number') {
                        jobPostDate = new Date(postDateValue);
                    }
                } catch (error) {
                    console.log(`    ⚠ Warning: Could not parse post date: ${postDateValue}`, error);
                }
            } else {
                // Debug: log available fields if post date is missing
                if (index < 3) {
                    console.log(`    Debug: No post date found. Available fields in item:`, Object.keys(item));
                    if (jobDetails) {
                        console.log(`    Debug: Available fields in jobDetails:`, Object.keys(jobDetails));
                    }
                }
            }
            
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
                jobPostDate: jobPostDate,
                structuredData: structuredData || undefined
            });
        }

        console.log(`✓ Fetched descriptions for ${results.length} jobs\n`);
        return results;
    }
}

