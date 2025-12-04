// server/src/models/WorkflowRun.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowRun extends Document {
    userId: mongoose.Types.ObjectId;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    progress: {
        currentStep: string;
        currentStepIndex: number;
        totalSteps: number;
        percentage: number;
    };
    steps: Array<{
        name: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        startedAt?: Date;
        completedAt?: Date;
        message?: string;
        count?: number; // e.g., "5/20 jobs processed"
        total?: number;
    }>;
    stats: {
        jobsFound: number;
        newJobs: number;
        duplicates: number;
        analyzed: number;
        relevant: number;
        notRelevant: number;
        generated: number;
        errors: number;
    };
    errorMessage?: string;
    startedAt: Date;
    completedAt?: Date;
    isManual: boolean;
}

const WorkflowRunSchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['running', 'completed', 'failed', 'cancelled'],
            default: 'running',
            required: true,
            index: true,
        },
        progress: {
            currentStep: { type: String, default: 'Initializing...' },
            currentStepIndex: { type: Number, default: 0 },
            totalSteps: { type: Number, default: 6 },
            percentage: { type: Number, default: 0 },
        },
        steps: [
            {
                name: { type: String, required: true },
                status: {
                    type: String,
                    enum: ['pending', 'running', 'completed', 'failed'],
                    default: 'pending',
                },
                startedAt: { type: Date },
                completedAt: { type: Date },
                message: { type: String },
                count: { type: Number },
                total: { type: Number },
            },
        ],
        stats: {
            jobsFound: { type: Number, default: 0 },
            newJobs: { type: Number, default: 0 },
            duplicates: { type: Number, default: 0 },
            analyzed: { type: Number, default: 0 },
            relevant: { type: Number, default: 0 },
            notRelevant: { type: Number, default: 0 },
            generated: { type: Number, default: 0 },
            errors: { type: Number, default: 0 },
        },
        errorMessage: { type: String },
        startedAt: { type: Date, default: Date.now, required: true },
        completedAt: { type: Date },
        isManual: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

// Index for finding recent runs
WorkflowRunSchema.index({ userId: 1, createdAt: -1 });

const WorkflowRun = mongoose.model<IWorkflowRun>('WorkflowRun', WorkflowRunSchema);

export default WorkflowRun;
