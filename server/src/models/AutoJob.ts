// server/src/models/AutoJob.ts
import mongoose, { Document, Schema } from 'mongoose';

// Interface defining the structure of an Auto Job document
export interface IAutoJob extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    
    // Core job data
    jobId: string; // Unique identifier from job board
    jobTitle: string;
    companyName: string;
    jobUrl: string;
    jobDescriptionText?: string;
    
    // Extracted intelligence from AI analysis
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
    
    // Company insights from AI research
    companyInsights?: {
        missionStatement?: string;
        coreValues?: string[];
        businessModel?: string;
    };
    
    // Relevance and scoring
    isRelevant?: boolean;
    relevanceReason?: string;
    skillMatchScore?: number; // 1-5 scale
    
    // Generated content
    customizedResumeHtml?: string;
    coverLetterText?: string;
    
    // Processing status
    processingStatus: 'pending' | 'analyzed' | 'relevant' | 'not_relevant' | 'generated' | 'error';
    errorMessage?: string;
    
    // Timestamps
    discoveredAt: Date;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Mongoose Schema definition
const AutoJobSchema: Schema = new Schema(
    {
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', 
            required: true, 
            index: true 
        },
        
        // Core job data
        jobId: { 
            type: String, 
            required: true, 
            trim: true,
            index: true 
        },
        jobTitle: { 
            type: String, 
            required: true, 
            trim: true 
        },
        companyName: { 
            type: String, 
            required: true, 
            trim: true 
        },
        jobUrl: { 
            type: String, 
            required: true, 
            trim: true 
        },
        jobDescriptionText: { 
            type: String 
        },
        
        // Extracted data
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
        
        // Company insights
        companyInsights: {
            missionStatement: String,
            coreValues: [String],
            businessModel: String
        },
        
        // Relevance and scoring
        isRelevant: { 
            type: Boolean 
        },
        relevanceReason: { 
            type: String 
        },
        skillMatchScore: { 
            type: Number, 
            min: 1, 
            max: 5 
        },
        
        // Generated content
        customizedResumeHtml: { 
            type: String 
        },
        coverLetterText: { 
            type: String 
        },
        
        // Processing status
        processingStatus: {
            type: String,
            enum: ['pending', 'analyzed', 'relevant', 'not_relevant', 'generated', 'error'],
            default: 'pending',
            required: true,
            index: true
        },
        errorMessage: { 
            type: String 
        },
        
        // Timestamps
        discoveredAt: { 
            type: Date, 
            default: Date.now,
            index: true
        },
        processedAt: { 
            type: Date 
        }
    },
    { 
        timestamps: true // Automatically adds createdAt and updatedAt fields
    }
);

// Compound index for deduplication (user + jobId must be unique)
AutoJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

// Index for querying by status and relevance
AutoJobSchema.index({ userId: 1, processingStatus: 1, isRelevant: 1 });

// Create and export the Mongoose model
export default mongoose.model<IAutoJob>('AutoJob', AutoJobSchema);
