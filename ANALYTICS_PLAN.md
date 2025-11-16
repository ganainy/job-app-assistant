# Plan for Analytics Tab

This document outlines the plan to create a new "Analytics" tab in the application. This tab will provide users with statistics about their job hunt, tracking application progress and key metrics.

## Backend Development

1.  **Create Analytics Service:**
    *   Create a new file `server/src/services/analyticsService.ts`.
    *   This service will contain the core logic for fetching and processing analytics data from the database.
    *   It will query the `JobApplication` model to aggregate data.

2.  **Create Analytics Controller:**
    *   Create a new file `server/src/controllers/analyticsController.ts`.
    *   This controller will handle incoming HTTP requests for analytics data.
    *   It will have a function, `getJobApplicationStats`, which will use the `analyticsService` to get the data and send it back as a response.

3.  **Define Analytics Routes:**
    *   Create a new file `server/src/routes/analytics.ts`.
    *   Define a GET route (e.g., `/api/analytics/job-applications`) that points to the `getJobApplicationStats` function in the controller.
    *   Protect this route with the existing authentication middleware to ensure only logged-in users can access their stats.

4.  **Data Aggregation Logic (`analyticsService.ts`):**
    *   **Total Applications:** Count all job applications for the user.
    *   **Applications by Status:** Group applications by their `status` field (e.g., 'saved', 'applied', 'interviewing', 'rejected', 'offer') and count the number in each group.
    *   **Applications Over Time:** Group applications by their creation date and count the number of applications for each day.

## Frontend Development

1.  **Install Charting Library:**
    *   Add a charting library like `recharts` to the `client` project to visualize the data.
    *   Run `npm install recharts` in the `client` directory.

2.  **Create Analytics API Service:**
    *   Create a new file `client/src/services/analyticsApi.ts`.
    *   This service will have a function to fetch the job application statistics from the new backend endpoint.

3.  **Create Analytics Page:**
    *   Create a new page component `client/src/pages/AnalyticsPage.tsx`.
    *   This page will be the main container for all the analytics components.
    *   It will handle fetching the data using the `analyticsApi` service and manage loading/error states.

4.  **Add Navigation:**
    *   Update the main navigation component (likely in a shared layout component or `App.tsx`) to include a link to the new "Analytics" page.

5.  **Create Analytics Components:**
    *   Create a new folder `client/src/components/analytics`.
    *   **`StatsSummary.tsx`**: A component to display key metrics in cards (e.g., "Total Jobs Saved," "Applications Sent").
    *   **`ApplicationsByStatusChart.tsx`**: A component that uses the charting library (e.g., a Pie Chart from `recharts`) to display the distribution of applications by their status.
    *   **`ApplicationsOverTimeChart.tsx`**: A component that uses the charting library (e.g., a Bar Chart from `recharts`) to show the number of applications created each day.

6.  **Routing:**
    *   Add a new route in `client/src/App.tsx` for the `/analytics` path, which will render the `AnalyticsPage.tsx` component. This route should be protected to ensure only authenticated users can access it.

## Task Breakdown

1.  **Backend:**
    - [ ] Create `analyticsService.ts` with data aggregation logic.
    - [ ] Create `analyticsController.ts` to handle requests.
    - [ ] Create `analytics.ts` to define the API route.
    - [ ] Integrate the new route into the main server file (`server/src/index.ts`).
2.  **Frontend:**
    - [ ] Install `recharts`.
    - [ ] Create `analyticsApi.ts` to fetch data.
    - [ ] Create `AnalyticsPage.tsx`.
    - [ ] Create `StatsSummary.tsx`, `ApplicationsByStatusChart.tsx`, and `ApplicationsOverTimeChart.tsx` components.
    - [ ] Add the `/analytics` route in `App.tsx`.
    - [ ] Add a link to the "Analytics" page in the navigation.
