// server/src/controllers/autoJobController.ts
import { Request, Response } from 'express';
import AutoJob from '../models/AutoJob';
import JobApplication from '../models/JobApplication';
import Profile from '../models/Profile';
import WorkflowRun from '../models/WorkflowRun';
import { runAutoJobWorkflow } from '../services/autoJobWorkflow';
import mongoose from 'mongoose';

/**
 * Trigger the auto-job workflow manually
 * POST /api/auto-jobs/trigger
 */
export const triggerWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();

        // Check if user has workflow enabled
        let profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });

        if (!profile) {
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

        // Validate required settings
        const autoJobSettings = (profile as any).autoJobSettings;
        const linkedInSearchUrl = autoJobSettings?.linkedInSearchUrl;

        if (!linkedInSearchUrl) {
            return res.status(400).json({
                message: 'Please configure your LinkedIn Search URL in settings before running the workflow.'
            });
        }

        // Check for Gemini API key
        const geminiApiKey = profile.integrations?.gemini?.accessToken || process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return res.status(400).json({
                message: 'Please configure your Gemini API key in the Integrations settings page.'
            });
        }

        // Run workflow
        console.log(`Manual trigger: Running auto-job workflow for user ${userId}`);
        const runId = await runAutoJobWorkflow(userId, true);

        res.json({
            message: 'Workflow started successfully',
            runId
        });
    } catch (error: any) {
        console.error('Error triggering workflow:', error);

        // Return user-friendly error messages instead of generic 500
        const errorMessage = error.message || 'Failed to run workflow';
        const statusCode = error.message?.includes('not configured') ? 400 : 500;

        res.status(statusCode).json({
            message: errorMessage
        });
    }
};

/**
 * Get workflow run status
 * GET /api/auto-jobs/runs/:runId
 */
export const getWorkflowStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();
        const { runId } = req.params;

        const run = await WorkflowRun.findOne({
            _id: new mongoose.Types.ObjectId(runId),
            userId: new mongoose.Types.ObjectId(userId)
        });

        if (!run) {
            return res.status(404).json({ message: 'Workflow run not found' });
        }

        res.json(run);
    } catch (error: any) {
        console.error('Error fetching workflow status:', error);
        res.status(500).json({ message: 'Failed to fetch workflow status' });
    }
};

/**
 * Get all auto jobs for the user
 * GET /api/auto-jobs?page=1&limit=10&status=relevant&relevance=true
 */
export const getAutoJobs = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as string;
        const relevance = req.query.relevance as string;

        // Build query
        const query: any = { userId: new mongoose.Types.ObjectId(userId) };

        if (status) {
            query.processingStatus = status;
        }

        if (relevance === 'true') {
            query.isRelevant = true;
        } else if (relevance === 'false') {
            query.isRelevant = false;
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const [jobs, total] = await Promise.all([
            AutoJob.find(query)
                .sort({ discoveredAt: -1 })
                .skip(skip)
                .limit(limit),
            AutoJob.countDocuments(query)
        ]);

        res.json({
            jobs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching auto jobs:', error);
        res.status(500).json({
            message: 'Failed to fetch auto jobs',
            error: error.message
        });
    }
};

/**
 * Get single auto job by ID
 * GET /api/auto-jobs/:id
 */
export const getAutoJobById = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();
        const { id } = req.params;

        const job = await AutoJob.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId)
        });

        if (!job) {
            return res.status(404).json({ message: 'Auto job not found' });
        }

        res.json(job);
    } catch (error: any) {
        console.error('Error fetching auto job:', error);
        res.status(500).json({
            message: 'Failed to fetch auto job',
            error: error.message
        });
    }
};

/**
 * Promote auto job to regular job application
 * POST /api/auto-jobs/:id/promote
 */
export const promoteAutoJob = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();
        const { id } = req.params;

        // Find auto job
        const autoJob = await AutoJob.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId)
        });

        if (!autoJob) {
            return res.status(404).json({ message: 'Auto job not found' });
        }

        // Create JobApplication from AutoJob
        const jobApplication = new JobApplication({
            userId: new mongoose.Types.ObjectId(userId),
            jobTitle: autoJob.jobTitle,
            companyName: autoJob.companyName,
            jobUrl: autoJob.jobUrl,
            jobDescriptionText: autoJob.jobDescriptionText,
            status: 'Not Applied',
            language: 'en',
            draftCvJson: autoJob.customizedResumeHtml ? { html: autoJob.customizedResumeHtml } : undefined,
            draftCoverLetterText: autoJob.coverLetterText,
            generationStatus: autoJob.customizedResumeHtml || autoJob.coverLetterText ? 'draft_ready' : 'none',
            notes: `Auto-discovered job. Skill match: ${autoJob.skillMatchScore || 'N/A'}/5\n\nRelevance: ${autoJob.relevanceReason || 'N/A'}`
        });

        await jobApplication.save();

        // Optionally delete the auto job after promotion
        await AutoJob.findByIdAndDelete(id);

        res.json({
            message: 'Job promoted successfully',
            jobApplication
        });
    } catch (error: any) {
        console.error('Error promoting auto job:', error);
        res.status(500).json({
            message: 'Failed to promote job',
            error: error.message
        });
    }
};

/**
 * Delete auto job
 * DELETE /api/auto-jobs/:id
 */
export const deleteAutoJob = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();
        const { id } = req.params;

        const result = await AutoJob.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId)
        });

        if (!result) {
            return res.status(404).json({ message: 'Auto job not found' });
        }

        res.json({ message: 'Auto job deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting auto job:', error);
        res.status(500).json({
            message: 'Failed to delete auto job',
            error: error.message
        });
    }
};

/**
 * Get workflow statistics
 * GET /api/auto-jobs/stats
 */
export const getStats = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();

        const [
            total,
            pending,
            analyzed,
            relevant,
            notRelevant,
            generated,
            errors
        ] = await Promise.all([
            AutoJob.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
            AutoJob.countDocuments({ userId: new mongoose.Types.ObjectId(userId), processingStatus: 'pending' }),
            AutoJob.countDocuments({ userId: new mongoose.Types.ObjectId(userId), processingStatus: 'analyzed' }),
            AutoJob.countDocuments({ userId: new mongoose.Types.ObjectId(userId), isRelevant: true }),
            AutoJob.countDocuments({ userId: new mongoose.Types.ObjectId(userId), isRelevant: false }),
            AutoJob.countDocuments({ userId: new mongoose.Types.ObjectId(userId), processingStatus: 'generated' }),
            AutoJob.countDocuments({ userId: new mongoose.Types.ObjectId(userId), processingStatus: 'error' })
        ]);

        res.json({
            total,
            pending,
            analyzed,
            relevant,
            notRelevant,
            generated,
            errors
        });
    } catch (error: any) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

/**
 * Update auto-job settings
 * PUT /api/auto-jobs/settings/config
 */
export const updateSettings = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();
        const { enabled, linkedInSearchUrl, schedule, maxJobs } = req.body;
        console.log(`Updating settings for user ${userId}:`, JSON.stringify(req.body));

        let profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });

        if (!profile) {
            // Create new profile if it doesn't exist
            profile = new Profile({
                userId: new mongoose.Types.ObjectId(userId),
                autoJobSettings: {
                    enabled: enabled || false,
                    linkedInSearchUrl: linkedInSearchUrl || '',
                    schedule: schedule || '0 9 * * *',
                    maxJobs: maxJobs || 50
                }
            });
        } else {
            // Update existing profile
            (profile as any).autoJobSettings = {
                enabled: enabled !== undefined ? enabled : (profile as any).autoJobSettings?.enabled || false,
                linkedInSearchUrl: linkedInSearchUrl || (profile as any).autoJobSettings?.linkedInSearchUrl || '',
                schedule: schedule || (profile as any).autoJobSettings?.schedule || '0 9 * * *',
                maxJobs: maxJobs !== undefined ? Math.min(100, Math.max(20, maxJobs)) : (profile as any).autoJobSettings?.maxJobs || 50
            };
        }

        await profile.save();

        res.json({
            message: 'Settings updated successfully',
            settings: (profile as any).autoJobSettings
        });
    } catch (error: any) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            message: 'Failed to update settings',
            error: error.message
        });
    }
};

/**
 * Get auto-job settings
 * GET /api/auto-jobs/settings/config
 */
export const getSettings = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();

        let profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });

        if (!profile) {
            // Create default profile if it doesn't exist
            profile = new Profile({
                userId: new mongoose.Types.ObjectId(userId),
                autoJobSettings: {
                    enabled: false,
                    linkedInSearchUrl: '',
                    schedule: '0 9 * * *',
                    maxJobs: 50
                }
            });
            await profile.save();
        }

        const settings = (profile as any).autoJobSettings || {
            enabled: false,
            linkedInSearchUrl: '',
            schedule: '0 9 * * *',
            maxJobs: 50
        };

        // Ensure maxJobs is present even if not in DB
        if (settings.maxJobs === undefined) {
            settings.maxJobs = 50;
        }

        console.log('Returning settings:', JSON.stringify(settings));
        res.json(settings);
    } catch (error: any) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
};
