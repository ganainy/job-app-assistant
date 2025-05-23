# Job Application Assistant (Work in Progress)

This web application assists users in managing their job applications by leveraging AI to streamline the creation of tailored CVs and cover letters.

## Core Features (Implemented)

- **User Authentication:** Secure registration and login using JWT.
- **Job Application Tracking:**
  - Manually add, edit, and delete job applications (Title, Company, Status, URL, Notes).
  - View all applications in a filterable and sortable dashboard table.
- **Automated Job Creation (from URL):**
  - Paste a job posting URL.
  - The backend fetches the page content.
  - AI (Google Gemini) extracts Job Title, Company Name, Description, Language, and Notes to automatically create a job entry.
- **CV Upload & AI Parsing:**
  - Upload CV (PDF, DOCX, RTF, TXT).
  - Backend uses AI (Google Gemini) to parse the content into the standard **JSON Resume schema** format.
  - Parsed JSON is stored associated with the user profile.
  - User can view the stored JSON on the "Manage CV" page (editing UI TBD).
- **AI-Powered Draft Generation:**
  - For a specific job application, trigger AI generation based on the user's stored JSON Resume CV and the job's description.
  - Select target language (English/German).
  - AI generates a tailored CV (JSON Resume format) and a cover letter draft.
  - AI automatically fills sender details and date in the cover letter using user's stored CV data.
  - **Placeholder Handling:** If AI cannot determine essential info (e.g., salary, start date), it inserts placeholders (`[[ASK_USER:...]]`). The backend detects these.
- **User Input for Placeholders:**
  - If placeholders are detected, the frontend presents a modal asking the user to provide the missing information.
  - Input types (text, number, date, textarea) are inferred based on the placeholder name.
- **Draft Storage:**
  - The generated (and potentially user-finalized via placeholder input) CV JSON and cover letter text are saved as drafts associated with the job application in the database.
- **Draft Retrieval:** Backend endpoint exists to fetch saved drafts for review.
- **PDF Generation & Download:**
  - Backend uses Puppeteer to render CVs (using an internal HTML template processing JSON Resume data) and cover letters into PDF files.
  - PDFs are saved temporarily on the server.
  - Backend endpoint allows downloading the generated temporary PDF files securely.
  - Frontend provides download links/buttons after successful final generation (triggered after review - _Review Page WIP_).

## Technology Stack

- **Frontend:** React, TypeScript, Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose
- **Authentication:** JWT (jsonwebtoken), bcryptjs
- **File Handling:** Multer
- **AI:** Google Generative AI SDK (`@google/generative-ai`)
- **PDF Generation:** Puppeteer
- **CV Schema:** JSON Resume ([https://jsonresume.org/](https://jsonresume.org/))

## Current Development Status

The core workflow from job creation (manual or URL), CV upload/parsing, initial AI draft generation (including placeholder handling), and draft storage is implemented. Basic PDF generation and download infrastructure exists but is currently triggered _after_ the planned review step. Frontend dashboard provides CRUD, filtering, and sorting.

## Next Steps (High Level)

1.  **Implement Frontend Review/Edit Page:** Build the UI for users to manually edit the `draftCvJson` (using a form editor) and `draftCoverLetterText` fetched from the backend.
2.  **Implement Draft Saving:** Connect the "Save Draft" button on the review page to the `PUT /api/jobs/:jobId/draft` backend endpoint.
3.  **Implement Final PDF Generation Trigger:** Create the `POST /api/generator/:jobId/render-pdf` backend endpoint and connect the "Generate Final PDFs" button on the review page to call it, handling the response to provide download links.
4.  **Implement AI-Assisted Editing (Refinement):** Add UI elements and backend logic (`/api/generator/refine-section`) to allow users to refine specific parts of the draft using AI prompts.
5.  **Implement ATS Checker:** Add backend logic and UI elements for the ATS analysis feature (integrated and standalone).
6.  **Frontend Polish:** Improve UI/UX with better styling, error handling (toasts), responsiveness, etc.
7.  **Analytics & Deployment.**

## Setup & Running (Development)

1.  **Prerequisites:** Node.js (v18+ recommended), npm (v7+), MongoDB (Atlas account or local installation).
2.  **Clone:** `git clone <repository-url>`
3.  **Install Root Dependencies:** `cd job-app-assistant && npm install`
4.  **Install Workspace Dependencies:** `npm run install:all` (or just `npm install` again from root)
5.  **Backend .env:**
    - Create `server/.env`.
    - Add `PORT=5001` (or another port).
    - Add `MONGODB_URI=<your_mongodb_connection_string>`.
    - Add `JWT_SECRET=<your_strong_random_secret_string>`.
    - Add `GEMINI_API_KEY=<your_google_ai_api_key>`.
6.  **Run Development Servers:** `npm run dev` (from the root `job-app-assistant` directory). This starts both backend (nodemon) and frontend (Vite).
7.  **Access Frontend:** Open browser to `http://localhost:5173` (or as indicated by Vite).
8.  **Access Backend API:** Base URL `http://localhost:5001/api`.
