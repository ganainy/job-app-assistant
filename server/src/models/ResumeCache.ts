// server/src/models/ResumeCache.ts
import mongoose, { Document, Schema } from 'mongoose';

// Interface defining the structure of a Resume Cache document
export interface IResumeCache extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    contentHash: string; // MD5/SHA-256 of resume text

    // Structured resume data in JSON Resume format
    structuredData: {
        experience?: any[];
        summary?: string;
        skills?: string[];
        education?: any[];
        projects?: any[];
        certifications?: any[];
        languages?: any[];
        [key: string]: any; // Allow additional JSON Resume fields
    };

    createdAt: Date;
    updatedAt: Date;
}

// Mongoose Schema definition
const ResumeCacheSchema: Schema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        contentHash: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        structuredData: {
            type: Schema.Types.Mixed,
            required: true
        }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt fields
    }
);

// Compound unique index: Each user can have one cache entry per unique resume hash
ResumeCacheSchema.index({ userId: 1, contentHash: 1 }, { unique: true });

// TTL index to automatically delete cache entries older than 90 days (optional)
// This helps keep the cache fresh and storage efficient
ResumeCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Create and export the Mongoose model
export default mongoose.model<IResumeCache>('ResumeCache', ResumeCacheSchema);
