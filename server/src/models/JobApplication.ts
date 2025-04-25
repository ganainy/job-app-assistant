// server/src/models/JobApplication.ts
import mongoose, { Document, Schema } from 'mongoose';

// Interface defining the structure of a Job Application document
export interface IJobApplication extends Document {
  jobTitle: string;
  companyName: string;
  status: 'Applied' | 'Not Applied' | 'Interview' | 'Assessment' | 'Rejected' | 'Closed' | 'Offer'; // Example statuses
  dateApplied?: Date; // Optional: Mark when applied
  jobUrl?: string; // Optional but useful
  notes?: string; // Optional user notes
  jobDescriptionText?: string; // Store the scraped text
  // Consider adding fields for generated CV/Cover Letter references later
  // Add user reference later when auth is implemented: userId: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema definition
const JobApplicationSchema: Schema = new Schema(
  {
    jobTitle: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['Applied', 'Not Applied', 'Interview', 'Assessment', 'Rejected', 'Closed', 'Offer'],
      default: 'Not Applied', // Sensible default
    },
    dateApplied: { type: Date },
    jobUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    jobDescriptionText: { type: String }, // Text from scraping
    // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add later
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create and export the Mongoose model
export default mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);
export interface IJobApplication extends Document { /* ... */ }