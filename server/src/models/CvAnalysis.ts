import mongoose, { Document, Schema, Types } from 'mongoose';

// Interface defining the structure of the detailed results
// This can be expanded as specific analyzer modules are built
interface IDetailedResultItem {
    checkName: string;
    score?: number; // Optional score (e.g., for AI-based checks)
    issues: string[];
    suggestions?: string[]; // Optional suggestions from AI
    status: 'pass' | 'fail' | 'warning' | 'not-applicable';
    priority: 'high' | 'medium' | 'low'; // Priority level for fixing this issue
}

// Interface for the CvAnalysis document
export interface ICvAnalysis extends Document {
    userId: Types.ObjectId;
    analysisDate: Date;
    status: 'pending' | 'completed' | 'failed';
    overallScore: number;
    issueCount: number;
    categoryScores: Record<string, number>; // e.g., { content: 75, format: 90, ... }
    detailedResults: Record<string, IDetailedResultItem>; // Storing structured results from each analyzer
    cvFileRef?: string; // Optional: reference to the originally uploaded file
    errorInfo?: string; // Optional: store error messages if analysis fails
}

const CvAnalysisSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    analysisDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
        required: true
    },
    overallScore: {
        type: Number,
        default: 0
    },
    issueCount: {
        type: Number,
        default: 0
    },
    categoryScores: {
        type: Map, // Using Map for flexible key-value pairs
        of: Number,
        default: {}
    },
    detailedResults: {
        type: Map, // Using Map for flexible key-value pairs
        of: new Schema<IDetailedResultItem>({
            checkName: { type: String, required: true },
            score: { type: Number },
            issues: [{ type: String }],
            suggestions: [{ type: String }],
            status: { type: String, enum: ['pass', 'fail', 'warning', 'not-applicable'], required: true },
            priority: { type: String, enum: ['high', 'medium', 'low'], required: true } // Adding priority field
        }, { _id: false }), // _id: false for subdocuments within the map
        default: {}
    },
    cvFileRef: {
        type: String
    },
    errorInfo: {
        type: String
    }
}, {
    timestamps: true // Adds createdAt and updatedAt timestamps
});

const CvAnalysis = mongoose.model<ICvAnalysis>('CvAnalysis', CvAnalysisSchema);

export default CvAnalysis;
