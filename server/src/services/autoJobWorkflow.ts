// server/src/services/autoJobWorkflow.ts
import JobApplication from '../models/JobApplication';
import Profile from '../models/Profile';
import User from '../models/User';
import WorkflowRun from '../models/WorkflowRun';
import { retrieveJobs, extractJobId, JobSearchOptions } from './jobAcquisitionService';
import { analyzeJobCompanyAndRelevance } from './jobAnalysisService';
import { getOrStructureResume } from './resumeCacheService';
import { waitForRateLimit } from '../utils/rateLimiter';
import { decrypt } from '../utils/encryption';
import { convertJsonResumeToText } from '../utils/cvTextExtractor';
import mongoose from 'mongoose';

/**
 * Interface for workflow execution statistics
 */
export interface WorkflowStats {
    jobsFound: number;
    newJobs: number;
    duplicates: number;
    analyzed: number;
    relevant: number;
    notRelevant: number;
    errors: number;
}

/**
 * Get user's base resume text
 * Fetches from User's cvJson (Master CV) and converts to text
 */
const getUserResumeText = async (userId: string): Promise<string> => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        if (!user.cvJson) {
            throw new Error('User has not uploaded a Master CV. Please upload your CV in the CV Management section before using Auto Jobs.');
        }

        // Convert JSON Resume to text format
        const resumeText = convertJsonResumeToText(user.cvJson as any);
        return resumeText;
    } catch (error: any) {
        console.error(`Error retrieving resume for user ${userId}:`, error.message);
        throw error;
    }
};

/**
 * Main automated job workflow
 * Creates a WorkflowRun entry and returns runId immediately
 * Executes workflow asynchronously with progress tracking
 */
export const runAutoJobWorkflow = async (userId: string, isManual: boolean = false): Promise<string> => {
    // Create WorkflowRun entry
    const workflowRun = new WorkflowRun({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'running',
        isManual,
        progress: {
            currentStep: 'Initializing...',
            currentStepIndex: 0,
            totalSteps: 6,
            percentage: 0
        },
        steps: [
            { name: 'Initialize', status: 'running' },
            { name: 'Retrieve Jobs', status: 'pending' },
            { name: 'Deduplicate', status: 'pending' },
            { name: 'Structure Resume', status: 'pending' },
            { name: 'Process Jobs', status: 'pending' },
            { name: 'Complete', status: 'pending' }
        ],
        stats: {
            jobsFound: 0,
            newJobs: 0,
            duplicates: 0,
            analyzed: 0,
            relevant: 0,
            notRelevant: 0,
            errors: 0
        }
    });

    await workflowRun.save();
    const runId = (workflowRun as any)._id.toString();

    console.log(`\n========================================`);
    console.log(`Starting Auto Job Workflow for user: ${userId} (Manual: ${isManual})`);
    console.log(`Run ID: ${runId}`);
    console.log(`========================================\n`);

    // Execute workflow asynchronously (don't await)
    executeWorkflow(runId, userId, isManual).catch(error => {
        console.error(`Workflow ${runId} failed:`, error);
    });

    // Return runId immediately
    return runId;
};

/**
 * Process a single job with merged analysis
 */
async function processSingleJob(
    job: any,
    index: number,
    total: number,
    userId: string,
    runId: string,
    structuredResume: any,
    stats: WorkflowStats,
    checkCancellation: () => Promise<boolean>,
    updateProgress: (stepName: string, status: 'running' | 'completed' | 'failed', stepIndex: number, message?: string) => Promise<void>
): Promise<void> {
    const progressMsg = `Processing job ${index + 1}/${total}: ${job.jobTitle}`;
    console.log(`[${index + 1}/${total}] Processing: ${job.jobTitle} at ${job.companyName}`);

    // Update step progress
    await WorkflowRun.findByIdAndUpdate(runId, {
        'progress.currentStep': progressMsg,
        'progress.percentage': Math.round(66 + ((index / total) * 33)), // Map job processing to 66-99% range
        'steps.4.count': index + 1,
        'steps.4.total': total,
        'steps.4.message': progressMsg
    });

    try {
        // Create JobApplication entry (unified model)
        const jobApplication = new JobApplication({
            userId: new mongoose.Types.ObjectId(userId),
            workflowRunId: new mongoose.Types.ObjectId(runId),
            jobId: job.jobId,
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            jobUrl: job.jobUrl,
            jobDescriptionText: job.jobDescriptionText,
            jobPostDate: job.jobPostDate, // Store post date from crawler
            status: 'Not Applied', // Default status for auto jobs
            isAutoJob: true,
            showInDashboard: false, // Auto jobs hidden from dashboard by default
            processingStatus: 'pending',
            discoveredAt: new Date()
        });
        await jobApplication.save();
        
        // Update stats immediately after creating job
        await WorkflowRun.findByIdAndUpdate(runId, { stats });

        // Skip if no description
        if (!job.jobDescriptionText || job.jobDescriptionText.length < 50) {
            console.log(`  ✗ Skipping: Job description empty or too short`);
            jobApplication.processingStatus = 'error';
            jobApplication.errorMessage = 'Job description missing from source';
            await jobApplication.save();
            stats.errors++;
            return;
        }

        // Check for cancellation before AI calls
        if (await checkCancellation()) {
            console.log(`  ⚠ Workflow cancelled. Stopping processing.`);
            return;
        }

        // Wait for rate limiter before making AI call
        await waitForRateLimit();

        // Use merged analysis function (combines job extraction, company insights, and relevance)
        const structuredData = job.structuredData;
        if (structuredData) {
            console.log(`  → Using structured data from scraper (reducing AI calls)`);
        }
        
        let analysis;
        try {
            analysis = await analyzeJobCompanyAndRelevance(
                job.jobDescriptionText,
                job.companyName,
                structuredResume,
                userId,
                structuredData,
                50 // Threshold: >=50% match is considered relevant
            );
        } catch (analysisError: any) {
            // Store error in recommendation
            const errorMsg = analysisError.message || 'Failed to analyze job match';
            jobApplication.recommendation = {
                score: null,
                shouldApply: false,
                reason: errorMsg,
                cachedAt: new Date(),
                error: errorMsg
            };
            jobApplication.processingStatus = 'error';
            jobApplication.errorMessage = errorMsg;
            await jobApplication.save();
            stats.errors++;
            await WorkflowRun.findByIdAndUpdate(runId, { stats });
            console.error(`  ✗ Analysis failed for job ${job.jobId}: ${errorMsg}`);
            return;
        }

        // Update job application with extracted data and company insights
        jobApplication.extractedData = analysis.job.extractedData;
        jobApplication.companyInsights = analysis.company;
        jobApplication.processingStatus = 'analyzed';
        jobApplication.processedAt = new Date();

        // Build recommendation object from relevance analysis
        // Check if the reason indicates an error (from fallback error handling)
        const reasonIndicatesError = analysis.relevance.reason?.includes('failed:') || 
                                   analysis.relevance.reason?.includes('Analysis completed but relevance check failed');
        const recommendation = {
            score: analysis.relevance.score ?? null,
            shouldApply: analysis.relevance.isRelevant,
            reason: analysis.relevance.reason,
            cachedAt: new Date(),
            ...(reasonIndicatesError && { error: analysis.relevance.reason })
        };

        jobApplication.recommendation = recommendation;

        if (!analysis.relevance.isRelevant) {
            jobApplication.processingStatus = 'not_relevant';
            await jobApplication.save();
            stats.analyzed++;
            stats.notRelevant++;
            
            // Update stats immediately after relevance check
            await WorkflowRun.findByIdAndUpdate(runId, { stats });
            
            console.log(`  ✗ Not relevant: ${analysis.relevance.reason}`);
            return;
        }

        jobApplication.processingStatus = 'relevant';
        await jobApplication.save();
        stats.analyzed++;
        stats.relevant++;
        
        // Update stats immediately after relevance check
        await WorkflowRun.findByIdAndUpdate(runId, { stats });
        
        console.log(`  ✓ Relevant: ${analysis.relevance.reason} (${analysis.relevance.score ?? 'N/A'}% match)`);

    } catch (error: any) {
        console.error(`  Error processing job ${job.jobId}:`, error.message);
        stats.errors++;
        
        // Update stats immediately after error
        await WorkflowRun.findByIdAndUpdate(runId, { stats });
    }
}

/**
 * Process jobs in parallel with concurrency control
 */
async function processJobsInParallel(
    jobs: any[],
    userId: string,
    runId: string,
    structuredResume: any,
    stats: WorkflowStats,
    checkCancellation: () => Promise<boolean>,
    updateProgress: (stepName: string, status: 'running' | 'completed' | 'failed', stepIndex: number, message?: string) => Promise<void>
): Promise<void> {
    const CONCURRENCY_LIMIT = 4; // Process 4 jobs at a time
    
    for (let i = 0; i < jobs.length; i += CONCURRENCY_LIMIT) {
        // Check for cancellation before processing batch
        if (await checkCancellation()) {
            console.log(`\n⚠ Workflow cancelled by user. Stopping at job ${i + 1}/${jobs.length}`);
            await WorkflowRun.findByIdAndUpdate(runId, {
                status: 'cancelled',
                'progress.currentStep': `Cancelled at job ${i + 1}/${jobs.length}`,
                completedAt: new Date()
            });
            return;
        }

        // Get batch of jobs to process
        const batch = jobs.slice(i, i + CONCURRENCY_LIMIT);
        
        // Process batch in parallel
        const results = await Promise.allSettled(
            batch.map((job, batchIndex) => 
                processSingleJob(
                    job,
                    i + batchIndex,
                    jobs.length,
                    userId,
                    runId,
                    structuredResume,
                    stats,
                    checkCancellation,
                    updateProgress
                )
            )
        );

        // Log any failures in the batch
        results.forEach((result, batchIndex) => {
            if (result.status === 'rejected') {
                console.error(`  Error in batch job ${i + batchIndex + 1}:`, result.reason);
            }
        });
    }
}

/**
 * Execute workflow asynchronously with progress tracking
 * This function contains the actual workflow logic
 */
async function executeWorkflow(runId: string, userId: string, isManual: boolean): Promise<void> {
    const stats: WorkflowStats = {
        jobsFound: 0,
        newJobs: 0,
        duplicates: 0,
        analyzed: 0,
        relevant: 0,
        notRelevant: 0,
        errors: 0
    };

    try {
        // Helper to check if workflow has been cancelled
        const checkCancellation = async (): Promise<boolean> => {
            const run = await WorkflowRun.findById(runId);
            return run?.status === 'cancelled';
        };

        // Helper to update progress
        const updateProgress = async (stepName: string, status: 'running' | 'completed' | 'failed', stepIndex: number, message?: string) => {
            // Check if cancelled before updating
            if (await checkCancellation()) {
                throw new Error('Workflow cancelled by user');
            }

            await WorkflowRun.findByIdAndUpdate(runId, {
                'progress.currentStep': message || stepName,
                'progress.currentStepIndex': stepIndex,
                'progress.percentage': Math.round((stepIndex / 6) * 100),
                [`steps.${stepIndex}.status`]: status,
                [`steps.${stepIndex}.${status === 'running' ? 'startedAt' : 'completedAt'}`]: new Date()
            });
        };

        // Step 1: Initialize - Retrieve user profile and settings
        await updateProgress('Initialize', 'running', 0, 'Retrieving profile and settings...');

        let profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });

        if (!profile) {
            console.log('Profile not found in workflow, creating default...');
            // Create default profile if it doesn't exist
            profile = new Profile({
                userId: new mongoose.Types.ObjectId(userId),
                autoJobSettings: {
                    keywords: '',
                    location: ''
                }
            });
            await profile.save();
        }

        // AI provider will be retrieved by aiService when needed

        const apifyTokenEncrypted = profile.integrations?.apify?.accessToken;
        const apifyToken = apifyTokenEncrypted ? (decrypt(apifyTokenEncrypted) ?? undefined) : undefined;

        // Get auto-job settings
        const autoJobSettings = (profile as any).autoJobSettings;

        const keywords = autoJobSettings.keywords || '';
        const location = autoJobSettings.location || '';
        
        // Require keywords or location
        if (!keywords && !location) {
            throw new Error('Keywords or location must be configured');
        }

        if (!apifyToken) {
            throw new Error('Apify API token is not configured');
        }

        const maxJobs = autoJobSettings.maxJobs || 100;
        await updateProgress('Initialize', 'completed', 0, 'Settings loaded');

        // Check for cancellation before retrieving jobs
        if (await checkCancellation()) {
            console.log('Workflow cancelled before retrieving jobs');
            return;
        }

        // Step 2: Retrieve Jobs
        const searchDescription = location && keywords 
            ? `keywords: "${keywords}", location: "${location}"`
            : keywords 
                ? `keywords: "${keywords}"`
                : `location: "${location}"`;
        await updateProgress('Retrieve Jobs', 'running', 1, `Retrieving jobs - ${searchDescription}`);
        console.log(`→ Retrieving jobs - ${searchDescription}`);
        console.log(`→ Requesting ${maxJobs} jobs`);

        // Build job search options
        // Map invalid "past hour" to valid "past 24 hours"
        let datePosted = autoJobSettings.datePosted || 'any time';
        if (datePosted === 'past hour') {
            datePosted = 'past 24 hours';
        }
        
        const jobSearchOptions = {
            keywords: keywords || undefined,
            location: location || undefined,
            jobType: autoJobSettings.jobType && autoJobSettings.jobType.length > 0 ? autoJobSettings.jobType : undefined,
            experienceLevel: autoJobSettings.experienceLevel && autoJobSettings.experienceLevel.length > 0 ? autoJobSettings.experienceLevel : undefined,
            datePosted: datePosted,
            maxJobs: maxJobs,
            avoidDuplicates: autoJobSettings.avoidDuplicates || false
        };

        const rawJobs = await retrieveJobs(apifyToken, jobSearchOptions);
        stats.jobsFound = rawJobs.length;
        console.log(`✓ Found ${stats.jobsFound} jobs`);
        await updateProgress('Retrieve Jobs', 'completed', 1, `Found ${stats.jobsFound} jobs`);

        if (rawJobs.length === 0) {
            console.log('No jobs found, workflow complete');
            await updateProgress('Complete', 'completed', 5, 'No jobs found');
            await WorkflowRun.findByIdAndUpdate(runId, { status: 'completed', stats });
            return;
        }

        // Step 3: Deduplicate
        await updateProgress('Deduplicate', 'running', 2, 'Checking for duplicates...');
        console.log(`\n→ Checking for duplicates...`);

        const newJobs = [];
        for (const job of rawJobs) {
            // Check if job already exists (including soft-deleted ones, to prevent re-fetching)
            const exists = await JobApplication.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                jobId: job.jobId
            });

            if (exists) {
                stats.duplicates++;
            } else {
                newJobs.push(job);
            }
        }
        stats.newJobs = newJobs.length;
        console.log(`✓ ${stats.newJobs} new jobs, ${stats.duplicates} duplicates`);
        await updateProgress('Deduplicate', 'completed', 2, `${stats.newJobs} new jobs, ${stats.duplicates} duplicates`);

        if (newJobs.length === 0) {
            console.log('No new jobs to process, workflow complete');
            await updateProgress('Complete', 'completed', 5, 'No new jobs to process');
            await WorkflowRun.findByIdAndUpdate(runId, { status: 'completed', stats });
            return;
        }

        // Check for cancellation before structuring resume
        if (await checkCancellation()) {
            console.log('Workflow cancelled before structuring resume');
            return;
        }

        // Step 4: Structure Resume
        await updateProgress('Structure Resume', 'running', 3, 'Structuring resume...');
        console.log(`\n→ Retrieving and structuring resume...`);

        const resumeText = await getUserResumeText(userId);
        const structuredResume = await getOrStructureResume(userId, resumeText);
        console.log(`✓ Resume structured`);
        await updateProgress('Structure Resume', 'completed', 3, 'Resume structured');

        // Step 5: Process Jobs
        await updateProgress('Process Jobs', 'running', 4, `Processing ${newJobs.length} jobs...`);
        console.log(`\n→ Processing ${newJobs.length} jobs in parallel (concurrency: 4)...`);
        console.log(`  (Using rate limiter to respect API limits)\n`);

        // Process jobs in parallel with concurrency control
        await processJobsInParallel(newJobs, userId, runId, structuredResume, stats, checkCancellation, updateProgress);

        await updateProgress('Process Jobs', 'completed', 4, `Processed ${newJobs.length} jobs`);

        // Step 6: Complete
        console.log(`\n========================================`);
        console.log(`Workflow Complete`);
        console.log(`========================================`);

        await updateProgress('Complete', 'completed', 5, 'Workflow completed successfully');
        await WorkflowRun.findByIdAndUpdate(runId, {
            status: 'completed',
            stats,
            completedAt: new Date()
        });

    } catch (error: any) {
        // Check if error is due to cancellation
        if (error.message === 'Workflow cancelled by user') {
            console.log('Workflow cancelled successfully');
            await WorkflowRun.findByIdAndUpdate(runId, {
                status: 'cancelled',
                'progress.currentStep': 'Cancelled by user',
                completedAt: new Date()
            });
        } else {
            console.error('Workflow execution failed:', error);
            await WorkflowRun.findByIdAndUpdate(runId, {
                status: 'failed',
                errorMessage: error.message,
                completedAt: new Date()
            });
        }
    }
}
