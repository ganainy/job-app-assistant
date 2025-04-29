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
    // --- New Fields for Drafts & Status ---
    draftCvJson?: JsonResumeSchema | mongoose.Schema.Types.Mixed; // Store draft CV data
    draftCoverLetterText?: string; // Store draft Cover Letter text
    generationStatus?: GenerationStatus; // Track the generation process
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
        // --- Schema Definitions for New Fields ---
        draftCvJson: { type: Schema.Types.Mixed, required: false },
        draftCoverLetterText: { type: String, required: false },
        generationStatus: {
            type: String,
            enum: ['none', 'pending_input', 'draft_ready', 'finalized', 'error'],
            default: 'none'
        },
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Create and export the Mongoose model
export default mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);