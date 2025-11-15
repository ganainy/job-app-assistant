// client/src/components/analysis/FileUploadZone.tsx
import React from 'react';

interface FileUploadZoneProps {
    selectedFile: File | null;
    onFileSelect: (file: File) => void;
    onFileRemove: () => void;
    isDragging: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    disabled?: boolean;
    accept?: string;
    maxSize?: number; // in MB
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
    selectedFile,
    onFileSelect,
    onFileRemove,
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
    disabled = false,
    accept = '.pdf,.docx',
    maxSize = 10
}) => {
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const maxSizeBytes = maxSize * 1024 * 1024;
            
            if (file.size > maxSizeBytes) {
                alert(`File size exceeds ${maxSize}MB limit. Please select a smaller file.`);
                return;
            }
            
            onFileSelect(file);
        }
    };

    return (
        <div className="mb-4">
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`p-8 border-2 border-dashed rounded-lg transition-colors ${
                    isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="text-center">
                    <svg
                        className={`mx-auto h-12 w-12 mb-3 ${
                            isDragging
                                ? 'text-blue-500'
                                : 'text-gray-400 dark:text-gray-500'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                    <label
                        htmlFor="cvFileInput"
                        className={`cursor-pointer ${disabled ? 'pointer-events-none' : ''}`}
                    >
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                            Click to upload
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400"> or drag and drop</span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        PDF or DOCX (MAX. {maxSize}MB)
                    </p>
                    <input
                        type="file"
                        id="cvFileInput"
                        accept={accept}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={disabled}
                    />
                </div>
            </div>

            {selectedFile && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg
                                className="w-8 h-8 text-blue-600 dark:text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onFileRemove}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            disabled={disabled}
                            aria-label="Remove file"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploadZone;

