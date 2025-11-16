# Plan: AI-Powered CV Section Analysis and Improvement

This document outlines the plan to implement an "AI Fix" feature on the CV Management page. This feature will analyze individual sections of a user's CV, provide feedback on areas for improvement, and offer an AI-powered one-click fix.

## 1. Project Goal

The objective is to enhance the CV editor by adding real-time, section-level feedback. For each part of the CV (e.g., Work, Education, Skills), the system will:
1.  Automatically display an analysis of what can be improved.
2.  Show an icon and a feedback message next to sections that need attention.
3.  Provide an "AI Fix" button that, when clicked, rewrites and improves the content of that specific section using Gemini.

## 2. Backend Development

Two new endpoints are required: one for analyzing a section and one for improving it.

### Step 2.1: CV Section Analysis Endpoint

This endpoint will evaluate a single CV section and return structured feedback.

-   **Route:** `POST /api/analysis/cv-section`
-   **Controller:** A new function `analyzeCvSection` in `server/src/controllers/analysisController.ts`.
-   **Service:** A new function `getSectionAnalysis` in `server/src/services/analysisService.ts`.
-   **Request Body:**
    ```json
    {
      "sectionName": "work", // e.g., "work", "education", "skills"
      "sectionData": { ... } // The JSON object for a single work entry, education entry, etc.
    }
    ```
-   **AI Prompting Logic (`analysisService.ts`):**
    -   The service will send a prompt to Gemini, instructing it to act as a professional CV reviewer.
    -   The prompt will contain the `sectionData` and ask the AI to score it and provide concise, actionable feedback.
    -   **Crucially, the AI will be instructed to return a JSON object with a specific structure.**
-   **Response Body (from the API):**
    ```json
    {
      "needsImprovement": true,
      "feedback": "The description for this role lacks quantifiable achievements. Use action verbs and add metrics to show impact (e.g., 'Increased sales by 20%')."
    }
    ```

### Step 2.2: CV Section Improvement Endpoint

This endpoint will take a CV section's data and use AI to rewrite it.

-   **Route:** `POST /api/generator/improve-section`
-   **Controller:** A new function `improveCvSection` in a new `server/src/controllers/generatorController.ts`.
-   **Service:** A new function `improveSectionWithAi` in a new `server/src/services/generatorService.ts`.
-   **Request Body:**
    ```json
    {
      "sectionName": "work",
      "sectionData": { ... } // The original section data from the frontend
    }
    ```
-   **AI Prompting Logic (`generatorService.ts`):**
    -   The service will prompt Gemini to act as a CV writing expert.
    -   The prompt will include the `sectionData` and instruct the AI to rewrite it, focusing on using strong action verbs, quantifying results, and adhering to modern CV standards.
    -   The AI will be instructed to return the improved data in the **exact same JSON structure** as the input `sectionData`.
-   **Response Body (from the API):**
    -   The response will be the rewritten `sectionData` object.
    ```json
    {
        "company": "Example Inc.",
        "position": "Software Developer",
        "summary": "Redesigned the main dashboard, leading to a 20% increase in user engagement and a 15% reduction in load times.",
        "highlights": [
            "Engineered and launched a new real-time analytics feature used by over 10,000 daily active users.",
            "Optimized database queries, decreasing average API response time from 250ms to 80ms."
        ]
    }
    ```

## 3. Frontend Development

The frontend will manage fetching analyses, displaying feedback, and handling the "AI Fix" user interaction.

### Step 3.1: API Service Updates

-   **File:** `client/src/services/analysisApi.ts`
    -   Add a new function: `fetchSectionAnalysis(sectionName, sectionData)`.
-   **File:** `client/src/services/generatorApi.ts`
    -   Add a new function: `improveSection(sectionName, sectionData)`.

### Step 3.2: New Component: `SectionAnalysisPanel.tsx`

This will be a reusable component to display the feedback and the fix button.

-   **File:** `client/src/components/cv-editor/SectionAnalysisPanel.tsx`
-   **Props:**
    -   `analysis`: The analysis object (`{ needsImprovement, feedback }`).
    -   `onImprove`: A function to call when the "AI Fix" button is clicked.
    -   `isLoading`: A boolean to show a loading state during the fix.
-   **UI/UX:**
    -   If `analysis.needsImprovement` is `false`, the component renders nothing.
    -   If `true`, it displays a small warning/idea icon.
    -   The `feedback` text is shown next to the icon.
    -   An "AI Fix" or "Improve with AI" button is displayed. Clicking it will trigger the `onImprove` prop and show a loading spinner.

### Step 3.3: Integration with CV Editor Components

The core logic will be in the parent `CVManagementPage`, but the UI will be integrated into each editor section.

-   **Files to Modify:** `WorkExperienceEditor.tsx`, `EducationEditor.tsx`, `SkillsEditor.tsx`, etc.
-   **Logic:**
    1.  Each editor component will receive its corresponding analysis result as a prop from `CVManagementPage`.
    2.  Each editor will render the `<SectionAnalysisPanel />` component, passing the analysis data and a handler for the `onImprove` event.

### Step 3.4: Update `CVManagementPage.tsx`

This page will orchestrate the entire feature.

-   **State Management:**
    -   Add a new state to hold the analysis results for the entire CV: `const [analyses, setAnalyses] = useState<Record<string, AnalysisResult[]>>({});`. The key would be the section name (e.g., "work"), and the value would be an array of analysis results, one for each item in that section.
    -   Add a loading state for when the initial analysis is running.
-   **Workflow:**
    1.  **On Page Load:** When the user's `cvJson` is fetched, trigger a new function, `runFullCvAnalysis`.
    2.  **`runFullCvAnalysis` Function:**
        -   This function will iterate through each section of the `cvJson` (e.g., each job in `work`, each school in `education`).
        -   For each item, it will call the `fetchSectionAnalysis` API function.
        -   The results will be collected and stored in the `analyses` state object.
    3.  **Passing Props:** The page will pass the relevant analysis results from the `analyses` state down to each CV editor component (e.g., `WorkExperienceEditor` receives `analyses.work`).
    4.  **Handling Improvements:** The page will contain the `handleImproveSection` function. This function will be passed down to the editor components. When called, it will:
        -   Call the `improveSection` API service.
        -   On success, it will update the main `cvJson` state with the new, improved section data returned by the API.
        -   This state update will cause the UI to re-render, showing the improved text.
        -   After the update, it should re-run the analysis for that specific section to update the feedback.

## 4. Task Breakdown

-   [ ] **Backend:**
    -   [ ] **Analysis:**
        -   [ ] Create `getSectionAnalysis` in `analysisService.ts` with Gemini prompting.
        -   [ ] Create `analyzeCvSection` in `analysisController.ts`.
        -   [ ] Add `POST /api/analysis/cv-section` route.
    -   [ ] **Improvement:**
        -   [ ] Create `generatorService.ts` and `generatorController.ts`.
        -   [ ] Create `improveSectionWithAi` in `generatorService.ts` with Gemini prompting.
        -   [ ] Create `improveCvSection` in `generatorController.ts`.
        -   [ ] Add `POST /api/generator/improve-section` route.
-   [ ] **Frontend:**
    -   [ ] **API:**
        -   [ ] Add `fetchSectionAnalysis` to `analysisApi.ts`.
        -   [ ] Add `improveSection` to `generatorApi.ts`.
    -   [ ] **Component:**
        -   [ ] Create `SectionAnalysisPanel.tsx`.
    -   [ ] **Integration:**
        -   [ ] Add state and analysis logic to `CVManagementPage.tsx`.
        -   [ ] Modify `WorkExperienceEditor.tsx` (and others) to accept and render the `SectionAnalysisPanel`.
        -   [ ] Wire up the `onImprove` event handlers to update the main CV state.
