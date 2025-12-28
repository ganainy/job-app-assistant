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

        // ==========================================
        // PARALLEL JOB DETAILS FETCHING (10x speedup)
        // ==========================================
        // Instead of fetching job details sequentially (one at a time),
        // we fetch them in parallel batches. This reduces total time from
        // ~50 minutes to ~5 minutes for 100 jobs.

        const CONCURRENT_LIMIT = 10; // Number of parallel Apify actor runs
        const results: RawJobData[] = [];

        // Helper function to process a single job item
        const processJobItem = async (item: any, index: number): Promise<RawJobData | null> => {
            // Extract job URL from list scraper result
            const jobUrl = item.link || item.url || item.job_url || item.jobUrl || '';
            const directId = item.id;
            const extractedId = directId || extractJobId(jobUrl);

            if (!jobUrl) {
                console.log(`  [${index + 1}/${dataset.length}] ⚠ Skipping: No job URL found for ${item.title || 'Unknown'}`);
                return null;
            }

            // Debug: log first 3 items
            if (index < 3) {
                console.log(`\nList scraper item ${index + 1}:`, JSON.stringify(item, null, 2));
                console.log(`Direct ID: ${directId}`);
                console.log(`Job URL: ${jobUrl}`);
                console.log(`Final ID: ${extractedId}\n`);
            }

            // Fetch full job details using bestscrapers details scraper
            let jobDetails: LinkedInJobDetails | null = null;
            try {
                jobDetails = this.detailsScraper.fetchJobDetails
                    ? await this.detailsScraper.fetchJobDetails(jobUrl, { apifyToken })
                    : null;
            } catch (error: any) {
                console.log(`  [${index + 1}/${dataset.length}] ⚠ Error fetching details: ${error.message}`);
            }

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
                jobDetails?.posted_at || jobDetails?.posted_date || jobDetails?.date_posted || (jobDetails as any)?.postedAt;

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
                        }
                    } else if (typeof postDateValue === 'number') {
                        jobPostDate = new Date(postDateValue);
                    }
                } catch (error) {
                    // Silently ignore date parsing errors
                }
            }

            // Log if description is still missing (reduced verbosity for parallel processing)
            if (!jobDescriptionText || jobDescriptionText.length < 50) {
                console.log(`  [${index + 1}/${dataset.length}] ⚠ No description for: ${finalJobTitle} at ${finalCompanyName}`);
            }

            return {
                jobId: finalJobId,
                jobTitle: finalJobTitle,
                companyName: finalCompanyName,
                jobUrl: finalJobUrl,
                jobDescriptionText: jobDescriptionText,
                jobPostDate: jobPostDate,
                structuredData: structuredData || undefined
            };
        };

        // Process jobs in parallel batches
        const totalBatches = Math.ceil(dataset.length / CONCURRENT_LIMIT);
        console.log(`→ Processing ${dataset.length} jobs in ${totalBatches} parallel batches (${CONCURRENT_LIMIT} concurrent)`);

        for (let batchIndex = 0; batchIndex < dataset.length; batchIndex += CONCURRENT_LIMIT) {
            const batch = dataset.slice(batchIndex, batchIndex + CONCURRENT_LIMIT);
            const batchNumber = Math.floor(batchIndex / CONCURRENT_LIMIT) + 1;

            console.log(`\n→ Batch ${batchNumber}/${totalBatches}: Fetching ${batch.length} jobs in parallel...`);
            const startTime = Date.now();

            // Process all jobs in this batch concurrently
            const batchPromises = batch.map((item, i) =>
                processJobItem(item, batchIndex + i)
            );

            const batchResults = await Promise.all(batchPromises);

            // Filter out null results and add to results array
            const validResults = batchResults.filter((r): r is RawJobData => r !== null);
            results.push(...validResults);

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✓ Batch ${batchNumber}/${totalBatches} complete: ${validResults.length}/${batch.length} jobs fetched (${elapsed}s)`);
        }

        console.log(`\n✓ Fetched descriptions for ${results.length} jobs (parallel processing complete)\n`);
        return results;
    }
}

