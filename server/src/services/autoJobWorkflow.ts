// server/src/services/autoJobWorkflow.ts
import AutoJob, { IAutoJob } from '../models/AutoJob';
import Profile from '../models/Profile';
import { retrieveJobs, extractJobId } from './jobAcquisitionService';
import { analyzeJobAndCompany } from './jobAnalysisService';
import { getOrStructureResume } from './resumeCacheService';
import { checkRelevance } from './jobRelevanceService';
import { generateCustomizedResume, generateCoverLetterWithSkillMatch } from './generatorService';
import { decrypt } from '../utils/encryption';
import mongoose from 'mongoose';

/**
 * Workflow statistics returned after execution
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
 * This would typically come from their stored CV
 */
const getUserResumeText = async (userId: string): Promise<string> => {
    // TODO: Implement actual resume retrieval from CV management system
    // For now, returning placeholder
    // In real implementation, fetch from CvAnalysis model or similar
    return `This is a placeholder resume text for user ${userId}. 
    In production, this should be fetched from the user's stored CV.`;
};

/**
 * Main automated job workflow
 * Runs the complete pipeline for a single user
 */
export const runAutoJobWorkflow = async (userId: string, isManual: boolean = false): Promise<WorkflowStats> => {
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

    console.log(`\n========================================`);
    console.log(`Starting Auto Job Workflow for user: ${userId} (Manual: ${isManual})`);
    console.log(`========================================\n`);

    try {
        // 1. Retrieve user profile and settings
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
            return stats;
        }

        const linkedInSearchUrl = autoJobSettings.linkedInSearchUrl;
        if (!linkedInSearchUrl) {
            throw new Error('LinkedIn search URL not configured');
        }

        const maxJobs = autoJobSettings.maxJobs || 50;

        // 2. Retrieve jobs
        console.log(`→ Retrieving jobs from: ${linkedInSearchUrl}`);
        console.log(`→ Requesting ${maxJobs} jobs`);
        const rawJobs = await retrieveJobs(linkedInSearchUrl, apifyToken, maxJobs);
        stats.jobsFound = rawJobs.length;
        console.log(`✓ Found ${stats.jobsFound} jobs`);

        if (rawJobs.length === 0) {
            console.log('No jobs found, workflow complete');
            return stats;
        }

        // 3. Deduplicate
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

        if (newJobs.length === 0) {
            console.log('No new jobs to process, workflow complete');
            return stats;
        }

        // 4. Get/structure user resume once (for all jobs)
        console.log(`\n→ Retrieving and structuring resume...`);
        const resumeText = await getUserResumeText(userId);
        const structuredResume = await getOrStructureResume(userId, resumeText, geminiApiKey);
        console.log(`✓ Resume structured`);

        // 5. Process each job sequentially
        console.log(`\n→ Processing ${newJobs.length} jobs sequentially...`);
        console.log(`  (Adding delay to respect Gemini API rate limits)\n`);

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < newJobs.length; i++) {
            const job = newJobs[i];
            console.log(`[${i + 1}/${newJobs.length}] Processing: ${job.jobTitle} at ${job.companyName}`);

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

                // Generate customized content
                console.log(`  → Generating customized resume and cover letter...`);

                const customResume = await generateCustomizedResume(
                    resumeText,
                    structuredResume,
                    job.jobDescriptionText,
                    geminiApiKey
                );

                const { coverLetter, skillMatchScore } = await generateCoverLetterWithSkillMatch(
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

                autoJob.customizedResumeHtml = customResume;
                autoJob.coverLetterText = coverLetter;
                autoJob.skillMatchScore = skillMatchScore;
                autoJob.processingStatus = 'generated';
                await autoJob.save();
                stats.generated++;

                console.log(`  ✓ Generated (skill match: ${skillMatchScore}/5)`);

            } catch (error: any) {
                console.error(`  ✗ Error processing job: ${error.message}`);
                stats.errors++;

                // Update job with error status
                try {
                    await AutoJob.findOneAndUpdate(
                        { userId: new mongoose.Types.ObjectId(userId), jobId: job.jobId },
                        {
                            processingStatus: 'error',
                            errorMessage: error.message
                        }
                    );
                } catch (updateError) {
                    console.error(`  Failed to update error status:`, updateError);
                }
            }
        }

        console.log(`\n========================================`);
        console.log(`Workflow Complete`);
        console.log(`========================================`);
        console.log(`Jobs found: ${stats.jobsFound}`);
        console.log(`New jobs: ${stats.newJobs}`);
        console.log(`Analyzed: ${stats.analyzed}`);
        console.log(`Relevant: ${stats.relevant}`);
        console.log(`Not relevant: ${stats.notRelevant}`);
        console.log(`Generated: ${stats.generated}`);
        console.log(`Errors: ${stats.errors}`);
        console.log(`========================================\n`);

        return stats;

    } catch (error: any) {
        console.error(`\n✗ Workflow failed: ${error.message}\n`);
        throw error;
    }
};
