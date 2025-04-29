// client/src/pages/CVManagementPage.tsx
import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
// Fix: Import updateCurrentCv
import { uploadCV, getCurrentCv, updateCurrentCv } from '../services/cvApi'; // Import API functions
import { useAuth } from '../context/AuthContext'; // To ensure user is logged in
// Fix: Import CvFormEditor and JsonResumeSchema
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume'; // Adjust path as needed

// Fix: Use JsonResumeSchema type for currentCvData
const CVManagementPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  // Fix: Use JsonResumeSchema type
  const [currentCvData, setCurrentCvData] = useState<JsonResumeSchema | null>(null);
  const [isLoadingCv, setIsLoadingCv] = useState<boolean>(true);
  const { isAuthenticated } = useAuth(); // Needed? Page is protected route
  // Fix: Add state for saving
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);


  // Fetch current CV on mount
  useEffect(() => {
    const fetchCv = async () => {
      setIsLoadingCv(true);
      try {
        const response = await getCurrentCv();
        // Fix: Ensure response.cvData is treated as JsonResumeSchema or null
        setCurrentCvData(response.cvData || null);
      } catch (error: any) {
        console.error("Error fetching current CV:", error);
        // Handle error display if needed
      } finally {
        setIsLoadingCv(false);
      }
    };
    fetchCv();
  }, []); // Run once on mount


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null); // Clear errors when new file selected
      setUploadSuccess(null);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF or RTF file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const response = await uploadCV(selectedFile);
      setUploadSuccess(response.message);
      // Fix: Ensure response.cvData is treated as JsonResumeSchema or null
      setCurrentCvData(response.cvData || null); // Update displayed CV
      setSelectedFile(null); // Clear file input maybe? Or keep it? Depends on UX preference
      // Clear the file input visually (a bit tricky with controlled inputs)
      const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setSaveError(null); // Clear save errors on successful upload
      setSaveSuccess(null);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Failed to upload CV. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Fix: Add handler for CV editor changes
  const handleCvChange = (updatedCv: JsonResumeSchema) => {
    setCurrentCvData(updatedCv);
    setSaveError(null); // Clear save error when user starts editing again
    setSaveSuccess(null);
  };

  // Fix: Add handler to save edited CV
  const handleSaveCv = async () => {
    if (!currentCvData) {
      setSaveError("No CV data to save.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const response = await updateCurrentCv(currentCvData);
      setSaveSuccess(response.message || "CV updated successfully!");
      // Optionally re-fetch or assume the state is now the source of truth
      // setCurrentCvData(response.cvData); // If API returns updated data
    } catch (error: any) {
      console.error("Error saving CV:", error);
      setSaveError(error.message || "Failed to save CV changes.");
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Manage Your CV</h1>

      <p className="mb-4 text-gray-600">
        Upload your CV in PDF or RTF format. We will use AI to parse it into a structured format
        for generating tailored applications. Uploading a new CV will replace the existing one.
      </p>

      {/* ... existing upload form ... */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 border rounded-lg shadow-sm bg-white">
        <div className="mb-4">
          <label htmlFor="cvFileInput" className="block text-sm font-medium text-gray-700 mb-2">
            Select CV File (PDF or RTF)
          </label>
          <input
            type="file"
            id="cvFileInput"
            accept=".pdf,.rtf,application/pdf,application/rtf,text/rtf" // Specify accepted types
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            disabled={isUploading}
          />
          {selectedFile && <p className="text-xs text-gray-500 mt-1">Selected: {selectedFile.name}</p>}
        </div>

        {uploadError && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300">{uploadError}</div>}
        {uploadSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded border border-green-300">{uploadSuccess}</div>}

        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading...' : 'Upload and Process CV'}
        </button>
      </form>

      <hr className="my-6" />

      <h2 className="text-2xl font-semibold mb-4">Current Processed CV Data</h2>
      {isLoadingCv ? (
        <p>Loading current CV data...</p>
      ) : currentCvData ? (
        <div className="space-y-6">
          {/* JSON Preview (Optional, maybe collapsible) */}
          <details className="p-4 bg-gray-50 rounded border border-gray-200">
            <summary className="text-lg font-medium mb-2 cursor-pointer">Preview Raw JSON Data</summary>
            <pre className="text-xs whitespace-pre-wrap break-words overflow-auto max-h-96 bg-gray-100 p-3 rounded mt-2">
              {JSON.stringify(currentCvData, null, 2)}
            </pre>
          </details>

          {/* CV Editor */}
          <div className="p-4 border rounded shadow-sm bg-white">
            <h3 className="text-xl font-semibold mb-4">Edit CV Data</h3>
            <CvFormEditor data={currentCvData} onChange={handleCvChange} />

            {/* Save Button and Messages */}
            <div className="mt-6 flex flex-col items-start space-y-3">
              {saveError && <div className="p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300 w-full">{saveError}</div>}
              {saveSuccess && <div className="p-3 bg-green-100 text-green-700 text-sm rounded border border-green-300 w-full">{saveSuccess}</div>}
              <button
                type="button"
                onClick={handleSaveCv}
                disabled={isSaving || isUploading}
                className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving Changes...' : 'Save CV Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p>No CV data found. Please upload your CV.</p>
      )}
    </div>
  );
};

export default CVManagementPage;