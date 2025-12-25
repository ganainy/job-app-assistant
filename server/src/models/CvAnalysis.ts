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

// Interface for skill matching analysis details
export interface ISkillMatchDetails {
    skillMatchPercentage?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
    recommendations?: string[];
    gapAnalysis?: Record<string, any>;
}

// Interface for section completeness analysis
export interface ISectionCompleteness {
    present: string[];
    missing: string[];
    score: number;
}

// Interface for quantifiable metrics analysis
export interface IQuantifiableMetrics {
    hasMetrics: boolean;
    examples: string[];
    score: number;
}

// Interface for skills analysis
export interface ISkillsAnalysis {
    hardSkills: string[];
    softSkills: string[];
    score: number;
}

// Interface for length analysis
export interface ILengthAnalysis {
    pageCount: number;
    wordCount: number;
    isOptimal: boolean;
    score: number;
}

// Interface for standard headers analysis
export interface IStandardHeaders {
    isStandard: boolean;
    nonStandardHeaders: string[];
    score: number;
}

// Interface for score breakdown by category
export interface IScoreBreakdown {
    technicalSkills: number;
    experienceRelevance: number;
    additionalSkills: number;
    formatting: number;
}

// Interface for prioritized missing keyword
export interface IPrioritizedKeyword {
    keyword: string;
    priority: 'high' | 'medium' | 'low';
    context: string;
}

// Interface for prioritized missing skill
export interface IPrioritizedSkill {
    skill: string;
    priority: 'high' | 'medium' | 'low';
    context: string;
}

// Interface for actionable feedback item
export interface IActionableFeedback {
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
}

// Interface for ATS compliance analysis details
export interface IAtsComplianceDetails {
    keywordsMatched?: string[];
    keywordsMissing?: string[];
    formattingIssues?: string[];
    suggestions?: string[];
    sectionScores?: Record<string, number>;
    sectionCompleteness?: ISectionCompleteness;
    quantifiableMetrics?: IQuantifiableMetrics;
    skillsAnalysis?: ISkillsAnalysis;
    lengthAnalysis?: ILengthAnalysis;
    readabilityScore?: number;
    atsBlockingElements?: string[];
    standardHeaders?: IStandardHeaders;
    // Enhanced fields for improved ATS analysis
    scoreBreakdown?: IScoreBreakdown;
    prioritizedMissingKeywords?: IPrioritizedKeyword[];
    prioritizedMissingSkills?: IPrioritizedSkill[];
    actionableFeedback?: IActionableFeedback[];
}

export interface IAtsScores {
    score?: number | null; // Overall ATS score
    skillMatchDetails?: ISkillMatchDetails | null; // Skill matching analysis
    complianceDetails?: IAtsComplianceDetails | null; // ATS compliance analysis
    lastAnalyzedAt?: Date;
    jobApplicationId?: string; // Reference to the job application this analysis is for
    error?: string; // Error message if analysis failed
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
    atsScores?: IAtsScores;
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

// Schema for skill matching details
const SkillMatchDetailsSchema = new Schema<ISkillMatchDetails>({
    skillMatchPercentage: { type: Number },
    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    recommendations: [{ type: String }],
    gapAnalysis: { type: Schema.Types.Mixed }
}, { _id: false });

// Schema for section completeness
const SectionCompletenessSchema = new Schema<ISectionCompleteness>({
    present: [{ type: String }],
    missing: [{ type: String }],
    score: { type: Number, min: 0, max: 100 }
}, { _id: false });

// Schema for quantifiable metrics
const QuantifiableMetricsSchema = new Schema<IQuantifiableMetrics>({
    hasMetrics: { type: Boolean },
    examples: [{ type: String }],
    score: { type: Number, min: 0, max: 100 }
}, { _id: false });

// Schema for skills analysis
const SkillsAnalysisSchema = new Schema<ISkillsAnalysis>({
    hardSkills: [{ type: String }],
    softSkills: [{ type: String }],
    score: { type: Number, min: 0, max: 100 }
}, { _id: false });

// Schema for length analysis
const LengthAnalysisSchema = new Schema<ILengthAnalysis>({
    pageCount: { type: Number },
    wordCount: { type: Number },
    isOptimal: { type: Boolean },
    score: { type: Number, min: 0, max: 100 }
}, { _id: false });

// Schema for standard headers
const StandardHeadersSchema = new Schema<IStandardHeaders>({
    isStandard: { type: Boolean },
    nonStandardHeaders: [{ type: String }],
    score: { type: Number, min: 0, max: 100 }
}, { _id: false });

// Schema for score breakdown
const ScoreBreakdownSchema = new Schema<IScoreBreakdown>({
    technicalSkills: { type: Number, min: 0, max: 100 },
    experienceRelevance: { type: Number, min: 0, max: 100 },
    additionalSkills: { type: Number, min: 0, max: 100 },
    formatting: { type: Number, min: 0, max: 100 }
}, { _id: false });

// Schema for prioritized missing keyword
const PrioritizedKeywordSchema = new Schema<IPrioritizedKeyword>({
    keyword: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    context: { type: String, required: true }
}, { _id: false });

// Schema for prioritized missing skill
const PrioritizedSkillSchema = new Schema<IPrioritizedSkill>({
    skill: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    context: { type: String, required: true }
}, { _id: false });

// Schema for actionable feedback
const ActionableFeedbackSchema = new Schema<IActionableFeedback>({
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    action: { type: String, required: true },
    impact: { type: String, required: true }
}, { _id: false });

// Schema for ATS compliance details
const AtsComplianceDetailsSchema = new Schema<IAtsComplianceDetails>({
    keywordsMatched: [{ type: String }],
    keywordsMissing: [{ type: String }],
    formattingIssues: [{ type: String }],
    suggestions: [{ type: String }],
    sectionScores: { type: Map, of: Number },
    sectionCompleteness: { type: SectionCompletenessSchema },
    quantifiableMetrics: { type: QuantifiableMetricsSchema },
    skillsAnalysis: { type: SkillsAnalysisSchema },
    lengthAnalysis: { type: LengthAnalysisSchema },
    readabilityScore: { type: Number, min: 0, max: 100 },
    atsBlockingElements: [{ type: String }],
    standardHeaders: { type: StandardHeadersSchema },
    // Enhanced fields
    scoreBreakdown: { type: ScoreBreakdownSchema },
    prioritizedMissingKeywords: [{ type: PrioritizedKeywordSchema }],
    prioritizedMissingSkills: [{ type: PrioritizedSkillSchema }],
    actionableFeedback: [{ type: ActionableFeedbackSchema }]
}, { _id: false });

// Schema for ATS scores
const AtsScoresSchema = new Schema<IAtsScores>({
    score: { type: Number, min: 0, max: 100 }, // Overall ATS score
    skillMatchDetails: { type: SkillMatchDetailsSchema }, // Skill matching analysis
    complianceDetails: { type: AtsComplianceDetailsSchema }, // ATS compliance analysis
    lastAnalyzedAt: { type: Date },
    jobApplicationId: { type: String }, // Reference to the job application
    error: { type: String } // Error message if analysis failed
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
    },
    atsScores: {
        type: AtsScoresSchema,
        required: false
    }
}, {
    timestamps: true
});

const CvAnalysis = mongoose.model<ICvAnalysis>('CvAnalysis', CvAnalysisSchema);

export default CvAnalysis;
