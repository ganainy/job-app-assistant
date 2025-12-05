// server/src/services/scraperService.ts
import { IScraper, IJobListScraper } from '../interfaces/scraper.interface';
import { AIScraper } from './scrapers/AIScraper';
import { ApifyJobDetailsScraper } from './scrapers/ApifyJobDetailsScraper';
import { ApifyJobListScraper } from './scrapers/ApifyJobListScraper';

/**
 * Scraper service that manages scraper instances and provides factory methods
 * Allows easy swapping of scraper implementations via configuration
 */
export class ScraperService {
    private static jobDescriptionScraper: IScraper | null = null;
    private static jobListScraper: IJobListScraper | null = null;

    /**
     * Get the scraper for job description extraction
     * Defaults to AIScraper (uses user's configured AI provider), but can be configured via SCRAPER_TYPE env variable
     */
    static getJobDescriptionScraper(): IScraper {
        if (!this.jobDescriptionScraper) {
            const scraperType = process.env.SCRAPER_TYPE || 'ai';
            
            switch (scraperType.toLowerCase()) {
                case 'ai':
                case 'gemini': // Keep 'gemini' as alias for backward compatibility
                    this.jobDescriptionScraper = new AIScraper();
                    break;
                case 'apify':
                    this.jobDescriptionScraper = new ApifyJobDetailsScraper();
                    break;
                default:
                    console.warn(`Unknown scraper type: ${scraperType}, defaulting to AI`);
                    this.jobDescriptionScraper = new AIScraper();
            }
        }
        
        return this.jobDescriptionScraper;
    }

    /**
     * Get the scraper for job list retrieval
     * Defaults to ApifyJobListScraper, but can be configured via JOB_LIST_SCRAPER_TYPE env variable
     */
    static getJobListScraper(): IJobListScraper {
        if (!this.jobListScraper) {
            const scraperType = process.env.JOB_LIST_SCRAPER_TYPE || 'apify';
            
            switch (scraperType.toLowerCase()) {
                case 'apify':
                    this.jobListScraper = new ApifyJobListScraper();
                    break;
                default:
                    console.warn(`Unknown job list scraper type: ${scraperType}, defaulting to Apify`);
                    this.jobListScraper = new ApifyJobListScraper();
            }
        }
        
        return this.jobListScraper;
    }

    /**
     * Reset scraper instances (useful for testing or reconfiguration)
     */
    static reset(): void {
        this.jobDescriptionScraper = null;
        this.jobListScraper = null;
    }
}

