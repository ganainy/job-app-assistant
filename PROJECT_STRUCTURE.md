# Job Application Assistant - Project Structure and Capabilities

This document provides an overview of the Job Application Assistant project, detailing its structure, key components, and core capabilities.

## Project Overview

The Job Application Assistant is a full-stack web application designed to help users manage their job applications. It allows users to create and manage their CVs, analyze them against job descriptions, and track their applications. The project is built as a monorepo, with a React frontend and a Node.js/Express backend.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Recharts
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB with Mongoose ODM
- **AI:** Google Gemini (via `@google/generative-ai` SDK)
- **Web Scraping:** Apify (for LinkedIn profile scraping)
- **PDF Generation:** Puppeteer
- **Authentication:** JWT (jsonwebtoken), bcryptjs
- **File Handling:** Multer
- **CV Schema:** JSON Resume standard

## Directory Structure

The project is organized into two main parts: `client` and `server`.

```
job-app-assistant/
├── client/         # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable React components
│   │   ├── context/    # React context for state management (e.g., Auth)
│   │   ├── pages/      # Top-level page components
│   │   └── services/   # API communication layer
│   └── ...
├── server/         # Node.js backend application
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Express middleware (e.g., authentication)
│   │   ├── models/      # Mongoose data models
│   │   ├── routes/      # API route definitions
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utility functions (AI, PDF generation, etc.)
│   └── ...
├── .gitignore
├── package.json    # Root package.json for managing workspaces
└── README.md
```

### Client-Side (`client/`)

The client is a single-page application (SPA) built with React and TypeScript.

- **`src/components`**: Contains reusable React components organized by feature:
  - `analysis/`: CV analysis components
  - `analytics/`: Analytics dashboard components (charts, statistics)
  - `ats/`: ATS scoring and feedback components
  - `auth/`: Authentication components (ProtectedRoute)
  - `chat/`: AI chat interface components
  - `common/`: Shared UI components (Toast, Spinner, ErrorAlert, LoadingSkeleton)
  - `cv-editor/`: Comprehensive CV editor with section-by-section editing
  - `dashboard/`: Dashboard-specific components
  - `generator/`: Draft generation components
  - `jobs/`: Job application components (cards, kanban, status badges)
  - `portfolio/`: Portfolio display components (Layout, Projects, About)
- **`src/pages`**: Top-level page components:
  - `LoginPage.tsx`: User login
  - `RegisterPage.tsx`: User registration
  - `DashboardPage.tsx`: Main dashboard with job applications
  - `CVManagementPage.tsx`: CV upload, parsing, and editing
  - `AnalyticsPage.tsx`: Analytics dashboard with charts and statistics
  - `PortfolioSetupPage.tsx`: Portfolio configuration and setup
  - `PortfolioPage.tsx`: Public portfolio view (accessible at `/portfolio/:username`)
  - `ReviewFinalizePage.tsx`: Review and finalize generated CVs/cover letters
  - `SettingsPage.tsx`: API key management and settings
- **`src/services`**: API communication layer - handles all HTTP requests to backend:
  - `analysisApi.ts`: CV analysis endpoints
  - `analyticsApi.ts`: Analytics data endpoints
  - `atsApi.ts`: ATS scoring endpoints
  - `authApi.ts`: Authentication endpoints
  - `chatApi.ts`: AI chat endpoints
  - `coverLetterApi.ts`: Cover letter generation endpoints
  - `cvApi.ts`: CV management endpoints
  - `generatorApi.ts`: Draft generation endpoints
  - `jobApi.ts`: Job application CRUD endpoints
  - `portfolioApi.ts`: Portfolio data endpoints
  - `settingsApi.ts`: Settings and API key management endpoints
- **`src/context`**: React Context providers for global state:
  - `AuthContext.tsx`: User authentication state
  - `ThemeContext.tsx`: Dark/light theme management

### Server-Side (`server/`)

The server is a RESTful API built with Node.js, Express, and TypeScript.

- **`src/controllers`**: Request handlers that validate data and call services:
  - `analysisController.ts`: CV analysis against job descriptions
  - `analyticsController.ts`: Job application statistics and analytics
  - `atsController.ts`: ATS scoring and feedback
  - `authController.ts`: User authentication (login, register)
  - `coverLetterController.ts`: Cover letter generation
  - `cvController.ts`: CV upload, parsing, and management
  - `generatorController.ts`: Draft generation for CVs and cover letters
  - `githubController.ts`: GitHub integration for portfolio
  - `linkedinController.ts`: LinkedIn profile scraping
  - `profileController.ts`: User profile management
- **`src/models`**: Mongoose schemas for MongoDB collections:
  - `User.ts`: User accounts with authentication
  - `JobApplication.ts`: Job application tracking
  - `Profile.ts`: User profiles with integrations (Gemini, Apify)
  - `Project.ts`: Portfolio projects
- **`src/routes`**: API route definitions mapping endpoints to controllers:
  - `analysis.ts`: `/api/analysis` - CV analysis endpoints
  - `analytics.ts`: `/api/analytics` - Analytics data endpoints
  - `atsRoutes.ts`: `/api/ats` - ATS scoring endpoints
  - `auth.ts`: `/api/auth` - Authentication endpoints (login, register)
  - `chat.ts`: `/api/chat` - AI chat endpoints
  - `coverLetter.ts`: `/api/cover-letter` - Cover letter endpoints
  - `cv.ts`: `/api/cv` - CV management endpoints
  - `generator.ts`: `/api/generator` - Draft generation endpoints
  - `github.ts`: `/api/github` - GitHub integration endpoints
  - `jobApplications.ts`: `/api/job-applications` - Job application CRUD
  - `linkedin.ts`: `/api/linkedin` - LinkedIn scraping endpoints
  - `profile.ts`: `/api/profile` - Profile management endpoints
  - `projects.ts`: `/api/projects` - Portfolio project endpoints
  - `settings.ts`: `/api/settings` - Settings and API key management
- **`src/services`**: Core business logic:
  - `analysisService.ts`: CV analysis logic
  - `analyticsService.ts`: Analytics calculations and aggregations
  - `atsGeminiService.ts`: ATS scoring using Gemini AI
  - `chatService.ts`: AI chat conversation handling
  - `coverLetterService.ts`: Cover letter generation logic
  - `generatorService.ts`: Draft generation orchestration
  - `githubService.ts`: GitHub API integration
  - `linkedinService.ts`: LinkedIn profile scraping via Apify
- **`src/utils`**: Utility functions and helpers:
  - `aiExtractor.ts`: AI-powered data extraction from job postings
  - `geminiClient.ts`: Google Gemini API client wrapper
  - `pdfGenerator.ts`: PDF generation using Puppeteer
  - `scraper.ts`: Web scraping utilities
  - `apiKeyHelpers.ts`: API key validation and management
  - `asyncHandler.ts`: Async error handling wrapper
  - `errors/`: Custom error classes
  - `validations/`: Request validation schemas
- **`src/middleware`**: Express middleware:
  - `authMiddleware.ts`: JWT authentication verification
  - `errorHandler.ts`: Global error handling
  - `validateRequest.ts`: Request validation middleware

## Core Capabilities

### User Management
- **Authentication**: Secure user registration and login with JWT tokens
- **Profile Management**: User profiles with optional username for portfolio URLs
- **Settings**: Per-user API key management (Gemini, Apify)

### Job Application Management
- **CRUD Operations**: Create, read, update, and delete job applications
- **Automated Job Creation**: Extract job details from URLs using AI
- **Status Tracking**: Track applications through multiple stages (Applied, Interview, Assessment, Offer, Rejected)
- **Dashboard Views**: Table view with filtering and sorting, plus kanban pipeline view
- **Notes & Metadata**: Store notes, URLs, languages, and other job-related information

### CV Management
- **CV Upload**: Support for multiple formats (PDF, DOCX, RTF, TXT)
- **AI Parsing**: Automatic parsing of uploaded CVs into JSON Resume schema
- **Rich Editor**: Comprehensive section-by-section CV editor:
  - Basics (contact info, summary)
  - Work experience with detailed editing
  - Education history
  - Skills with categorization
  - Projects and achievements
  - Certificates
  - Languages
- **CV Analysis**: AI-powered analysis of CV sections with improvement suggestions
- **Multiple Versions**: Store and manage multiple CV versions

### AI-Powered Features
- **CV Analysis**: Analyze CV against job descriptions to identify strengths and improvement areas
- **Cover Letter Generation**: AI generates tailored cover letters based on CV and job description
- **ATS Scoring**: Get ATS (Applicant Tracking System) compatibility scores with detailed feedback
- **Chat Assistance**: AI chat interface for each job application to get help and suggestions
- **Job Description Extraction**: Automatically extract structured data from job posting URLs
- **Draft Generation**: Generate tailored CV and cover letter drafts for specific applications
- **Placeholder System**: Smart placeholder handling for missing information with user input modals

### Analytics & Reporting
- **Statistics Dashboard**: Overview of total applications, status breakdowns, and trends
- **Visual Charts**: 
  - Applications by status (pie/bar charts)
  - Applications over time (line charts)
- **Pipeline Management**: Interactive kanban board for visual pipeline tracking
- **Real-time Updates**: Statistics update automatically as data changes

### Portfolio System
- **Portfolio Setup**: Comprehensive setup page for configuring portfolios
- **Public Portfolios**: Shareable public portfolio pages at `/portfolio/:username`
- **GitHub Integration**: Connect GitHub account to automatically import projects
- **LinkedIn Integration**: Sync LinkedIn profile data (optional, requires Apify token)
- **Project Management**: Add, edit, and organize projects with:
  - Featured projects
  - Technology tags and filtering
  - Project descriptions and media
  - GitHub repository links
- **Portfolio Publishing**: Toggle portfolio visibility (public/private)

### Document Generation
- **PDF Generation**: Generate professional PDF documents for CVs and cover letters using Puppeteer
- **Review & Finalization**: Review page for editing and finalizing generated documents
- **Draft Management**: Save and retrieve drafts for later editing
- **Download System**: Secure download of generated PDF files

### Web Scraping
- **Job Posting Extraction**: Fetch and parse job posting content from URLs
- **LinkedIn Profile Scraping**: Extract LinkedIn profile data using Apify integration
