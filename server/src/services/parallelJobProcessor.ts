// server/src/services/parallelJobProcessor.ts
import mongoose from 'mongoose';
import JobApplication from '../models/JobApplication';
import Profile from '../models/Profile';
import { analyzeJobAndCompanyWithProvider } from './jobAnalysisService';
import { checkRelevanceWithProvider } from './jobRelevanceService';
import { generateCoverLetterWithProvider } from './generatorService';
import { processBatchWithErrors, calculateBatchDelay } from '../utils/batchProcessor';
import { getRateLimitDelay } from './providerService';
import { ProviderRegistry } from '../domain/providers/ProviderRegistry';
import { getProvider } from '../domain/providers/AIProvider';

/**
 * Process a single job with provider-aware AI operations
 * @param job - Raw job data
 * @param userId - User ID
 * @param runId - Workflow run ID
 * @param profile - User profile
 * @param structuredResume - Structured resume data
 * @param provider - AI provider to use
 * @param models - Model configuration for each task type
 * @returns Processed job application
 */
async function processSingleJob(
    job: any,
    userId: string,
    runId: string,
    profile: any,
    structuredResume: any,
    provider: string | undefined,
    models: { analysis?: string; relevance?: string; generation?: string }
): Promise<{ success: boolean; stats: any; jobApplication?: any; error?: Error }> {
    const stats = {
        analyzed: 0,
        relevant: 0,
        notRelevant: 0,
        generated: 0,
        errors: 0
    };

    try {
        // Create JobApplication entry
        const jobApplication = new JobApplication({
            userId: new mongoose.Types.ObjectId(userId),
            workflowRunId: new mongoose.Types.ObjectId(runId),
            jobId: job.jobId,
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            jobUrl: job.jobUrl,
            jobDescriptionText: job.jobDescriptionText,
            status: 'Not Applied',
            isAutoJob: true,
            showInDashboard: false,
            processingStatus: 'pending',
            discoveredAt: new Date()
        });
        await jobApplication.save();

        // Skip if no description
        if (!job.jobDescriptionText || job.jobDescriptionText.length < 50) {
            console.log(`  ✗ Skipping: Job description empty or too short`);
            jobApplication.processingStatus = 'error';
            jobApplication.errorMessage = 'Job description missing from source';
            await jobApplication.save();
            stats.errors++;
            return { success: false, stats, error: new Error('No description') };
        }

        // Step 1: Analyze job and company
        const analysisModel = models.analysis || 'gemini-1.5-flash';
        const analysis = await analyzeJobAndCompanyWithProvider(
            job.jobDescriptionText,
            job.companyName,
            profile,
            provider,
            analysisModel,
            job.structuredData
        );

        jobApplication.extractedData = analysis.job.extractedData;
        jobApplication.companyInsights = analysis.company;
        jobApplication.processingStatus = 'analyzed';
        jobApplication.processedAt = new Date();
        await jobApplication.save();
        stats.analyzed++;

        // Step 2: Check relevance
        const relevanceModel = models.relevance || 'gemini-1.5-flash';
        const relevanceCheck = await checkRelevanceWithProvider(
            structuredResume,
            job.jobDescriptionText,
            userId,
            profile,
            provider,
            relevanceModel,
            50 // Threshold: >=50% match is considered relevant
        );

        // Build recommendation object
        const recommendation = {
            score: relevanceCheck.score ?? null,
            shouldApply: relevanceCheck.isRelevant,
            reason: relevanceCheck.reason,
            cachedAt: new Date()
        };

        jobApplication.recommendation = recommendation;

        if (!relevanceCheck.isRelevant) {
            jobApplication.processingStatus = 'not_relevant';
            await jobApplication.save();
            stats.notRelevant++;
            console.log(`  ✗ Not relevant: ${relevanceCheck.reason}`);
            return { success: true, stats, jobApplication };
        }

        jobApplication.processingStatus = 'relevant';
        await jobApplication.save();
        stats.relevant++;
        console.log(`  ✓ Relevant: ${relevanceCheck.reason} (${relevanceCheck.score ?? 'N/A'}% match)`);

        // Step 3: Generate cover letter
        const generationModel = models.generation || 'gemini-1.5-pro';
        const coverLetterResult = await generateCoverLetterWithProvider(
            structuredResume,
            analysis.company,
            {
                jobTitle: job.jobTitle,
                companyName: job.companyName,
                jobDescription: job.jobDescriptionText,
                extractedData: analysis.job.extractedData
            },
            profile,
            provider,
            generationModel
        );

        // TODO: Add coverLetter field to JobApplication model
        // jobApplication.coverLetter = coverLetterResult.coverLetter;
        jobApplication.processingStatus = 'generated';
        await jobApplication.save();
        stats.generated++;
        console.log(`  ✓ Generated cover letter`);

        return { success: true, stats, jobApplication };

    } catch (error: any) {
        console.error(`  ✗ Error processing job:`, error.message);
        stats.errors++;
        return { success: false, stats, error };
    }
}

/**
 * Process jobs in parallel batches with provider-aware AI operations
 * @param jobs - Array of raw job data
 * @param userId - User ID
 * @param runId - Workflow run ID
 * @param structuredResume - Structured resume data
 * @param batchSize - Number of jobs to process concurrently
 * @param provider - AI provider to use
 * @param models - Model configuration for each task type
 * @returns Aggregated statistics
 */
export async function processJobsInParallel(
    jobs: any[],
    userId: string,
    runId: string,
    structuredResume: any,
    batchSize: number = 5,
    provider: string | undefined = 'gemini',
    models: { analysis?: string; relevance?: string; generation?: string } = {}
): Promise<{
    analyzed: number;
    relevant: number;
    notRelevant: number;
    generated: number;
    errors: number;
}> {
    // Get user profile for API keys
    const profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!profile) {
        throw new Error('User profile not found');
    }

    // Calculate rate limit delay
    const selectedProvider = getProvider(provider);
    const strategy = ProviderRegistry.get(selectedProvider);
    const rateLimitDelay = strategy ? strategy.getRateLimitDelay() : 4500;

    console.log(`\n→ Processing ${jobs.length} jobs in parallel (batch size: ${batchSize})`);
    console.log(`  Provider: ${selectedProvider}`);
    console.log(`  Models: Analysis=${models.analysis || 'gemini-1.5-flash'}, Relevance=${models.relevance || 'gemini-1.5-flash'}, Generation=${models.generation || 'gemini-1.5-pro'}`);
    console.log(`  Rate limit delay: ${rateLimitDelay}ms between batches\n`);

    // Aggregate stats
    const totalStats = {
        analyzed: 0,
        relevant: 0,
        notRelevant: 0,
        generated: 0,
        errors: 0
    };

    // Process jobs in batches
    const { results, errors } = await processBatchWithErrors(
        jobs,
        batchSize,
        async (job, index) => {
            console.log(`[${index + 1}/${jobs.length}] Processing: ${job.jobTitle} at ${job.companyName}`);

            const result = await processSingleJob(
                job,
                userId,
                runId,
                profile,
                structuredResume,
                provider,
                models
            );

            // Aggregate stats
            totalStats.analyzed += result.stats.analyzed;
            totalStats.relevant += result.stats.relevant;
            totalStats.notRelevant += result.stats.notRelevant;
            totalStats.generated += result.stats.generated;
            totalStats.errors += result.stats.errors;

            return result;
        },
        rateLimitDelay
    );

    console.log(`\n✓ Parallel processing complete:`);
    console.log(`  Analyzed: ${totalStats.analyzed}`);
    console.log(`  Relevant: ${totalStats.relevant}`);
    console.log(`  Not Relevant: ${totalStats.notRelevant}`);
    console.log(`  Generated: ${totalStats.generated}`);
    console.log(`  Errors: ${totalStats.errors}`);

    return totalStats;
}
