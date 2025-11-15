# Job Application Assistant - Project Structure and Capabilities

This document provides an overview of the Job Application Assistant project, detailing its structure, key components, and core capabilities.

## Project Overview

The Job Application Assistant is a full-stack web application designed to help users manage their job applications. It allows users to create and manage their CVs, analyze them against job descriptions, and track their applications. The project is built as a monorepo, with a React frontend and a Node.js/Express backend.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB (implied by Mongoose models)
- **AI:** Google Gemini
- **Deployment:** (Not specified, but could be containerized with Docker)

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

- **`src/components`**: Contains reusable components, including a comprehensive CV editor (`cv-editor`).
- **`src/pages`**: Each file corresponds to a major view in the application, such as `LoginPage`, `DashboardPage`, and `CVManagementPage`.
- **`src/services`**: Handles all HTTP requests to the backend API, abstracting the data fetching logic from the UI components.
- **`src/context`**: Manages global state, such as user authentication status.

### Server-Side (`server/`)

The server is a RESTful API built with Node.js, Express, and TypeScript.

- **`src/controllers`**: These files handle the incoming HTTP requests, validate data, and call the appropriate services.
- **`src/models`**: Defines the schemas for the MongoDB database collections (e.g., `User`, `JobApplication`).
- **`src/routes`**: Defines the API endpoints and maps them to the corresponding controller functions.
- **`src/services`**: Contains the core business logic of the application.
- **`src/utils`**: A collection of helper modules for specific tasks:
    - `aiExtractor.ts` & `geminiClient.ts`: Integration with Google Gemini for AI-powered features.
    - `pdfGenerator.ts`: Creates PDF documents from user data.
    - `scraper.ts`: Scrapes web pages, likely for job description data.
    - `analysis/scoringUtil.ts`: Provides utilities for analyzing and scoring CVs.

## Core Capabilities

- **User Authentication**: Secure user registration and login.
- **CV Management**: Users can create, edit, and store multiple versions of their CVs using a rich editor.
- **Job Application Tracking**: A dashboard to keep track of all job applications, their statuses, and related documents.
- **AI-Powered CV Analysis**: The application can analyze a user's CV against a job description to provide a compatibility score and suggestions for improvement.
- **PDF Generation**: Users can export their CVs as professionally formatted PDF documents.
- **Web Scraping**: The ability to fetch and process data from job postings online.
