import mongoose from 'mongoose';
import JobApplication, { IJobApplication } from '../models/JobApplication';
import User from '../models/User';
import { analyzeWithGemini } from './atsGeminiService';
import { JsonResumeSchema } from '../types/jsonresume';

export interface JobRecommendation {
    shouldApply: boolean;
    score: number | null;
    reason: string;
    cached: boolean;
    cachedAt?: Date;
    error?: string;
}

export async function getJobRecommendation(
    userId: string | mongoose.Types.ObjectId,
    jobId: string | mongoose.Types.ObjectId,
    forceRefresh: boolean = false
): Promise<JobRecommendation> {
    try {
        const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
        const jobIdObj = typeof jobId === 'string' ? new mongoose.Types.ObjectId(jobId) : jobId;

        const job = await JobApplication.findOne({ _id: jobIdObj, userId: userIdObj });
        if (!job) {
            return {
                shouldApply: false,
                score: null,
                reason: 'Job application not found',
                cached: false,
                error: 'Job application not found'
            };
        }

        if (!forceRefresh && job.recommendation) {
            return {
                shouldApply: job.recommendation.shouldApply,
                score: job.recommendation.score,
                reason: job.recommendation.reason,
                cached: true,
                cachedAt: job.recommendation.cachedAt
            };
        }

        const user = await User.findById(userIdObj).select('cvJson');
        if (!user) {
            return {
                shouldApply: false,
                score: null,
                reason: 'User not found',
                cached: false,
                error: 'User not found'
            };
        }

        if (!user.cvJson) {
            return {
                shouldApply: false,
                score: null,
                reason: 'Please upload your CV first to get recommendations',
                cached: false,
                error: 'CV not found'
            };
        }

        if (!job.jobDescriptionText || job.jobDescriptionText.trim().length === 0) {
            return {
                shouldApply: false,
                score: null,
                reason: 'Job description not available',
                cached: false,
                error: 'Job description not available'
            };
        }

        const analysisResult = await analyzeWithGemini(
            userIdObj.toString(),
            user.cvJson as JsonResumeSchema,
            job.jobDescriptionText
        );

        if (analysisResult.error || analysisResult.score === null) {
            const errorMsg = analysisResult.error || 'Failed to analyze job match';
            return {
                shouldApply: false,
                score: null,
                reason: errorMsg,
                cached: false,
                error: errorMsg
            };
        }

        const score = analysisResult.score;
        let shouldApply: boolean;
        let reason: string;

        if (score >= 70) {
            shouldApply = true;
            const matchedSkills = analysisResult.details.skillMatchDetails?.matchedSkills || [];
            const skillCount = matchedSkills.length;
            reason = `Strong match (${score}% compatibility). ${skillCount > 0 ? `Matched ${skillCount} key skills. ` : ''}Good alignment with job requirements.`;
        } else if (score >= 50) {
            shouldApply = false;
            const missingSkills = analysisResult.details.skillMatchDetails?.missingSkills || [];
            const skillCount = missingSkills.length;
            reason = `Moderate match (${score}% compatibility). ${skillCount > 0 ? `${skillCount} important skills missing. ` : ''}Consider applying after addressing key gaps.`;
        } else {
            shouldApply = false;
            const missingSkills = analysisResult.details.skillMatchDetails?.missingSkills || [];
            const skillCount = missingSkills.length;
            reason = `Weak match (${score}% compatibility). ${skillCount > 0 ? `Missing ${skillCount} critical skills. ` : ''}Significant gaps in requirements. Not recommended.`;
        }

        const recommendation = {
            score,
            shouldApply,
            reason,
            cachedAt: new Date()
        };

        await JobApplication.findByIdAndUpdate(
            jobIdObj,
            { $set: { recommendation } },
            { new: true }
        );

        return {
            shouldApply,
            score,
            reason,
            cached: false,
            cachedAt: recommendation.cachedAt
        };

    } catch (error: any) {
        console.error('Error getting job recommendation:', error);
        return {
            shouldApply: false,
            score: null,
            reason: 'Failed to generate recommendation',
            cached: false,
            error: error.message || 'Unknown error'
        };
    }
}

export async function getAllJobRecommendations(
    userId: string | mongoose.Types.ObjectId
): Promise<Record<string, JobRecommendation>> {
    try {
        const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
        
        const jobs = await JobApplication.find({ userId: userIdObj }).select('_id recommendation jobDescriptionText') as IJobApplication[];
        
        const recommendations: Record<string, JobRecommendation> = {};
        const jobsToGenerate: Array<{ jobId: mongoose.Types.ObjectId; jobIdString: string }> = [];
        
        for (const job of jobs) {
            const jobId = job._id as mongoose.Types.ObjectId;
            const jobIdString = jobId.toString();
            
            if (job.recommendation) {
                recommendations[jobIdString] = {
                    shouldApply: job.recommendation.shouldApply,
                    score: job.recommendation.score,
                    reason: job.recommendation.reason,
                    cached: true,
                    cachedAt: job.recommendation.cachedAt
                };
            } else {
                if (job.jobDescriptionText && job.jobDescriptionText.trim().length > 0) {
                    jobsToGenerate.push({ jobId, jobIdString });
                } else {
                    recommendations[jobIdString] = {
                        shouldApply: false,
                        score: null,
                        reason: 'Job description not available',
                        cached: false
                    };
                }
            }
        }
        
        for (const { jobId, jobIdString } of jobsToGenerate) {
            try {
                const recommendation = await getJobRecommendation(userIdObj, jobId, true);
                recommendations[jobIdString] = recommendation;
            } catch (error: any) {
                console.error(`Error generating recommendation for job ${jobIdString}:`, error);
                recommendations[jobIdString] = {
                    shouldApply: false,
                    score: null,
                    reason: 'Failed to generate recommendation',
                    cached: false,
                    error: error.message || 'Unknown error'
                };
            }
        }
        
        return recommendations;
    } catch (error: any) {
        console.error('Error getting all job recommendations:', error);
        return {};
    }
}

export async function regenerateAllJobRecommendations(
    userId: string | mongoose.Types.ObjectId
): Promise<Record<string, JobRecommendation>> {
    try {
        const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
        
        const jobs = await JobApplication.find({ userId: userIdObj }) as IJobApplication[];
        
        const recommendations: Record<string, JobRecommendation> = {};
        
        for (const job of jobs) {
            const jobId = job._id as mongoose.Types.ObjectId;
            const jobIdString = jobId.toString();
            
            const recommendation = await getJobRecommendation(userIdObj, jobId, true);
            recommendations[jobIdString] = recommendation;
        }
        
        return recommendations;
    } catch (error: any) {
        console.error('Error regenerating all job recommendations:', error);
        return {};
    }
}
