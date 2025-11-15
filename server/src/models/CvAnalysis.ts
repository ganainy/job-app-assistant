import mongoose, { Document, Schema, Types } from 'mongoose';

// Interface defining the structure of the detailed results
interface IDetailedResultItem {
    checkName: string;
    score?: number | null; // Optional score that can be null
    issues: string[];
    suggestions?: string[]; // Optional suggestions from AI
    status: 'pass' | 'fail' | 'warning' | 'not-applicable';
    priority: 'high' | 'medium' | 'low';
}

// Interface for the CvAnalysis document
export interface ICvAnalysis extends Document {
    userId: Types.ObjectId;
    analysisDate: Date;
    status: 'pending' | 'completed' | 'failed';
    overallScore: number;
    issueCount: number;
    categoryScores: Record<string, number>;
    detailedResults: Record<string, IDetailedResultItem>;
    cvFileRef?: string;
    errorInfo?: string;
}

const DetailedResultSchema = new Schema<IDetailedResultItem>({
    checkName: { type: String, required: true },
    score: {
        type: Number,
        required: false,
        default: undefined,
        // Add custom validation to allow null/undefined
        validate: {
            validator: function (v: any) {
                return v === null || v === undefined || !isNaN(v);
            },
            message: 'Score must be a number, null, or undefined'
        }
    },
    issues: [{ type: String }],
    suggestions: [{ type: String }],
    status: {
        type: String,
        enum: ['pass', 'fail', 'warning', 'not-applicable'],
        required: true
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        required: true
    }
}, { _id: false });

const CvAnalysisSchema = new Schema({
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
        type: Map,
        of: Number,
        default: {}
    },
    detailedResults: {
        type: Map,
        of: DetailedResultSchema,
        default: {}
    },
    cvFileRef: {
        type: String
    },
    errorInfo: {
        type: String
    }
}, {
    timestamps: true
});

const CvAnalysis = mongoose.model<ICvAnalysis>('CvAnalysis', CvAnalysisSchema);

export default CvAnalysis;
