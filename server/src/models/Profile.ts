// server/src/models/Profile.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name?: string;
  title?: string;
  bio?: string;
  location?: string;
  phone?: string;
  linkedInExperience?: Array<{
    title?: string;
    company?: string;
    description?: string;
    location?: string;
    startDate?: { year?: number; month?: string };
    endDate?: { year?: number; month?: string };
    isCurrent?: boolean;
  }>;
  linkedInSkills?: string[];
  linkedInLanguages?: Array<{
    language?: string;
    proficiency?: string;
  }>;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    portfolio?: string;
    behance?: string;
    dribbble?: string;
    medium?: string;
    dev?: string;
    stackoverflow?: string;
    youtube?: string;
  };
  headerImageUrl?: string;
  profileImageUrl?: string;
  cvViewUrl?: string;
  cvDownloadUrl?: string;
  cvFileUrl?: string;
  integrations?: {
    github?: {
      username?: string;
      accessToken?: string;
      enabled?: boolean;
    };
    linkedin?: {
      profileId?: string;
      accessToken?: string;
      enabled?: boolean;
    };
    apify?: {
      accessToken?: string;
      enabled?: boolean;
    };
    gemini?: {
      accessToken?: string;
      enabled?: boolean;
    };
  };
  settings?: {
    theme?: string;
    showSkills?: boolean;
    showContact?: boolean;
    showGitHub?: boolean;
    showLinkedIn?: boolean;
    showLinkedInName?: boolean;
    showLinkedInExperience?: boolean;
    showLinkedInSkills?: boolean;
    showLinkedInLanguages?: boolean;
  };
  isPublished?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProfileSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
    },
    location: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    linkedInExperience: [
      {
        title: String,
        company: String,
        description: String,
        location: String,
        startDate: {
          year: Number,
          month: String,
        },
        endDate: {
          year: Number,
          month: String,
        },
        isCurrent: Boolean,
      },
    ],
    linkedInSkills: [String],
    linkedInLanguages: [
      {
        language: String,
        proficiency: String,
      },
    ],
    socialLinks: {
      github: String,
      linkedin: String,
      twitter: String,
      website: String,
      portfolio: String,
      behance: String,
      dribbble: String,
      medium: String,
      dev: String,
      stackoverflow: String,
      youtube: String,
    },
    headerImageUrl: String,
    profileImageUrl: String,
    cvViewUrl: String,
    cvDownloadUrl: String,
    cvFileUrl: String,
    integrations: {
      github: {
        username: String,
        accessToken: String,
        enabled: {
          type: Boolean,
          default: false,
        },
      },
      linkedin: {
        profileId: String,
        accessToken: String,
        enabled: {
          type: Boolean,
          default: false,
        },
      },
      apify: {
        accessToken: String,
        enabled: {
          type: Boolean,
          default: false,
        },
      },
      gemini: {
        accessToken: String,
        enabled: {
          type: Boolean,
          default: false,
        },
      },
    },
    settings: {
      theme: {
        type: String,
        default: 'dark',
      },
      showSkills: {
        type: Boolean,
        default: true,
      },
      showContact: {
        type: Boolean,
        default: true,
      },
      showGitHub: {
        type: Boolean,
        default: true,
      },
      showLinkedIn: {
        type: Boolean,
        default: true,
      },
      showLinkedInName: {
        type: Boolean,
        default: true,
      },
      showLinkedInExperience: {
        type: Boolean,
        default: true,
      },
      showLinkedInSkills: {
        type: Boolean,
        default: true,
      },
      showLinkedInLanguages: {
        type: Boolean,
        default: true,
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model<IProfile>('Profile', ProfileSchema);

