// client/src/pages/ReviewFinalizePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
// Import NEW updateJobDraft function
import { getJobDraft, updateJobDraft, JobDraftData } from '../services/jobApi';
// Import types if needed for state
import { JsonResumeSchema } from '../../../server/src/types/jsonresume'; // Adjust path if needed

const ReviewFinalizePage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate(); // Keep navigate if used elsewhere, otherwise remove

    const [draftData, setDraftData] = useState<JobDraftData | null>(null); // Holds initial fetched data + job info
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for EDITED content
    const [editedCvJson, setEditedCvJson] = useState<JsonResumeSchema | any | null>(null); // Use specific type or any
    const [editedCoverLetter, setEditedCoverLetter] = useState<string>('');

    // State for actions
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isRenderingPdf, setIsRenderingPdf] = useState<boolean>(false); // For final generate button


    useEffect(() => {
        if (!jobId) {
            setError("Job ID not found in URL.");
            setIsLoading(false);
            return;
        }

        const fetchDraft = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getJobDraft(jobId);
                // Removed status check logic as per prompt
                setDraftData(response);
                // Initialize editing state with fetched data
                setEditedCvJson(response.draftCvJson || {}); // Default to empty object if null
                setEditedCoverLetter(response.draftCoverLetterText || ''); // Default to empty string
            } catch (err: any) {
                console.error("Failed to fetch job draft:", err);
                setError(err.message || "Failed to load draft data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDraft();
    }, [jobId]); // Removed navigate from dependency array as it's not used in the effect

    // --- IMPLEMENTED Save Draft Handler ---
    const handleSaveChanges = async () => {
        if (!jobId) return;
        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(null);
        setError(null); // Clear general errors

        try {
            const payload: { draftCvJson?: any, draftCoverLetterText?: string } = {};
            // Only include data if it has been potentially modified (or send both always)
            // For simplicity, let's send both current states
            payload.draftCvJson = editedCvJson;
            payload.draftCoverLetterText = editedCoverLetter;

            const response = await updateJobDraft(jobId, payload);
            setSaveSuccess(response.message); // Show success feedback
            // Optionally refetch draft data to confirm save, or just trust it
            // setDraftData(prev => ({ ...prev, draftCvJson: editedCvJson, draftCoverLetterText: editedCoverLetter })); // Optimistic update (careful)

        } catch (err: any) {
            console.error("Failed to save draft:", err);
            setSaveError(err.message || "Failed to save draft changes.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Placeholder Generate Final PDFs Handler ---
    const handleGenerateFinalPdfs = async () => {
        console.log("Generating final PDFs...");
        // Ensure draft is saved first? Or just use current state? Let's assume Save is separate for now.
        // If save isn't separate, call handleSaveChanges first and proceed only on success.

        // TODO: Implement POST /api/generator/:jobId/render-pdf call
        alert("Generate Final PDFs functionality not implemented yet.");
    };

    // --- Handler for CV JSON Editor (Basic - just for testing) ---
    // Replace this with actual form field handlers when building the editor
    const handleCvJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        try {
            const parsed = JSON.parse(event.target.value);
            setEditedCvJson(parsed);
            setSaveError(null); // Clear error if JSON becomes valid
            setSaveSuccess(null); // Clear success message on edit
        } catch (e) {
            console.error("Invalid JSON entered for CV");
            setSaveError("CV JSON is invalid. Please correct syntax.");
            // Optionally keep the invalid string in state for user correction?
            // setEditedCvJson(event.target.value); // Or keep the invalid string temporarily
        }
    };


    // --- Render Logic ---
    if (isLoading) {
        return <div className="text-center p-10">Loading draft data...</div>;
    }

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
                    <span className="font-medium">Error:</span> {error}
                </div>
                <Link to="/dashboard" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
            </div>
        );
    }

    if (!draftData) {
        return <div className="text-center p-10">No draft data loaded.</div>;
    }


    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Review & Edit Draft</h1>
                <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">← Back to Dashboard</Link>
            </div>
            <p className="text-sm text-gray-600 mb-1">For Job: <span className='font-medium'>{draftData.jobTitle}</span> at <span className='font-medium'>{draftData.companyName}</span></p>
            <p className="text-sm text-gray-500 mb-6">Status: <span className='font-medium'>{draftData.generationStatus}</span></p>

            {/* Display Save Success/Error */}
            {saveSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded border border-green-300">{saveSuccess}</div>}
            {saveError && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300">{saveError}</div>}

            {/* --- CV Editor Section --- */}
            <div className="mb-8 p-4 border rounded shadow-sm bg-white">
                <h2 className="text-xl font-semibold mb-3">CV Content (JSON Resume Format)</h2>
                <p className='text-xs text-gray-500 mb-3'>Edit the JSON below. Ensure it remains valid JSON and follows the JSON Resume schema. A form-based editor will be added later.</p>
                {/* Temporary JSON editor */}
                <textarea
                    value={JSON.stringify(editedCvJson, null, 2)} // Display stringified JSON
                    onChange={handleCvJsonChange} // Use specific handler for JSON parsing
                    rows={20}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-mono"
                    placeholder="CV JSON data..."
                    spellCheck="false"
                />
            </div>

            {/* --- Cover Letter Editor Section --- */}
            <div className="mb-8 p-4 border rounded shadow-sm bg-white">
                <h2 className="text-xl font-semibold mb-3">Cover Letter Content</h2>
                {/* Use a simple textarea for now */}
                <textarea
                    value={editedCoverLetter}
                    onChange={(e) => { setEditedCoverLetter(e.target.value); setSaveSuccess(null); }} // Update state, clear success message
                    rows={15}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" // Removed font-mono maybe
                    placeholder="Cover letter text..."
                />
                {/* TODO: Replace <textarea> with a Rich Text Editor */}
            </div>

            {/* --- Action Buttons --- */}
            <div className="flex justify-end gap-4 mt-6 border-t pt-4">
                <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSaving || isRenderingPdf || !!saveError} // Disable while saving, rendering, or if CV JSON is invalid
                    title="Save current changes to draft"
                >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                    onClick={handleGenerateFinalPdfs}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    disabled={isSaving || isRenderingPdf || !!saveError} // Disable while saving, rendering, or if CV JSON is invalid
                    title="Generate final PDF documents from the LATEST SAVED draft"
                >
                    {isRenderingPdf ? 'Generating PDFs...' : 'Generate Final PDFs'}
                </button>
            </div>
        </div>
    );
};

export default ReviewFinalizePage;