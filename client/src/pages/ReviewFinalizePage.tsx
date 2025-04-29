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
            // Assuming generatedCv and generatedCoverLetter are the fields holding the editable data
            // The backend might store this differently, ensure these fields exist on the JobApplication type from jobApi.ts
            // If not, adjust how cvData and coverLetterText are initialized (e.g., fetch separately or use different fields)
            setCvData((data as any).generatedCv || data.draftCvJson || null); // Prioritize generatedCv if exists, fallback to draft
            setCoverLetterText((data as any).generatedCoverLetter || data.draftCoverLetterText || ''); // Prioritize generatedCoverLetter, fallback to draft
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

    // Fix 2: Implement download using getDownloadUrl
    const handleDownload = (filename: string | null) => {
        if (!filename) return;
        try {
            const url = getDownloadUrl(filename);
            const link = document.createElement('a');
            link.href = url;
            // Optional: Set a more user-friendly download name
            // link.download = filename.split('_').slice(1).join('_') || filename;
            link.target = '_blank'; // Open in new tab might be better for direct downloads
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) { // Fix 6: Add type to err
            console.error("Download failed:", err);
            alert(`Failed to initiate download for ${filename}: ${err.message}`);
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