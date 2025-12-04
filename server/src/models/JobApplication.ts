// server/src/models/JobApplication.ts
import mongoose, { Document, Schema } from 'mongoose';
import { JsonResumeSchema } from '../types/jsonresume'; // Assuming this type exists

// Define allowed statuses
type GenerationStatus = 'none' | 'pending_input' | 'draft_ready' | 'finalized' | 'error';

// Interface defining the structure of a Job Application document
export interface IJobApplication extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    jobTitle: string;
    companyName: string;
    status: 'Applied' | 'Not Applied' | 'Interview' | 'Assessment' | 'Rejected' | 'Closed' | 'Offer'; // Example statuses
    dateApplied?: Date; // Optional: Mark when applied
    jobUrl?: string; // Optional but useful
    notes?: string; // Optional user notes
    jobDescriptionText?: string; // Store the scraped text
    language?: string; // Language of the job
    
    // --- Auto Job Fields (unified model) ---
    isAutoJob?: boolean; // true if auto-discovered
    showInDashboard?: boolean; // true to show in dashboard
    jobId?: string; // Unique identifier from job board (for auto jobs)
    workflowRunId?: mongoose.Schema.Types.ObjectId; // Reference to workflow run (for auto jobs)
    processingStatus?: 'pending' | 'analyzed' | 'relevant' | 'not_relevant' | 'generated' | 'error'; // For auto jobs
    errorMessage?: string; // Error message for auto jobs
    discoveredAt?: Date; // When auto job was discovered
    processedAt?: Date; // When auto job was processed
    
    // Extracted intelligence from AI analysis (for auto jobs)
    extractedData?: {
        skills?: string[];
        salary?: {
            min?: number;
            max?: number;
            currency?: string;
        };
        yearsExperience?: number;
        location?: string;
        remoteOption?: string;
    };
    
    // Company insights from AI research (for auto jobs)
    companyInsights?: {
        missionStatement?: string;
        coreValues?: string[];
        businessModel?: string;
    };
    
    // --- New Fields for Drafts & Status ---
    draftCvJson?: JsonResumeSchema | mongoose.Schema.Types.Mixed; // Store draft CV data
    draftCoverLetterText?: string; // Store draft Cover Letter text
    generationStatus?: GenerationStatus; // Track the generation process
    // --- New Fields for Final Filenames ---
    generatedCvFilename?: string; // Store the filename of the latest generated CV PDF
    generatedCoverLetterFilename?: string; // Store the filename of the latest generated CL PDF
    // --- Chat History ---
    chatHistory?: Array<{
        sender: 'user' | 'ai';
        text: string;
        timestamp: Date;
    }>;
    // --- Recommendation Cache ---
    recommendation?: {
        score: number | null;
        shouldApply: boolean;
        reason: string;
        cachedAt: Date;
    };
    // --- Standard Timestamps ---
    createdAt: Date;
    updatedAt: Date;
}

// Mongoose Schema definition
const JobApplicationSchema: Schema = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        jobTitle: { type: String, required: true, trim: true },
        companyName: { type: String, required: true, trim: true },
        status: { type: String, required: true, enum: ['Applied', 'Not Applied', 'Interview', 'Assessment', 'Rejected', 'Closed', 'Offer'], default: 'Not Applied' },
        dateApplied: { type: Date },
        jobUrl: { type: String, trim: true },
        notes: { type: String, trim: true },
        jobDescriptionText: { type: String }, // Text from scraping
        language: { type: String, trim: true },
        
        // --- Auto Job Fields (unified model) ---
        isAutoJob: { type: Boolean, default: false, index: true },
        showInDashboard: { type: Boolean, default: true, index: true }, // Default true for manual jobs, false for auto jobs
        jobId: { type: String, trim: true, index: true }, // Unique identifier from job board (for auto jobs)
        workflowRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowRun', index: true },
        processingStatus: {
            type: String,
            enum: ['pending', 'analyzed', 'relevant', 'not_relevant', 'generated', 'error'],
            index: true
        },
        errorMessage: { type: String },
        discoveredAt: { type: Date, index: true },
        processedAt: { type: Date },
        
        // Extracted intelligence from AI analysis (for auto jobs)
        extractedData: {
            skills: [String],
            salary: {
                min: Number,
                max: Number,
                currency: { type: String, default: 'USD' }
            },
            yearsExperience: Number,
            location: String,
            remoteOption: String
        },
        
        // Company insights from AI research (for auto jobs)
        companyInsights: {
            missionStatement: String,
            coreValues: [String],
            businessModel: String
        },
        
        // --- Schema Definitions for New Fields ---
        draftCvJson: { type: Schema.Types.Mixed, required: false },
        draftCoverLetterText: { type: String, required: false },
        generationStatus: {
            type: String,
            enum: ['none', 'pending_input', 'pending_generation', 'draft_ready', 'finalized', 'error'], // Added pending_generation
            default: 'none'
        },
        // --- Schema Definitions for New Fields ---
        generatedCvFilename: { type: String, required: false },
        generatedCoverLetterFilename: { type: String, required: false },
        // --- Chat History Schema ---
        chatHistory: [{
            sender: { type: String, enum: ['user', 'ai'], required: true },
            text: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }],
        // --- Recommendation Cache Schema ---
        recommendation: {
            score: { type: Number, required: false },
            shouldApply: { type: Boolean, required: false },
            reason: { type: String, required: false },
            cachedAt: { type: Date, required: false }
        }
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Compound index for deduplication (user + jobId must be unique for auto jobs)
JobApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true, sparse: true });

// Index for querying auto jobs by status and recommendation
JobApplicationSchema.index({ userId: 1, isAutoJob: 1, processingStatus: 1, 'recommendation.shouldApply': 1 });

// Index for querying dashboard jobs
JobApplicationSchema.index({ userId: 1, showInDashboard: 1, status: 1 });

// Create and export the Mongoose model
export default mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);