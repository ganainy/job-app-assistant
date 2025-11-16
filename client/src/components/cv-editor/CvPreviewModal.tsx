// client/src/components/cv-editor/CvPreviewModal.tsx
import React from 'react';

interface CvPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfBase64: string | null;
    isLoading?: boolean;
}

const CvPreviewModal: React.FC<CvPreviewModalProps> = ({
    isOpen,
    onClose,
    pdfBase64,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const pdfUrl = pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-7xl mx-4 sm:mx-0 max-h-[95vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        CV Preview (ATS-Compatible)
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400">Generating CV preview...</p>
                        </div>
                    </div>
                ) : pdfUrl ? (
                    <div className="flex-1 overflow-hidden border dark:border-gray-700 rounded-lg">
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full min-h-[700px]"
                            title="CV Preview"
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-gray-600 dark:text-gray-400">No preview available</p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CvPreviewModal;

