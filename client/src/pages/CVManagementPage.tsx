// client/src/pages/CVManagementPage.tsx
import React, { useState, ChangeEvent, FormEvent, useEffect, useRef, useMemo } from 'react';
import { uploadCV, getCurrentCv, updateCurrentCv } from '../services/cvApi';
import CvFormEditor from '../components/cv-editor/CvFormEditor';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import Toast from '../components/common/Toast';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const CVManagementPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentCvData, setCurrentCvData] = useState<JsonResumeSchema | null>(null);
  const [isLoadingCv, setIsLoadingCv] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Track original CV data for unsaved changes detection
  const originalCvDataRef = useRef<JsonResumeSchema | null>(null);


  // Calculate unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!currentCvData || !originalCvDataRef.current) return false;
    return JSON.stringify(currentCvData) !== JSON.stringify(originalCvDataRef.current);
  }, [currentCvData]);

  // Fetch current CV on mount
  useEffect(() => {
    const fetchCv = async () => {
      setIsLoadingCv(true);
      try {
        const response = await getCurrentCv();
        const cvData = response.cvData || null;
        setCurrentCvData(cvData);
        originalCvDataRef.current = cvData ? JSON.parse(JSON.stringify(cvData)) : null;
      } catch (error: any) {
        console.error("Error fetching current CV:", error);
        setToast({ message: error.message || 'Failed to load CV data.', type: 'error' });
      } finally {
        setIsLoadingCv(false);
      }
    };
    fetchCv();
  }, []);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Validate file type
      const validTypes = ['application/pdf', 'application/rtf', 'text/rtf'];
      const validExtensions = ['.pdf', '.rtf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        setToast({ message: 'Please select a valid PDF or RTF file.', type: 'error' });
        return;
      }
      
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      const validTypes = ['application/pdf', 'application/rtf', 'text/rtf'];
      const validExtensions = ['.pdf', '.rtf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        setToast({ message: 'Please drop a valid PDF or RTF file.', type: 'error' });
        return;
      }
      
      setSelectedFile(file);
      // Update the file input
      const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
      if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setToast({ message: 'Please select a PDF or RTF file to upload.', type: 'error' });
      return;
    }

    setIsUploading(true);

    try {
      const response = await uploadCV(selectedFile);
      const cvData = response.cvData || null;
      setCurrentCvData(cvData);
      originalCvDataRef.current = cvData ? JSON.parse(JSON.stringify(cvData)) : null;
      setSelectedFile(null);
      const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setToast({ message: response.message || 'CV uploaded and processed successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Upload failed:', error);
      setToast({ message: error.message || 'Failed to upload CV. Please try again.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCvChange = (updatedCv: JsonResumeSchema) => {
    setCurrentCvData(updatedCv);
  };

  const handleSaveCv = async () => {
    if (!currentCvData) {
      setToast({ message: 'No CV data to save.', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const response = await updateCurrentCv(currentCvData);
      originalCvDataRef.current = JSON.parse(JSON.stringify(currentCvData));
      setToast({ message: response.message || 'CV updated successfully!', type: 'success' });
    } catch (error: any) {
      console.error("Error saving CV:", error);
      setToast({ message: error.message || 'Failed to save CV changes.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };


  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-4 pb-24">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Manage Your CV</h1>

      {/* Upload Section */}
      <div className="mb-8 p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Upload CV</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload your CV in PDF or RTF format. We will use AI to parse it into a structured format.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mb-4 p-6 border-2 border-dashed rounded-lg transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50'
            }`}
          >
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <label htmlFor="cvFileInput" className="cursor-pointer">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  Click to upload
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400"> or drag and drop</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF or RTF (MAX. 10MB)</p>
              <input
                type="file"
                id="cvFileInput"
                accept=".pdf,.rtf,application/pdf,application/rtf,text/rtf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>

          {selectedFile && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    const fileInput = document.getElementById('cvFileInput') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  disabled={isUploading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full md:w-auto px-5 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading and Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload and Process CV
              </>
            )}
          </button>
        </form>
      </div>

      {/* Editor Section */}
      <div className="p-6 border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit CV Data</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review and edit your parsed CV data. Changes are saved automatically when you click Save.
            </p>
          </div>
        </div>

        {isLoadingCv ? (
          <div className="space-y-4">
            <LoadingSkeleton lines={3} />
            <LoadingSkeleton lines={3} />
            <LoadingSkeleton lines={3} />
          </div>
        ) : currentCvData ? (
          <div className="space-y-6">
            {/* JSON Preview */}
            <details className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="text-sm font-medium cursor-pointer text-gray-900 dark:text-gray-200 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Preview Raw JSON Data
              </summary>
              <pre className="text-xs whitespace-pre-wrap break-words overflow-auto max-h-96 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded mt-2">
                {JSON.stringify(currentCvData, null, 2)}
              </pre>
            </details>

            {/* CV Editor */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <CvFormEditor data={currentCvData} onChange={handleCvChange} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No CV data found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload your CV above to get started. We'll parse it and make it editable.
            </p>
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      {currentCvData && hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span>Unsaved changes</span>
            </div>
            <button
              onClick={handleSaveCv}
              disabled={isSaving || isUploading}
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default CVManagementPage;