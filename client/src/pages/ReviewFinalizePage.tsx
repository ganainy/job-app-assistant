// client/src/pages/ReviewFinalizePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // Removed useNavigate as it wasn't used after previous changes
import { getJobDraft, updateJobDraft, JobDraftData } from '../services/jobApi';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume'; // Adjust path if needed
import CvFormEditor from '../components/cv-editor/CvFormEditor'; // Import the new editor

const ReviewFinalizePage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    // const navigate = useNavigate(); // Removed

    const [draftData, setDraftData] = useState<JobDraftData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for EDITED content - editedCvJson is now managed via CvFormEditor's onChange
    const [editedCvJson, setEditedCvJson] = useState<JsonResumeSchema | any | null>(null);
    const [editedCoverLetter, setEditedCoverLetter] = useState<string>('');

    // State for actions
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isRenderingPdf, setIsRenderingPdf] = useState<boolean>(false);


    useEffect(() => {
        if (!jobId) {
            setError("Job ID not found in URL.");
            setIsLoading(false);
            return;
        }

        const fetchDraft = async () => {
            setIsLoading(true);
            setError(null);
            setSaveSuccess(null); // Clear messages on load
            setSaveError(null);
            try {
                const response = await getJobDraft(jobId);
                setDraftData(response);
                // Initialize editing state with fetched data
                // Ensure we have a valid object, even if draftCvJson is null/undefined
                setEditedCvJson(response.draftCvJson || {});
                setEditedCoverLetter(response.draftCoverLetterText || '');
            } catch (err: any) {
                console.error("Failed to fetch job draft:", err);
                setError(err.message || "Failed to load draft data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDraft();
    }, [jobId]);

    // --- Save Draft Handler ---
    const handleSaveChanges = async () => {
        if (!jobId || !editedCvJson) return; // Ensure cv json state is loaded
        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(null);
        setError(null);

        try {
            // Payload uses the current state, which is updated by CvFormEditor's onChange
            const payload: { draftCvJson?: any, draftCoverLetterText?: string } = {
                draftCvJson: editedCvJson,
                draftCoverLetterText: editedCoverLetter
            };

            const response = await updateJobDraft(jobId, payload);
            setSaveSuccess(response.message);

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
        setIsRenderingPdf(true); // Use the state setter
        // TODO: Implement POST /api/generator/:jobId/render-pdf call
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
        alert("Generate Final PDFs functionality not implemented yet.");
        setIsRenderingPdf(false); // Reset the state setter
        // Consider adding logic to ensure latest changes are saved first, or disable if unsaved changes exist.
    };

    // --- CV JSON Editor Handler (No longer needed) ---
    // const handleCvJsonChange = ... // REMOVED

    // --- Cover Letter Change Handler ---
    const handleCoverLetterChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedCoverLetter(event.target.value);
        setSaveSuccess(null); // Clear success message on edit
        setSaveError(null); // Clear save error on edit
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

    if (!draftData || editedCvJson === null) { // Check editedCvJson is initialized
        return <div className="text-center p-10">No draft data loaded or initializing editor...</div>;
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
                {/* Replace textarea with the new form editor */}
                <CvFormEditor
                    data={editedCvJson}
                    onChange={(updatedCvJson) => {
                        setEditedCvJson(updatedCvJson);
                        setSaveSuccess(null); // Clear success message on edit
                        setSaveError(null); // Clear save error on edit
                    }}
                />
                {/* Removed old textarea and related elements */}
            </div>

            {/* --- Cover Letter Editor Section --- */}
            <div className="mb-8 p-4 border rounded shadow-sm bg-white">
                <h2 className="text-xl font-semibold mb-3">Cover Letter Content</h2>
                <textarea
                    value={editedCoverLetter}
                    onChange={handleCoverLetterChange} // Use specific handler
                    rows={15}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Cover letter text..."
                />
            </div>

            {/* --- Action Buttons --- */}
            <div className="flex justify-end gap-4 mt-6 border-t pt-4">
                <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSaving || isRenderingPdf} // Removed saveError check here as it's handled by direct form updates now
                    title="Save current changes to draft"
                >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                    onClick={handleGenerateFinalPdfs}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    disabled={isSaving || isRenderingPdf} // Removed saveError check
                    title="Generate final PDF documents from the LATEST SAVED draft"
                >
                    {isRenderingPdf ? 'Generating PDFs...' : 'Generate Final PDFs'}
                </button>
            </div>
        </div>
    );
};

export default ReviewFinalizePage;