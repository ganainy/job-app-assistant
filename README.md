# VibeHired

VibeHired is an AI-powered job application assistant built on Google Gemini AI that automates and enhances your job search process. The platform uses advanced AI to analyze CVs, generate personalized cover letters, score ATS compatibility, extract job requirements, and provide real-time application assistance—all while you maintain full control over your data and API usage. Transform the tedious job application process into an efficient, intelligent workflow.

## Core Features

### User Authentication
- Secure registration and login using JWT
- Protected routes with authentication middleware
- User profile management

### Job Application Management
- **AI-Powered Job Extraction:** Paste a job posting URL and Google Gemini AI automatically extracts and structures job details (Title, Company, Description, Language, Notes) from any job posting
- **Dashboard View:** Filterable and sortable table view of all applications
- **Kanban Pipeline View:** Visual kanban board for tracking application status (Applied, Interview, Assessment, Offer, Rejected)
- **Status Tracking:** Track applications through multiple stages with custom statuses

### CV Management
- **AI-Powered CV Parsing:** Upload CV files (PDF, DOCX, RTF, TXT) and Google Gemini AI automatically parses and structures content into JSON Resume schema format
- **Rich CV Editor:** Comprehensive editor with section-by-section editing capabilities
- **AI CV Analysis:** AI-powered analysis of CV sections with intelligent improvement suggestions and recommendations
- **Multiple CV Versions:** Store and manage multiple CV versions

### AI-Powered Features
- **Intelligent CV Analysis:** Google Gemini AI analyzes your CV against job descriptions to identify strengths, gaps, and areas for improvement with actionable feedback
- **AI Cover Letter Generation:** Advanced AI generates personalized, tailored cover letters that match your CV style and address specific job requirements
- **AI ATS Scoring:** Get real-time ATS (Applicant Tracking System) compatibility scores with AI-generated detailed feedback on how to optimize your application
- **AI Chat Assistant:** Interactive AI chat interface powered by Google Gemini for each job application—get instant help, suggestions, and answers to application questions
- **AI Job Description Extraction:** AI automatically extracts and structures data from job posting URLs, saving time and ensuring accuracy
- **AI Draft Generation:** Generate tailored CV and cover letter drafts for specific job applications using AI that adapts your content to match job requirements
- **Smart Placeholder System:** AI detects missing information and uses intelligent placeholder handling with context-aware user input modals

### Analytics Dashboard
- **Statistics Overview:** Total applications, applications by status, month-over-month trends
- **Visual Charts:** 
  - Applications by status (pie/bar charts)
  - Applications over time (line charts)
- **Pipeline Kanban:** Interactive kanban board for managing application pipeline
- **Real-time Updates:** Statistics update as applications are added or modified

### Portfolio System
- **Portfolio Setup:** Comprehensive setup page for configuring your portfolio
- **Public Portfolio Pages:** Shareable public portfolio at `/portfolio/:username`
- **GitHub Integration:** Connect GitHub account to automatically import projects
- **LinkedIn Integration:** Sync LinkedIn profile data (optional, requires Apify token)
- **Project Management:** Add, edit, and organize projects with:
  - Featured projects
  - Technology tags
  - Project descriptions and media
  - GitHub repository links
- **Portfolio Publishing:** Toggle portfolio visibility (public/private)

### Settings & Configuration
- **API Key Management:** Secure interface for managing API keys:
  - Gemini API Key (Required for AI features)
  - Apify API Token (Optional for LinkedIn integration)
- **User Profile Settings:** Manage account settings and preferences

### Review & Finalization
- **AI-Generated Draft Review:** Review and refine AI-generated CVs and cover letters with full editing capabilities before PDF generation
- **Draft Management:** Save and retrieve AI-generated drafts for later editing and refinement
- **PDF Generation:** Generate professional PDF documents from your finalized AI-optimized CVs and cover letters
- **Download System:** Secure download of generated PDF files

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose
- **Authentication:** JWT (jsonwebtoken), bcryptjs
- **File Handling:** Multer
- **AI:** Google Generative AI SDK (`@google/generative-ai`)
- **Web Scraping:** Apify (for LinkedIn profile scraping)
- **PDF Generation:** Puppeteer
- **CV Schema:** JSON Resume ([https://jsonresume.org/](https://jsonresume.org/))
- **Charts:** Recharts (for analytics visualizations)

## User-Provided API Keys

**Important:** This application uses user-provided API keys. Each user must add their own API keys in the app settings:

- **Gemini API Key (Required):** For AI features (CV analysis, cover letter generation, chat)
  - Get your free API key from: https://makersuite.google.com/app/apikey
- **Apify API Token (Optional):** Only needed for LinkedIn profile synchronization
  - Get your free token from: https://console.apify.com/account/integrations

## Setup & Running (Development)

### Prerequisites
- Node.js (v18+ recommended)
- npm (v7+)
- MongoDB (Atlas account or local installation)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd job-app-assistant
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   Or use: `npm run install:all`

3. **Configure environment variables:**
   - Copy `env.example` from the root directory to `server/.env`
   - Add the required values:
     ```env
     # MongoDB Connection String (Required)
     # Why: Used to connect to your MongoDB database where all application data is stored
     # How to get:
     #   - Local MongoDB: mongodb://localhost:27017/job-app-assistant
     #   - MongoDB Atlas: Create a free cluster at https://www.mongodb.com/cloud/atlas
     #     Then copy the connection string from Atlas dashboard (replace <password> with your password)
     #     Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/job-app-assistant?retryWrites=true&w=majority
     MONGODB_URI=<your_mongodb_connection_string>
     
     # JWT Secret Key (Required)
     # Why: Used to sign and verify JWT tokens for user authentication and session management
     # How to get: Generate a secure random string using one of these methods:
     #   - OpenSSL: openssl rand -base64 32
     #   - Node.js: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     #   - Online: Use a secure random string generator (minimum 32 characters recommended)
     # Important: Keep this secret secure and never commit it to version control
     JWT_SECRET=<your_strong_random_secret_string>
     ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```
   This starts both:
   - Backend server (nodemon on port 5001)
   - Frontend server (Vite on port 5173)

5. **Access the application:**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5001/api`

### First Time Setup

After starting the application:

1. Register a new account
2. Navigate to **Settings** page
3. Add your **Gemini API Key** (required for AI features)
   - Get your free API key from: https://makersuite.google.com/app/apikey
4. Optionally add **Apify Token** (for LinkedIn integration)
   - Get your free token from: https://console.apify.com/account/integrations
5. Optionally add **GitHub Token** in Portfolio Setup page (for GitHub integration with higher rate limits)

**Note:** API keys (Gemini, Apify) are managed per-user in the app settings page. GitHub token is managed per-user in the portfolio setup page.

## App Showcase

| Feature | Description | Screenshot |
|---------|-------------|------------|
| **Dashboard** | The main dashboard provides a comprehensive view of all job applications with filtering, sorting, and quick actions. | ![Dashboard](demo/screencapture-localhost-5173-dashboard-2025-11-17-00_39_35.png) |
| **Analytics Dashboard** | Track your application progress with detailed statistics, charts, and a visual kanban pipeline. | ![Analytics](demo/screencapture-localhost-5173-analytics-2025-11-17-00_41_33.png) |
| **CV Management** | Upload, parse, and edit your CV with a rich editor that supports section-by-section editing and AI-powered analysis. | ![CV Management](demo/screencapture-localhost-5173-manage-cv-2025-11-17-00_41_17.png) |
| **Portfolio Setup - Step 1** | Configure your professional portfolio with GitHub integration, LinkedIn sync, and project management. | ![Portfolio Setup - Step 1](demo/screencapture-localhost-5173-portfolio-setup-2025-11-17-00_41_55.png) |
| **Portfolio Setup - Step 2** | Configure your professional portfolio with GitHub integration, LinkedIn sync, and project management. | ![Portfolio Setup - Step 2](demo/screencapture-localhost-5173-portfolio-setup-2025-11-17-00_42_25.png) |
| **Portfolio Setup - Step 3** | Configure your professional portfolio with GitHub integration, LinkedIn sync, and project management. | ![Portfolio Setup - Step 3](demo/screencapture-localhost-5173-portfolio-setup-2025-11-17-00_42_31.png) |
| **Portfolio Setup - Step 4** | Configure your professional portfolio with GitHub integration, LinkedIn sync, and project management. | ![Portfolio Setup - Step 4](demo/screencapture-localhost-5173-portfolio-setup-2025-11-17-00_42_40.png) |
| **Public Portfolio** | Share your professional portfolio with a clean, modern public page. | ![Public Portfolio](demo/screencapture-localhost-5173-portfolio-a-a-com-2025-11-17-00_42_05.png) |
| **Review & Finalization - Overview** | Review, edit, and finalize your generated CVs and cover letters before PDF generation. | ![Review Page - Overview](demo/screencapture-localhost-5173-jobs-6919eac2ce65dfda35869b25-review-2025-11-17-00_51_46.png) |
| **Review & Finalization - CV Editing** | Review, edit, and finalize your generated CVs and cover letters before PDF generation. | ![Review Page - CV Editing](demo/screencapture-localhost-5173-jobs-6919eac2ce65dfda35869b25-review-2025-11-17-00_52_48.png) |
| **Review & Finalization - Cover Letter Editing** | Review, edit, and finalize your generated CVs and cover letters before PDF generation. | ![Review Page - Cover Letter Editing](demo/screencapture-localhost-5173-jobs-6919eac2ce65dfda35869b25-review-2025-11-17-00_53_07.png) |
| **Review & Finalization - Finalization** | Review, edit, and finalize your generated CVs and cover letters before PDF generation. | ![Review Page - Finalization](demo/screencapture-localhost-5173-jobs-6919eac2ce65dfda35869b25-review-2025-11-17-00_53_44.png) |
