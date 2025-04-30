// client/src/pages/AnalysisPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { uploadCvForAnalysis, getAnalysis, AnalysisResult } from '../services/analysisApi'; // Assuming delete is handled elsewhere for now

type AnalysisStatus = 'idle' | 'uploading' | 'polling' | 'completed' | 'error';

const AnalysisPage: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analysisId, setAnalysisId] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [status, setStatus] = useState<AnalysisStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const pollingIntervalId = useRef<NodeJS.Timeout | null>(null);

    const POLLING_INTERVAL_MS = 5000; // Check every 5 seconds

    // --- File Selection ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            // Reset state if a new file is selected
            setAnalysisId(null);
            setAnalysisResult(null);
            setStatus('idle');
            setError(null);
            if (pollingIntervalId.current) {
                clearInterval(pollingIntervalId.current);
                pollingIntervalId.current = null;
            }
        } else {
            setSelectedFile(null);
        }
    };

    // --- Upload Handler ---
    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a CV file first.');
            return;
        }

        setStatus('uploading');
        setError(null);
        setAnalysisResult(null); // Clear previous results

        try {
            const response = await uploadCvForAnalysis(selectedFile);
            setAnalysisId(response.analysisId);
            setStatus('polling'); // Move to polling state
            console.log('Upload successful, analysis ID:', response.analysisId);
        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.message || 'Failed to start analysis.');
            setStatus('error');
            setAnalysisId(null);
        }
    };

    // --- Polling Logic ---
    const pollAnalysisStatus = useCallback(async () => {
        if (!analysisId) return;

        console.log(`Polling for analysis results (ID: ${analysisId})...`);
        try {
            const result = await getAnalysis(analysisId);
            setAnalysisResult(result); // Update result state even if pending

            if (result.status === 'completed') {
                console.log('Analysis completed:', result);
                setStatus('completed');
                if (pollingIntervalId.current) {
                    clearInterval(pollingIntervalId.current);
                    pollingIntervalId.current = null;
                }
            } else if (result.status === 'failed') {
                console.error('Analysis failed:', result.errorInfo);
                setError(`Analysis failed: ${result.errorInfo || 'Unknown error'}`);
                setStatus('error');
                if (pollingIntervalId.current) {
                    clearInterval(pollingIntervalId.current);
                    pollingIntervalId.current = null;
                }
            } else {
                // Still pending, continue polling
                console.log('Analysis still pending...');
            }
        } catch (err: any) {
            console.error('Polling error:', err);
            // Don't stop polling on temporary fetch errors unless it's severe?
            // Maybe add a retry limit later. For now, log and continue.
            // setError(`Error checking analysis status: ${err.message}`);
            // setStatus('error'); // Or maybe just log and let it retry?
            // if (pollingIntervalId.current) {
            //     clearInterval(pollingIntervalId.current);
            //     pollingIntervalId.current = null;
            // }
        }
    }, [analysisId]);

    // --- Effect to Start/Stop Polling ---
    useEffect(() => {
        if (status === 'polling' && analysisId) {
            // Clear any existing interval before starting a new one
            if (pollingIntervalId.current) {
                clearInterval(pollingIntervalId.current);
            }
            // Start polling immediately, then set interval
            pollAnalysisStatus();
            pollingIntervalId.current = setInterval(pollAnalysisStatus, POLLING_INTERVAL_MS);
        }

        // Cleanup function: clear interval when component unmounts or dependencies change
        return () => {
            if (pollingIntervalId.current) {
                clearInterval(pollingIntervalId.current);
                pollingIntervalId.current = null;
                console.log('Polling stopped.');
            }
        };
    }, [status, analysisId, pollAnalysisStatus]);


    // --- Render Helper for Results ---
    const renderResults = () => {
        if (!analysisResult) return null;

        return (
            <div className="mt-6 p-4 border rounded bg-gray-50">
                <h3 className="text-lg font-semibold mb-3">Analysis Results (ID: {analysisResult._id})</h3>
                <p><strong>Status:</strong> <span className={`font-medium ${analysisResult.status === 'completed' ? 'text-green-600' : analysisResult.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{analysisResult.status}</span></p>
                {analysisResult.status === 'completed' && (
                    <>
                        <p><strong>Overall Score:</strong> {analysisResult.overallScore ?? 'N/A'} / 100</p>
                        <p><strong>Issues Found:</strong> {analysisResult.issueCount ?? 0}</p>

                        {/* Category Scores */}
                        {analysisResult.categoryScores && Object.keys(analysisResult.categoryScores).length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold">Category Scores:</h4>
                                <ul className="list-disc list-inside ml-4">
                                    {Object.entries(analysisResult.categoryScores).map(([category, score]) => (
                                        <li key={category}>{category}: {score}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Detailed Results */}
                        {analysisResult.detailedResults && Object.keys(analysisResult.detailedResults).length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold">Detailed Checks:</h4>
                                {Object.entries(analysisResult.detailedResults).map(([key, detail]) => (
                                    <div key={key} className="mt-2 p-3 border rounded bg-white shadow-sm">
                                        <p className="font-medium">{detail.checkName}</p>
                                        <p>Status: <span className={`font-medium ${detail.status === 'pass' ? 'text-green-500' : detail.status === 'fail' ? 'text-red-500' : 'text-yellow-500'}`}>{detail.status}</span> {detail.score !== undefined ? `(Score: ${detail.score})` : ''}</p>
                                        {detail.issues && detail.issues.length > 0 && (
                                            <div>
                                                <p className="text-sm font-semibold mt-1">Issues:</p>
                                                <ul className="list-disc list-inside ml-4 text-sm text-red-700">
                                                    {detail.issues.map((issue, index) => <li key={index}>{issue}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {detail.suggestions && detail.suggestions.length > 0 && (
                                            <div>
                                                <p className="text-sm font-semibold mt-1">Suggestions:</p>
                                                <ul className="list-disc list-inside ml-4 text-sm text-blue-700">
                                                    {detail.suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
                {analysisResult.status === 'failed' && analysisResult.errorInfo && (
                    <p className="mt-2 text-red-600"><strong>Error Details:</strong> {analysisResult.errorInfo}</p>
                )}
            </div>
        );
    };


    // --- Main Render ---
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">CV Analysis</h1>

            <div className="mb-4 p-4 border rounded shadow-sm bg-white">
                <label htmlFor="cvFile" className="block text-sm font-medium text-gray-700 mb-1">
                    Select CV File (PDF or DOCX)
                </label>
                <input
                    type="file"
                    id="cvFile"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                    disabled={status === 'uploading' || status === 'polling'}
                />
                {selectedFile && <p className="text-sm text-gray-600 mt-2">Selected: {selectedFile.name}</p>}

                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || status === 'uploading' || status === 'polling'}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {status === 'uploading' && 'Uploading...'}
                    {status === 'polling' && 'Analyzing...'}
                    {(status === 'idle' || status === 'completed' || status === 'error') && 'Analyze CV'}
                </button>
            </div>

            {/* Status and Error Display */}
            {error && (
                <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    <strong>Error:</strong> {error}
                </div>
            )}
            {status === 'uploading' && <p className="text-blue-600">Uploading file, please wait...</p>}
            {status === 'polling' && !analysisResult && <p className="text-yellow-600">Analysis started. Waiting for results...</p>}
            {status === 'polling' && analysisResult?.status === 'pending' && <p className="text-yellow-600">Analysis in progress (Status: Pending)... Checking again soon.</p>}


            {/* Results Display */}
            {renderResults()}

        </div>
    );
};

export default AnalysisPage;
