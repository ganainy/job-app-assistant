// server/src/services/autoJobWorkflow.ts
import AutoJob, { IAutoJob } from '../models/AutoJob';
import Profile from '../models/Profile';
import User from '../models/User';
import WorkflowRun from '../models/WorkflowRun';
import { retrieveJobs, extractJobId } from './jobAcquisitionService';
import { analyzeJobAndCompany } from './jobAnalysisService';
import { getOrStructureResume } from './resumeCacheService';
import { checkRelevance } from './jobRelevanceService';
import { generateCustomizedResume, generateCoverLetterWithSkillMatch } from './generatorService';
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
    generated: number;
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
            generated: 0,
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
        generated: 0,
        errors: 0
    };

    try {
        // Helper to update progress
        const updateProgress = async (stepName: string, status: 'running' | 'completed' | 'failed', stepIndex: number, message?: string) => {
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
                    enabled: false,
                    linkedInSearchUrl: '',
                    schedule: '0 9 * * *'
                }
            });
            await profile.save();
        }

        const geminiApiKeyEncrypted = profile.integrations?.gemini?.accessToken || process.env.GEMINI_API_KEY;
        const geminiApiKey = geminiApiKeyEncrypted && geminiApiKeyEncrypted !== process.env.GEMINI_API_KEY
            ? decrypt(geminiApiKeyEncrypted)
            : geminiApiKeyEncrypted;

        if (!geminiApiKey) {
            throw new Error('Gemini API key not configured');
        }

        const apifyTokenEncrypted = profile.integrations?.apify?.accessToken;
        const apifyToken = apifyTokenEncrypted ? (decrypt(apifyTokenEncrypted) ?? undefined) : undefined;

        // Get auto-job settings
        const autoJobSettings = (profile as any).autoJobSettings;

        // If not manual, check if enabled
        if (!isManual && !autoJobSettings?.enabled) {
            console.log('Auto-job workflow is disabled for this user');
            await updateProgress('Initialize', 'completed', 0, 'Workflow disabled');
            await WorkflowRun.findByIdAndUpdate(runId, { status: 'completed', stats });
            return;
        }

        const linkedInSearchUrl = autoJobSettings.linkedInSearchUrl;
        if (!linkedInSearchUrl) {
            throw new Error('LinkedIn search URL not configured');
        }

        const maxJobs = autoJobSettings.maxJobs || 50;
        await updateProgress('Initialize', 'completed', 0, 'Settings loaded');

        // Step 2: Retrieve Jobs
        await updateProgress('Retrieve Jobs', 'running', 1, `Retrieving jobs from: ${linkedInSearchUrl}`);
        console.log(`→ Retrieving jobs from: ${linkedInSearchUrl}`);
        console.log(`→ Requesting ${maxJobs} jobs`);

        const rawJobs = await retrieveJobs(linkedInSearchUrl, apifyToken, maxJobs);
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
            const exists = await AutoJob.findOne({
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

        // Step 4: Structure Resume
        await updateProgress('Structure Resume', 'running', 3, 'Structuring resume...');
        console.log(`\n→ Retrieving and structuring resume...`);

        const resumeText = await getUserResumeText(userId);
        const structuredResume = await getOrStructureResume(userId, resumeText, geminiApiKey);
        console.log(`✓ Resume structured`);
        await updateProgress('Structure Resume', 'completed', 3, 'Resume structured');

        // Step 5: Process Jobs
        await updateProgress('Process Jobs', 'running', 4, `Processing ${newJobs.length} jobs...`);
        console.log(`\n→ Processing ${newJobs.length} jobs sequentially...`);
        console.log(`  (Adding delay to respect Gemini API rate limits)\n`);

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < newJobs.length; i++) {
            const job = newJobs[i];
            const progressMsg = `Processing job ${i + 1}/${newJobs.length}: ${job.jobTitle}`;
            console.log(`[${i + 1}/${newJobs.length}] Processing: ${job.jobTitle} at ${job.companyName}`);

            // Update step progress
            await WorkflowRun.findByIdAndUpdate(runId, {
                'progress.currentStep': progressMsg,
                'progress.percentage': Math.round(66 + ((i / newJobs.length) * 33)), // Map job processing to 66-99% range
                'steps.4.count': i + 1,
                'steps.4.total': newJobs.length,
                'steps.4.message': progressMsg
            });

            try {
                // Create AutoJob entry
                const autoJob = new AutoJob({
                    userId: new mongoose.Types.ObjectId(userId),
                    jobId: job.jobId,
                    jobTitle: job.jobTitle,
                    companyName: job.companyName,
                    jobUrl: job.jobUrl,
                    jobDescriptionText: job.jobDescriptionText,
                    processingStatus: 'pending',
                    discoveredAt: new Date()
                });
                await autoJob.save();

                // Skip if no description
                if (!job.jobDescriptionText || job.jobDescriptionText.length < 50) {
                    console.log(`  ✗ Skipping: Job description empty or too short`);
                    autoJob.processingStatus = 'error';
                    autoJob.errorMessage = 'Job description missing from source';
                    await autoJob.save();
                    stats.errors++;
                    continue;
                }

                // Rate limiting delay (10 seconds)
                await delay(10000);

                // Analyze job and company
                const analysis = await analyzeJobAndCompany(
                    job.jobDescriptionText,
                    job.companyName,
                    geminiApiKey
                );

                autoJob.extractedData = analysis.job.extractedData;
                autoJob.companyInsights = analysis.company;
                autoJob.processingStatus = 'analyzed';
                autoJob.processedAt = new Date();
                await autoJob.save();
                stats.analyzed++;

                // Rate limiting delay (10 seconds)
                await delay(10000);

                // Check relevance
                const relevanceCheck = await checkRelevance(
                    structuredResume,
                    job.jobDescriptionText,
                    geminiApiKey
                );

                autoJob.isRelevant = relevanceCheck.isRelevant;
                autoJob.relevanceReason = relevanceCheck.reason;

                if (!relevanceCheck.isRelevant) {
                    autoJob.processingStatus = 'not_relevant';
                    await autoJob.save();
                    stats.notRelevant++;
                    console.log(`  ✗ Not relevant: ${relevanceCheck.reason}`);
                    continue;
                }

                autoJob.processingStatus = 'relevant';
                await autoJob.save();
                stats.relevant++;
                console.log(`  ✓ Relevant: ${relevanceCheck.reason}`);

                // Rate limiting delay (10 seconds)
                await delay(10000);

                // Generate content
                const customizedResume = await generateCustomizedResume(
                    resumeText,
                    structuredResume,
                    job.jobDescriptionText,
                    geminiApiKey
                );

                const coverLetterResult = await generateCoverLetterWithSkillMatch(
                    structuredResume,
                    analysis.company,
                    {
                        jobTitle: job.jobTitle,
                        companyName: job.companyName,
                        jobDescription: job.jobDescriptionText,
                        extractedData: analysis.job.extractedData
                    },
                    geminiApiKey
                );

                autoJob.customizedResumeHtml = customizedResume;
                autoJob.coverLetterText = coverLetterResult.coverLetter;
                autoJob.skillMatchScore = coverLetterResult.skillMatchScore;
                autoJob.skillMatchReason = coverLetterResult.skillMatchReason;
                autoJob.processingStatus = 'generated';
                await autoJob.save();
                stats.generated++;
                console.log(`  ✓ Generated resume and cover letter`);
                console.log(`  Skill Match: ${coverLetterResult.skillMatchScore}/5 stars`);

            } catch (error: any) {
                console.error(`  Error processing job ${job.jobId}:`, error.message);
                stats.errors++;
            }
        }

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
        console.error('Workflow execution failed:', error);
        await WorkflowRun.findByIdAndUpdate(runId, {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date()
        });
    }
}
