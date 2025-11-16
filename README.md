# Job Application Assistant

This comprehensive web application empowers job seekers to efficiently manage their entire job application process through intelligent automation and AI-powered assistance. The platform streamlines the creation of tailored CVs and cover letters by leveraging advanced AI technology, while providing robust tools for tracking applications, analyzing performance, and showcasing professional portfolios. Whether you're applying to multiple positions or need help crafting the perfect application materials, this application offers a complete solution that combines job tracking, document generation, analytics insights, and portfolio management in one integrated platform.

## Core Features

### User Authentication
- Secure registration and login using JWT
- Protected routes with authentication middleware
- User profile management

### Job Application Management
- **Manual Job Creation:** Add, edit, and delete job applications with details (Title, Company, Status, URL, Notes, Language)
- **Automated Job Creation from URL:** Paste a job posting URL and AI (Google Gemini) automatically extracts Job Title, Company Name, Description, Language, and Notes
- **Dashboard View:** Filterable and sortable table view of all applications
- **Kanban Pipeline View:** Visual kanban board for tracking application status (Applied, Interview, Assessment, Offer, Rejected)
- **Status Tracking:** Track applications through multiple stages with custom statuses

### CV Management
- **CV Upload & AI Parsing:** Upload CV files (PDF, DOCX, RTF, TXT) and AI automatically parses content into JSON Resume schema format
- **Rich CV Editor:** Comprehensive editor with section-by-section editing:
  - Basics (contact info, summary)
  - Work experience
  - Education
  - Skills
  - Projects
  - Certificates
  - Languages
- **CV Analysis:** AI-powered analysis of CV sections with improvement suggestions
- **Multiple CV Versions:** Store and manage multiple CV versions

### AI-Powered Features
- **CV Analysis:** Analyze CV against job descriptions to identify strengths and areas for improvement
- **Cover Letter Generation:** AI generates tailored cover letters based on CV and job description
- **ATS Scoring:** Get ATS (Applicant Tracking System) compatibility scores with detailed feedback
- **Chat Assistance:** AI chat interface for each job application to get help with applications
- **Job Description Extraction:** Automatically extract structured data from job posting URLs
- **Draft Generation:** Generate tailored CV and cover letter drafts for specific job applications
- **Placeholder Handling:** Smart placeholder system for missing information with user input modals

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
- **Review Page:** Edit and finalize generated CVs and cover letters before PDF generation
- **Draft Management:** Save and retrieve drafts for later editing
- **PDF Generation:** Generate professional PDF documents for CVs and cover letters
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

## Current Development Status

The application is fully functional with all core features implemented:
- Complete job application management workflow
- Full CV management with rich editor
- AI-powered features (analysis, generation, chat, ATS scoring)
- Analytics dashboard with visualizations
- Portfolio system with GitHub/LinkedIn integration
- Settings and API key management
- Review and PDF generation workflow

## Future Enhancements

Potential areas for future development:
1. **Enhanced AI Features:** Additional AI-powered refinements and suggestions
2. **Email Integration:** Direct email sending of applications
3. **Calendar Integration:** Schedule interviews and reminders
4. **Advanced Analytics:** More detailed insights and reporting
5. **Mobile App:** Native mobile application
6. **Collaboration Features:** Share applications with mentors or career advisors
7. **Template Library:** Pre-built CV and cover letter templates
8. **Deployment:** Production deployment and hosting setup

## User-Provided API Keys

**Important:** This application uses user-provided API keys. Each user must add their own API keys in the app settings:

- **Gemini API Key (Required):** For AI features (CV analysis, cover letter generation, chat)
- **Apify API Token (Optional):** Only needed for LinkedIn profile synchronization

See [API_KEYS_SETUP.md](./API_KEYS_SETUP.md) for detailed instructions on how to get and set up your API keys.

## Setup & Running (Development)

1.  **Prerequisites:** Node.js (v18+ recommended), npm (v7+), MongoDB (Atlas account or local installation).
2.  **Clone:** `git clone <repository-url>`
3.  **Install Dependencies:** 
    - From root: `npm install` (installs workspace dependencies)
    - Or use: `npm run install:all`
4.  **Environment Configuration:**
    - Copy `env.example` from the root directory
    - **For Server:** Create `server/.env` and add:
      - `PORT=5001` (or another port)
      - `NODE_ENV=development`
      - `MONGODB_URI=<your_mongodb_connection_string>`
      - `JWT_SECRET=<your_strong_random_secret_string>` (generate with: `openssl rand -base64 32`)
      - `JWT_EXPIRY=1d` (optional, defaults to 1 day)
      - `GITHUB_TOKEN=<your_github_token>` (optional, for portfolio GitHub integration)
    - **For Client:** Create `client/.env` and add:
      - `VITE_API_BASE_URL=http://localhost:5001/api` (or your backend URL)
    - **Note:** API keys (Gemini, Apify) are managed per-user in the app settings, not in `.env` files.
5.  **Run Development Servers:** 
    - From root directory: `npm run dev`
    - This starts both backend (nodemon on port 5001) and frontend (Vite on port 5173)
6.  **Access Application:**
    - **Frontend:** `http://localhost:5173`
    - **Backend API:** `http://localhost:5001/api`
7.  **First Time Setup:**
    - Register a new account
    - Navigate to Settings page
    - Add your Gemini API key (required for AI features)
    - Optionally add Apify token (for LinkedIn integration)

## App Showcase

### Dashboard
The main dashboard provides a comprehensive view of all job applications with filtering, sorting, and quick actions.

![Dashboard](demo/screencapture-localhost-5173-dashboard-2025-11-17-00_39_35.png)

### Analytics Dashboard
Track your application progress with detailed statistics, charts, and a visual kanban pipeline.

![Analytics](demo/screencapture-localhost-5173-analytics-2025-11-17-00_41_33.png)

### CV Management
Upload, parse, and edit your CV with a rich editor that supports section-by-section editing and AI-powered analysis.

![CV Management](demo/screencapture-localhost-5173-manage-cv-2025-11-17-00_41_17.png)

### Portfolio Setup
Configure your professional portfolio with GitHub integration, LinkedIn sync, and project management.

![Portfolio Setup - Step 1](demo/screencapture-localhost-5173-portfolio-setup-2025-11-17-00_41_55.png)

![Portfolio Setup - Step 2](demo/screencapture-localhost-5173-portfolio-setup-2025-11-17-00_42_25.png)

![Portfolio Setup - Step 3](demo/screencapture-localhost-5173-portfolio-setup-2025-11-17-00_42_31.png)

![Portfolio Setup - Step 4](demo/screencapture-localhost-5173-portfolio-setup-2025-11-17-00_42_40.png)

### Public Portfolio
Share your professional portfolio with a clean, modern public page.

![Public Portfolio](demo/screencapture-localhost-5173-portfolio-a-a-com-2025-11-17-00_42_05.png)
