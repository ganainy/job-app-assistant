// client/src/pages/ReviewFinalizePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Import necessary hooks
import { getJobDraft, JobDraftData } from '../services/jobApi'; // Import API call and type

const ReviewFinalizePage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>(); // Get jobId from URL
    const navigate = useNavigate();

    // State for draft data
    const [draftData, setDraftData] = useState<JobDraftData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for editing (will be used later)
    const [editedCvJson, setEditedCvJson] = useState<any>(null); // Use 'any' for now
    const [editedCoverLetter, setEditedCoverLetter] = useState<string>('');

    // Fetch draft data on component mount
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
                if (response.generationStatus !== 'draft_ready' && response.generationStatus !== 'finalized') { // Allow finalized for viewing maybe? Or only draft_ready?
                    console.warn(`Job status is ${response.generationStatus}, expected draft_ready.`);
                    // Redirect back or show message if draft isn't ready?
                    // setError(`Draft documents are not ready for review for this job (Status: ${response.generationStatus}). Please generate them first.`);
                    // navigate('/dashboard'); // Option: redirect back
                }
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
    }, [jobId, navigate]); // Add navigate to dependency array if used inside useEffect

    // --- Placeholder Handlers for Save/Generate ---
    const handleSaveChanges = async () => {
        console.log("Saving changes...");
        // TODO: Implement PUT /api/jobs/:jobId/draft call
        alert("Save functionality not implemented yet.");
    };

    const handleGenerateFinalPdfs = async () => {
        console.log("Generating final PDFs...");
        // TODO: Implement POST /api/generator/:jobId/render-pdf call
        alert("Generate Final PDFs functionality not implemented yet.");
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

            {/* TODO: Add tabs or side-by-side layout for CV and Cover Letter */}

            {/* Section 1: CV Editor (Basic Preview for now) */}
            <div className="mb-8 p-4 border rounded shadow-sm">
                <h2 className="text-xl font-semibold mb-3">CV Content (JSON Preview)</h2>
                <p className='text-xs text-gray-500 mb-3'>Edit functionality coming soon. This is the AI-generated structure.</p>
                <pre className="text-xs whitespace-pre-wrap break-words overflow-auto max-h-96 bg-gray-100 p-3 rounded border">
                    {JSON.stringify(editedCvJson, null, 2)}
                </pre>
                {/* TODO: Replace <pre> with dynamic form editor */}
            </div>

            {/* Section 2: Cover Letter Editor */}
            <div className="mb-8 p-4 border rounded shadow-sm">
                <h2 className="text-xl font-semibold mb-3">Cover Letter Content</h2>
                <textarea
                    value={editedCoverLetter}
                    onChange={(e) => setEditedCoverLetter(e.target.value)}
                    rows={15}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                    placeholder="Cover letter text..."
                />
                {/* TODO: Consider replacing <textarea> with a Rich Text Editor */}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-6 border-t pt-4">
                <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                    // disabled={!isDirty || isSaving} // Need state to track changes and saving
                    title="Save current changes to draft"
                >
                    Save Draft (WIP)
                </button>
                <button
                    onClick={handleGenerateFinalPdfs}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    // disabled={isSaving || isRenderingPdf} // Need state to track rendering
                    title="Generate final PDF documents from the current draft"
                >
                    Generate Final PDFs (WIP)
                </button>
            </div>

        </div>
    );
};

export default ReviewFinalizePage;