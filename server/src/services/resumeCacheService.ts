// server/src/services/resumeCacheService.ts
import crypto from 'crypto';
import ResumeCache, { IResumeCache } from '../models/ResumeCache';
import { generateStructuredResponse } from '../utils/aiService';
import mongoose from 'mongoose';

/**
 * Generate MD5 hash of resume text for caching
 */
export const generateResumeHash = (resumeText: string): string => {
    return crypto.createHash('md5').update(resumeText.trim()).digest('hex');
};

/**
 * Get cached structured resume data by user ID and resume text
 * Returns null if not found in cache
 */
export const getCachedResume = async (
    userId: string,
    resumeText: string
): Promise<any | null> => {
    try {
        const contentHash = generateResumeHash(resumeText);

        const cachedResume = await ResumeCache.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            contentHash
        });

        if (cachedResume) {
            console.log(`✓ Resume cache hit for user ${userId} (hash: ${contentHash.substring(0, 8)}...)`);
            return cachedResume.structuredData;
        }

        console.log(`○ Resume cache miss for user ${userId} (hash: ${contentHash.substring(0, 8)}...)`);
        return null;
    } catch (error: any) {
        console.error('Error checking resume cache:', error.message);
        return null;
    }
};

/**
 * Structure resume text using Gemini AI
 * Converts plain text resume into JSON Resume format
 */
export const structureResume = async (
    resumeText: string,
    userId: string
): Promise<any> => {
    const prompt = `You are a career assistant tasked with structuring a resume.

Given the following resume text, extract and structure it into a JSON object with these fields:
- experience: Array of work experiences (title, company, description, startDate, endDate, isCurrent)
- summary: Professional summary or objective
- skills: Array of skills
- education: Array of education entries
- projects: Array of projects (if any)
- certifications: Array of certifications (if any)
- languages: Array of languages (if any)

Resume Text:
${resumeText}

Return ONLY the JSON object, no markdown formatting, no explanation.`;

    return await generateStructuredResponse<any>(userId, prompt);
};

/**
 * Cache structured resume data
 */
export const cacheResume = async (
    userId: string,
    resumeText: string,
    structuredData: any
): Promise<void> => {
    try {
        const contentHash = generateResumeHash(resumeText);

        // Upsert: update if exists, create if not
        await ResumeCache.findOneAndUpdate(
            {
                userId: new mongoose.Types.ObjectId(userId),
                contentHash
            },
            {
                userId: new mongoose.Types.ObjectId(userId),
                contentHash,
                structuredData
            },
            { upsert: true, new: true }
        );

        console.log(`✓ Cached structured resume for user ${userId} (hash: ${contentHash.substring(0, 8)}...)`);
    } catch (error: any) {
        console.error('Error caching resume:', error.message);
        // Don't throw - caching failure shouldn't break the workflow
    }
};

/**
 * Get or create structured resume with caching
 * Checks cache first, structures if not found, then caches result
 */
export const getOrStructureResume = async (
    userId: string,
    resumeText: string
): Promise<any> => {
    // Check cache first
    const cached = await getCachedResume(userId, resumeText);
    if (cached) {
        return cached;
    }

    // Structure resume using AI
    console.log(`→ Structuring resume for user ${userId} using AI...`);
    const structuredData = await structureResume(resumeText, userId);

    // Cache for future use
    await cacheResume(userId, resumeText, structuredData);

    return structuredData;
};

/**
 * Clear old cache entries (older than specified days)
 * Can be called periodically as maintenance
 */
export const clearOldCache = async (daysOld: number = 90): Promise<number> => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await ResumeCache.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        console.log(`✓ Cleared ${result.deletedCount} old cache entries (older than ${daysOld} days)`);
        return result.deletedCount;
    } catch (error: any) {
        console.error('Error clearing old cache:', error.message);
        return 0;
    }
};
