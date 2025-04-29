// client/src/pages/ReviewFinalizePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Fix 1 & 3: Correct import names and import JobApplication from the service
import { getJobById, updateJob, JobApplication } from '../services/jobApi';
// Fix 2: Import getDownloadUrl instead of non-existent downloadFile
import { renderFinalPdfs, getDownloadUrl } from '../services/generatorApi';
// Fix 4: Import JsonResumeSchema instead of Resume
import { JsonResumeSchema } from '../../../server/src/types/jsonresume'; // Adjust path as needed
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import axios from 'axios'; // Import axios

const ReviewFinalizePage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [jobApplication, setJobApplication] = useState<JobApplication | null>(null);
    // Fix 4: Use JsonResumeSchema type
    const [cvData, setCvData] = useState<JsonResumeSchema | null>(null);
    const [coverLetterText, setCoverLetterText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isRenderingPdf, setIsRenderingPdf] = useState<boolean>(false);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [finalPdfFiles, setFinalPdfFiles] = useState<{ cv: string | null, cl: string | null }>({ cv: null, cl: null });

    const fetchJobData = useCallback(async () => {
        if (!jobId) return;
        setIsLoading(true);
        setFetchError(null);
        try {
            // Fix 1: Use getJobById
            const data = await getJobById(jobId);
            setJobApplication(data);
            // Correctly load draft data from the JobApplication object
            setCvData(data.draftCvJson || null); // Use draftCvJson
            setCoverLetterText(data.draftCoverLetterText || ''); // Use draftCoverLetterText

            // Check for existing final PDF filenames and set state
            if (data.generatedCvFilename || data.generatedCoverLetterFilename) {
                setFinalPdfFiles({
                    cv: data.generatedCvFilename || null,
                    cl: data.generatedCoverLetterFilename || null
                });
                console.log("Found existing PDF filenames:", { cv: data.generatedCvFilename, cl: data.generatedCoverLetterFilename });
            }

        } catch (error: any) {
            console.error("Error fetching job application:", error);
            setFetchError(error.message || 'Failed to fetch job details.');
        } finally {
            setIsLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        fetchJobData();
    }, [fetchJobData]);

    // Fix 4: Use JsonResumeSchema type
    const handleCvChange = (updatedCv: JsonResumeSchema) => {
        setCvData(updatedCv);
    };

    const handleCoverLetterChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCoverLetterText(event.target.value);
    };

    const handleSaveChanges = async () => {
        // Fix 1: Use updateJob
        // Ensure the payload matches UpdateJobPayload from jobApi.ts
        if (!jobId || !jobApplication || !cvData) return false;

        setIsSaving(true);
        setSaveError(null);
        try {
            // Construct payload based on UpdateJobPayload requirements
            const updatePayload = {
                // Only include fields that are meant to be updated here
                // Using draft fields as per jobApi.ts UpdateJobPayload
                draftCvJson: cvData,
                draftCoverLetterText: coverLetterText,
                // You might want to update other fields like notes, status etc.
                // status: jobApplication.status, // Example if status needs update
            };

            await updateJob(jobId, updatePayload);
            console.log("Changes saved successfully");
            // Optionally update local state if needed, though re-fetch might be safer
            setJobApplication(prev => prev ? { ...prev, ...updatePayload } : null);
            return true;
        } catch (error: any) {
            console.error("Error saving changes:", error);
            setSaveError(error.message || 'Failed to save changes.');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateFinalPdfs = async () => {
        if (!jobId) return;

        setIsRenderingPdf(true);
        setRenderError(null);
        setFinalPdfFiles({ cv: null, cl: null }); // Clear previous files

        try {
            // Save latest changes before rendering
            const saveSuccess = await handleSaveChanges();
            // Check if saving failed before proceeding
            if (!saveSuccess) {
                // Error is already set by handleSaveChanges
                throw new Error(`Cannot generate PDFs: Failed to save changes first.`);
            }

            const result = await renderFinalPdfs(jobId);
            setFinalPdfFiles({ cv: result.cvFilename, cl: result.coverLetterFilename });
            // Optionally show a success message
            console.log("PDFs generated successfully:", result);

        } catch (error: any) {
            console.error("Error generating final PDFs:", error);
            // Don't overwrite save error if that was the cause
            if (!saveError) {
                setRenderError(error.message || 'Failed to generate final PDFs.');
            }
        } finally {
            setIsRenderingPdf(false);
        }
    };

    // Fix 2 & Auth Fix: Implement download using axios to fetch blob and open in new tab
    const handleDownload = async (filename: string | null) => { // Make async
        if (!filename) return;
        try {
            const url = getDownloadUrl(filename);
            // Fetch the file using axios, ensuring auth headers are sent
            const response = await axios.get(url, {
                responseType: 'blob', // Important: response type is blob
                // Axios instance should be configured with interceptors to add auth token
            });

            const fileBlob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' }); // Use content-type from header
            const blobUrl = URL.createObjectURL(fileBlob);

            // Open the blob URL in a new tab
            window.open(blobUrl, '_blank');

            // Optional: Revoke the object URL after a delay or when no longer needed
            // URL.revokeObjectURL(blobUrl); // Be careful with timing if the new tab needs it

        } catch (err: any) { // Fix 6: Add type to err
            console.error("Download failed:", err);
            // Provide more specific error feedback
            const errorMessage = axios.isAxiosError(err) && err.response?.data instanceof Blob
                ? "Failed to fetch file data." // If response is blob, it's likely not a JSON error message
                : err.response?.data?.message || err.message || 'An unknown error occurred during download.';
            alert(`Failed to download ${filename}: ${errorMessage}`);
        }
    };


    if (isLoading) return <div className="text-center p-4">Loading job details...</div>;
    if (fetchError) return <div className="text-center p-4 text-red-600">Error: {fetchError}</div>;
    if (!jobApplication || !cvData) return <div className="text-center p-4">Job application data not found.</div>;


    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Review and Finalize: {jobApplication.jobTitle} at {jobApplication.companyName}</h1>

            {/* CV Editor Section */}
            <div className="mb-6 p-4 border rounded shadow-sm bg-white">
                <h2 className="text-xl font-semibold mb-3">Edit CV</h2>
                {/* Fix 5: Use data prop instead of initialData */}
                {cvData ? (
                    <CvFormEditor data={cvData} onChange={handleCvChange} />
                ) : (
                    <div>Loading CV data...</div>
                )}
            </div>

            {/* Cover Letter Editor Section */}
            <div className="mb-6 p-4 border rounded shadow-sm bg-white">
                <h2 className="text-xl font-semibold mb-3">Edit Cover Letter</h2>
                <textarea
                    value={coverLetterText}
                    onChange={handleCoverLetterChange}
                    className="w-full h-64 p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Edit your cover letter here..."
                />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 p-4 border rounded shadow-sm bg-white flex flex-col items-start space-y-4">
                {saveError && <p className="text-red-500">Save Error: {saveError}</p>}
                <button
                    onClick={handleSaveChanges}
                    disabled={isSaving || isRenderingPdf} // Disable if saving or rendering
                    className={`px-4 py-2 rounded text-white font-semibold ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50`}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>

                {renderError && <p className="text-red-500">Render Error: {renderError}</p>}
                <button
                    onClick={handleGenerateFinalPdfs}
                    disabled={isRenderingPdf || isSaving} // Disable if rendering or saving
                    className={`px-4 py-2 rounded text-white font-semibold ${isRenderingPdf ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50`}
                >
                    {isRenderingPdf ? 'Generating PDFs...' : 'Generate Final PDFs'}
                </button>

                {/* Download Links/Buttons */}
                <div className="mt-4 space-y-2">
                    {finalPdfFiles.cv && (
                        <button
                            onClick={() => handleDownload(finalPdfFiles.cv)}
                            className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                        >
                            Download Final CV
                        </button>
                    )}
                    {finalPdfFiles.cl && (
                        <button
                            onClick={() => handleDownload(finalPdfFiles.cl)}
                            className="px-4 py-2 rounded text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                        >
                            Download Final Cover Letter
                        </button>
                    )}
                </div>
            </div>


            {/* Button to go back */}
            <button
                onClick={() => navigate('/dashboard')} // Or navigate(-1)
                className="mt-6 px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default ReviewFinalizePage;