// server/src/controllers/autoJobController.ts
import { Request, Response } from 'express';
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
                    keywords: '',
                    location: '',
                    schedule: '0 9 * * *'
                }
            });
            await profile.save();
        }

        // Validate required settings
        const autoJobSettings = (profile as any).autoJobSettings;
        const keywords = autoJobSettings?.keywords || '';
        const location = autoJobSettings?.location || '';

        if (!keywords && !location) {
            return res.status(400).json({
                message: 'Please configure keywords or location in settings before running the workflow.'
            });
        }

        // AI provider will be checked by aiService when needed
        // No need to check here as aiService handles provider selection and fallback

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
 * Cancel a running workflow
 * POST /api/auto-jobs/runs/:runId/cancel
 */
export const cancelWorkflow = async (req: Request, res: Response) => {
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

        // Only allow cancelling if workflow is still running
        if (run.status !== 'running') {
            return res.status(400).json({ 
                message: `Cannot cancel workflow. Current status: ${run.status}` 
            });
        }

        // Update workflow status to cancelled
        await WorkflowRun.findByIdAndUpdate(runId, {
            status: 'cancelled',
            'progress.currentStep': 'Cancelled by user',
            completedAt: new Date()
        });

        console.log(`Workflow ${runId} cancelled by user ${userId}`);

        res.json({
            message: 'Workflow cancelled successfully',
            runId
        });
    } catch (error: any) {
        console.error('Error cancelling workflow:', error);
        res.status(500).json({ message: 'Failed to cancel workflow' });
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

        // Build query - only get auto jobs that haven't been promoted to dashboard and aren't soft-deleted
        const query: any = { 
            userId: new mongoose.Types.ObjectId(userId),
            isAutoJob: true,
            showInDashboard: false, // Exclude jobs that have been moved to dashboard
            deletedAt: null // Exclude soft-deleted jobs
        };

        if (status) {
            query.processingStatus = status;
        }

        if (relevance === 'true') {
            query['recommendation.shouldApply'] = true;
        } else if (relevance === 'false') {
            query['recommendation.shouldApply'] = false;
        } else if (relevance === 'processing') {
            // Filter for jobs that are still processing (pending or analyzed status)
            query.processingStatus = { $in: ['pending', 'analyzed'] };
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const [jobs, total] = await Promise.all([
            JobApplication.find(query)
                .sort({ discoveredAt: -1 })
                .skip(skip)
                .limit(limit),
            JobApplication.countDocuments(query)
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

        const job = await JobApplication.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
            isAutoJob: true,
            deletedAt: null // Exclude soft-deleted jobs
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
 * Promote auto job to dashboard (unified model - just update flag)
 * POST /api/auto-jobs/:id/promote
 */
export const promoteAutoJob = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();
        const { id } = req.params;

        // Find auto job (already a JobApplication with isAutoJob=true, not soft-deleted)
        const jobApplication = await JobApplication.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(userId),
            isAutoJob: true,
            deletedAt: null // Exclude soft-deleted jobs
        });

        if (!jobApplication) {
            return res.status(404).json({ message: 'Auto job not found' });
        }

        // Simply update the flag to show in dashboard (unified model - no data copying needed!)
        jobApplication.showInDashboard = true;
        await jobApplication.save();

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
 * Delete auto job (soft delete)
 * DELETE /api/auto-jobs/:id
 * Sets deletedAt timestamp instead of actually deleting, so the job won't be re-fetched in future workflows
 */
export const deleteAutoJob = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)._id.toString();
        const { id } = req.params;

        const result = await JobApplication.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(id),
                userId: new mongoose.Types.ObjectId(userId),
                isAutoJob: true,
                deletedAt: null // Only update if not already deleted
            },
            {
                deletedAt: new Date()
            },
            {
                new: true
            }
        );

        if (!result) {
            return res.status(404).json({ message: 'Auto job not found or already deleted' });
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

        const baseQuery = { 
            userId: new mongoose.Types.ObjectId(userId),
            isAutoJob: true
        };

        const [
            total,
            pending,
            analyzed,
            relevant,
            notRelevant,
            generated,
            errors
        ] = await Promise.all([
            JobApplication.countDocuments(baseQuery),
            JobApplication.countDocuments({ ...baseQuery, processingStatus: 'pending' }),
            JobApplication.countDocuments({ ...baseQuery, processingStatus: 'analyzed' }),
            JobApplication.countDocuments({ ...baseQuery, 'recommendation.shouldApply': true }),
            JobApplication.countDocuments({ ...baseQuery, 'recommendation.shouldApply': false }),
            JobApplication.countDocuments({ ...baseQuery, processingStatus: 'generated' }),
            JobApplication.countDocuments({ ...baseQuery, processingStatus: 'error' })
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
        const { 
            enabled, 
            keywords, 
            location, 
            jobType, 
            experienceLevel, 
            datePosted, 
            maxJobs, 
            avoidDuplicates,
            schedule 
        } = req.body;

        let profile = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });

        if (!profile) {
            // Create new profile if it doesn't exist
            profile = new Profile({
                userId: new mongoose.Types.ObjectId(userId),
                autoJobSettings: {
                    enabled: enabled || false,
                    keywords: keywords || '',
                    location: location || '',
                    jobType: Array.isArray(jobType) ? jobType : [],
                    experienceLevel: Array.isArray(experienceLevel) ? experienceLevel : [],
                    datePosted: datePosted || 'any time',
                    maxJobs: maxJobs || 100,
                    avoidDuplicates: avoidDuplicates || false,
                    schedule: schedule || '0 9 * * *'
                }
            });
        } else {
            // Update existing profile
            const existingSettings = (profile as any).autoJobSettings || {};
            (profile as any).autoJobSettings = {
                enabled: enabled !== undefined ? enabled : existingSettings.enabled || false,
                keywords: keywords !== undefined ? keywords : existingSettings.keywords || '',
                location: location !== undefined ? location : existingSettings.location || '',
                jobType: Array.isArray(jobType) ? jobType : (jobType !== undefined ? [] : existingSettings.jobType || []),
                experienceLevel: Array.isArray(experienceLevel) ? experienceLevel : (experienceLevel !== undefined ? [] : existingSettings.experienceLevel || []),
                datePosted: datePosted !== undefined ? datePosted : existingSettings.datePosted || 'any time',
                maxJobs: maxJobs !== undefined ? Math.min(1000, Math.max(20, maxJobs)) : existingSettings.maxJobs || 100,
                avoidDuplicates: avoidDuplicates !== undefined ? avoidDuplicates : existingSettings.avoidDuplicates || false,
                schedule: schedule || existingSettings.schedule || '0 9 * * *'
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
                    keywords: '',
                    location: '',
                    jobType: [],
                    experienceLevel: [],
                    datePosted: 'any time',
                    maxJobs: 100,
                    avoidDuplicates: false,
                    schedule: '0 9 * * *'
                }
            });
            await profile.save();
        }

        const settings = (profile as any).autoJobSettings || {
            enabled: false,
            keywords: '',
            location: '',
            jobType: [],
            experienceLevel: [],
            datePosted: 'any time',
            maxJobs: 100,
            avoidDuplicates: false,
            schedule: '0 9 * * *'
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
