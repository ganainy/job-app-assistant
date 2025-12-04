// client/src/pages/AutoJobsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Country, State, City } from 'country-state-city';
import {
    getAutoJobs,
    getStats,
    getSettings,
    updateSettings,
    triggerWorkflow,
    getWorkflowStatus,
    cancelWorkflow,
    promoteAutoJob,
    deleteAutoJob,
    AutoJob,
    WorkflowStats,
    AutoJobSettings,
    WorkflowRun
} from '../services/autoJobApi';
import Toast from '../components/common/Toast';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import JobRecommendationBadge from '../components/jobs/JobRecommendationBadge';

const AutoJobsPage: React.FC = () => {
    // State
    const [jobs, setJobs] = useState<AutoJob[]>([]);
    const [stats, setStats] = useState<WorkflowStats | null>(null);
    const [settings, setSettings] = useState<AutoJobSettings>({ 
        enabled: false, 
        keywords: '',
        location: '',
        jobType: [],
        experienceLevel: [],
        datePosted: 'any time',
        maxJobs: 100,
        avoidDuplicates: false,
        schedule: '0 9 * * *' 
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Workflow Progress State
    const [currentRunId, setCurrentRunId] = useState<string | null>(localStorage.getItem('autoJobRunId'));
    const [workflowProgress, setWorkflowProgress] = useState<WorkflowRun | null>(null);
    const [lastJobCount, setLastJobCount] = useState<number>(0); // Track number of jobs to detect new ones

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    // Filters
    const [filterRelevance, setFilterRelevance] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    // Location autocomplete
    const [locationInput, setLocationInput] = useState<string>('');
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [showLocationSuggestions, setShowLocationSuggestions] = useState<boolean>(false);

    // Sync locationInput with settings.location
    useEffect(() => {
        if (settings.location !== undefined) {
            setLocationInput(settings.location || '');
        }
    }, [settings.location]);

    // Fetch data
    const fetchData = async () => {
        try {
            setIsLoading(true);
            // Handle "processing" filter - fetch all jobs and filter on frontend
            const relevanceFilter = filterRelevance === 'processing' ? '' : filterRelevance;
            // When "processing" is selected, don't use status filter (we'll filter on frontend)
            const statusFilter = filterRelevance === 'processing' ? '' : filterStatus;
            
            const [jobsData, statsData, settingsData] = await Promise.all([
                getAutoJobs({
                    page: currentPage,
                    limit: filterRelevance === 'processing' ? 1000 : pageSize, // Get more for processing filter
                    relevance: relevanceFilter,
                    status: statusFilter
                }),
                getStats(),
                getSettings()
            ]);

            // If filtering by "processing", filter jobs with pending or analyzed status
            let filteredJobs = jobsData.jobs;
            let totalCount = jobsData.pagination.total;
            if (filterRelevance === 'processing') {
                filteredJobs = jobsData.jobs.filter(job => 
                    job.processingStatus === 'pending' || job.processingStatus === 'analyzed'
                );
                // Recalculate pagination for filtered results
                const startIndex = (currentPage - 1) * pageSize;
                const endIndex = startIndex + pageSize;
                filteredJobs = filteredJobs.slice(startIndex, endIndex);
                totalCount = jobsData.jobs.filter(job => 
                    job.processingStatus === 'pending' || job.processingStatus === 'analyzed'
                ).length;
            }

            setJobs(filteredJobs);
            setTotalPages(filterRelevance === 'processing' ? Math.ceil(totalCount / pageSize) : jobsData.pagination.pages);
            setTotal(totalCount);
            setStats(statsData);
            // Update lastJobCount when fetching data (only if not in a running workflow)
            if (!currentRunId || !workflowProgress || workflowProgress.status !== 'running') {
                setLastJobCount(jobsData.jobs.length);
            }
            // Filter settings to only include valid fields
            const filteredSettings = filterValidSettings(settingsData);
            setSettings(filteredSettings);
            setLocationInput(filteredSettings.location || '');
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load data');
            showToast('Failed to load auto jobs', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Generate location suggestions from country-state-city package (optimized)
    const generateLocationSuggestions = (input: string): string[] => {
        if (!input || input.length < 2) {
            return [];
        }

        const inputLower = input.toLowerCase().trim();
        const suggestions: Set<string> = new Set();
        const maxSuggestions = 15;
        let foundCount = 0;

        // Add "Remote" options first (fast)
        if ('remote'.startsWith(inputLower)) {
            suggestions.add('Remote, United States');
            suggestions.add('Remote, Worldwide');
            foundCount += 2;
        }

        // Limit countries to search (only first 50 most common countries)
        const commonCountryCodes = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IE', 'PL', 'CZ', 'PT', 'GR', 'IN', 'CN', 'JP', 'KR', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'NZ', 'ZA', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'AE', 'SA', 'IL', 'TR', 'RU', 'UA', 'RO', 'HU', 'BG', 'HR', 'SI'];
        
        // Search countries (limited set)
        for (const countryCode of commonCountryCodes) {
            if (foundCount >= maxSuggestions) break;
            const country = Country.getCountryByCode(countryCode);
            if (country) {
                const countryName = country.name.toLowerCase();
                if (countryName.includes(inputLower)) {
                    suggestions.add(country.name);
                    foundCount++;
                }
            }
        }

        // Search states/provinces (only for common countries, limit to first 20 states per country)
        for (const countryCode of commonCountryCodes.slice(0, 10)) {
            if (foundCount >= maxSuggestions) break;
            const states = State.getStatesOfCountry(countryCode);
            for (let i = 0; i < Math.min(states.length, 20); i++) {
                if (foundCount >= maxSuggestions) break;
                const state = states[i];
                const stateName = state.name.toLowerCase();
                if (stateName.includes(inputLower)) {
                    const country = Country.getCountryByCode(countryCode);
                    if (country) {
                        suggestions.add(`${state.name}, ${country.name}`);
                        foundCount++;
                    }
                }
            }
        }

        // Search cities (only for US, UK, CA, AU, DE - limit to first 10 cities per state)
        const citySearchCountries = ['US', 'GB', 'CA', 'AU', 'DE'];
        for (const countryCode of citySearchCountries) {
            if (foundCount >= maxSuggestions) break;
            const states = State.getStatesOfCountry(countryCode);
            for (let i = 0; i < Math.min(states.length, 10); i++) {
                if (foundCount >= maxSuggestions) break;
                const state = states[i];
                const cities = City.getCitiesOfState(countryCode, state.isoCode);
                for (let j = 0; j < Math.min(cities.length, 10); j++) {
                    if (foundCount >= maxSuggestions) break;
                    const city = cities[j];
                    const cityName = city.name.toLowerCase();
                    if (cityName.includes(inputLower)) {
                        const country = Country.getCountryByCode(countryCode);
                        if (country) {
                            suggestions.add(`${city.name}, ${state.name}`);
                            foundCount++;
                            if (foundCount < maxSuggestions) {
                                suggestions.add(`${city.name}, ${country.name}`);
                                foundCount++;
                            }
                        }
                    }
                }
            }
        }

        return Array.from(suggestions).slice(0, maxSuggestions);
    };

    // Debounce timer for location suggestions
    const locationSearchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Handle location input change (with debouncing for suggestions)
    const handleLocationInputChange = (value: string) => {
        const trimmedValue = value.substring(0, 100);
        setLocationInput(trimmedValue);

        // Update settings immediately (no debounce for input)
        const newSettings = { ...settings, location: trimmedValue };
        setSettings(newSettings);
        autoSaveSettings(newSettings, false);

        // Clear previous timeout
        if (locationSearchTimeoutRef.current) {
            clearTimeout(locationSearchTimeoutRef.current);
        }

        // Hide suggestions if input is too short
        if (trimmedValue.length < 2) {
            setLocationSuggestions([]);
            setShowLocationSuggestions(false);
            return;
        }

        // Debounce suggestion generation to avoid blocking UI
        locationSearchTimeoutRef.current = setTimeout(() => {
            // Use setTimeout to defer to next event loop tick
            setTimeout(() => {
                const suggestions = generateLocationSuggestions(trimmedValue);
                setLocationSuggestions(suggestions);
                setShowLocationSuggestions(suggestions.length > 0);
            }, 0);
        }, 300); // 300ms debounce
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (locationSearchTimeoutRef.current) {
                clearTimeout(locationSearchTimeoutRef.current);
            }
        };
    }, []);

    // Handle location suggestion selection
    const handleLocationSelect = (suggestion: string) => {
        setLocationInput(suggestion);
        setShowLocationSuggestions(false);
        const newSettings = { ...settings, location: suggestion };
        setSettings(newSettings);
        autoSaveSettings(newSettings, false);
    };

    useEffect(() => {
        fetchData();
    }, [currentPage, filterRelevance, filterStatus]);

    // Polling for workflow progress and new jobs
    useEffect(() => {
        if (!currentRunId) return;

        const interval = setInterval(async () => {
            try {
                const status = await getWorkflowStatus(currentRunId);
                setWorkflowProgress(status);
                // Clear isTriggering once we have workflow status
                setIsTriggering(false);

                // Poll for new jobs if workflow is running
                if (status.status === 'running') {
                    try {
                        // Handle "processing" filter - fetch all jobs and filter on frontend
                        const relevanceFilter = filterRelevance === 'processing' ? '' : filterRelevance;
                        const statusFilter = filterRelevance === 'processing' ? '' : filterStatus;
                        
                        const jobsData = await getAutoJobs({
                            page: 1,
                            limit: 1000, // Get more jobs to see all from current run
                            relevance: relevanceFilter,
                            status: statusFilter
                        });
                        
                        // If filtering by "processing", filter jobs with pending or analyzed status
                        let filteredJobs = jobsData.jobs;
                        if (filterRelevance === 'processing') {
                            filteredJobs = jobsData.jobs.filter(job => 
                                job.processingStatus === 'pending' || job.processingStatus === 'analyzed'
                            );
                        }
                        
                        // Check if we have new jobs
                        const currentJobCount = filteredJobs.length;
                        if (currentJobCount > lastJobCount) {
                            // New jobs detected, update the list
                            setJobs(filteredJobs);
                            setTotalPages(filterRelevance === 'processing' ? Math.ceil(filteredJobs.length / pageSize) : jobsData.pagination.pages);
                            setTotal(filterRelevance === 'processing' ? filteredJobs.length : jobsData.pagination.total);
                            setLastJobCount(currentJobCount);
                        }
                    } catch (err) {
                        // Silently fail job polling, don't break workflow status polling
                        console.error('Error polling for new jobs:', err);
                    }
                }

                if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
                    clearInterval(interval);
                    localStorage.removeItem('autoJobRunId');
                    setCurrentRunId(null);
                    setLastJobCount(0);

                    if (status.status === 'completed') {
                        showToast(`Workflow complete! ${status.stats.generated} jobs generated`, 'success');
                        fetchData(); // Refresh data
                    } else if (status.status === 'failed') {
                        showToast(`Workflow failed: ${status.errorMessage}`, 'error');
                        fetchData(); // Refresh data
                    } else if (status.status === 'cancelled') {
                        showToast('Workflow cancelled successfully', 'success');
                        fetchData(); // Refresh data
                    }
                }
            } catch (err) {
                console.error('Error polling workflow status:', err);
                // Don't clear interval immediately on error, might be temporary network issue
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [currentRunId, filterRelevance, filterStatus, lastJobCount]);

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    // Handle workflow trigger
    const handleTrigger = async () => {
        try {
            setIsTriggering(true);
            setLastJobCount(0); // Reset job count for new workflow
            const result = await triggerWorkflow();
            setCurrentRunId(result.runId);
            localStorage.setItem('autoJobRunId', result.runId);
            // Keep isTriggering true until workflow status is fetched
            // The button will remain disabled based on workflowProgress status
        } catch (err: any) {
            setIsTriggering(false);
            showToast(err.response?.data?.message || 'Failed to trigger workflow', 'error');
        }
    };

    // Check if workflow is currently running
    const isWorkflowRunning = workflowProgress?.status === 'running' || (currentRunId && !workflowProgress);

    // Filter settings to only include valid fields
    const filterValidSettings = (settingsToFilter: any): AutoJobSettings => {
        return {
            enabled: settingsToFilter.enabled ?? false,
            keywords: settingsToFilter.keywords ?? '',
            location: settingsToFilter.location ?? '',
            jobType: Array.isArray(settingsToFilter.jobType) ? settingsToFilter.jobType : [],
            experienceLevel: Array.isArray(settingsToFilter.experienceLevel) ? settingsToFilter.experienceLevel : [],
            // Map invalid "past hour" to valid "past 24 hours"
            datePosted: settingsToFilter.datePosted === 'past hour' ? 'past 24 hours' : (settingsToFilter.datePosted ?? 'any time'),
            maxJobs: settingsToFilter.maxJobs ?? 100,
            avoidDuplicates: settingsToFilter.avoidDuplicates ?? false,
            schedule: settingsToFilter.schedule ?? '0 9 * * *'
        };
    };

    // Auto-save settings (debounced)
    const autoSaveSettings = async (newSettings: AutoJobSettings, showMessage = false) => {
        try {
            setIsSavingSettings(true);
            // Only send valid fields to backend
            const validSettings = filterValidSettings(newSettings);
            await updateSettings(validSettings);
            if (showMessage) {
                showToast('Settings saved successfully', 'success');
            }
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to save settings', 'error');
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Handle settings save (for configuration card - kept for explicit save if needed)
    const handleSaveSettings = async () => {
        await autoSaveSettings(settings, true);
        fetchData();
    };

    // Handle toggle enable
    const handleToggleEnable = async () => {
        const newEnabled = !settings.enabled;
        const newSettings = { ...settings, enabled: newEnabled };
        setSettings(newSettings); // Optimistic update

        try {
            // Only send valid fields to backend
            const validSettings = filterValidSettings(newSettings);
            await updateSettings(validSettings);
            showToast(`Auto jobs ${newEnabled ? 'enabled' : 'disabled'}`, 'success');
        } catch (err: any) {
            setSettings(settings); // Revert on error
            showToast('Failed to update settings', 'error');
        }
    };

    // Handle schedule change with auto-save
    const handleScheduleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSettings = { ...settings, schedule: e.target.value };
        setSettings(newSettings);
        await autoSaveSettings(newSettings, false);
    };


    // Handle max jobs change with auto-save
    const handleMaxJobsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSettings = { ...settings, maxJobs: parseInt(e.target.value) };
        setSettings(newSettings);
        await autoSaveSettings(newSettings, false);
    };

    // Handle promote job
    const handlePromote = async (id: string) => {
        if (!confirm('Save this job to your main dashboard?')) return;

        try {
            await promoteAutoJob(id);
            showToast('Job saved to main dashboard successfully!', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to save job to main dashboard', 'error');
        }
    };

    // Handle delete job
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this auto job?')) return;

        try {
            await deleteAutoJob(id);
            showToast('Job deleted successfully', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to delete job', 'error');
        }
    };

    // Render relevance badge (for processing status)
    const renderRelevanceBadge = (status?: string, recommendation?: AutoJob['recommendation']) => {
        if (status === 'pending' || status === 'analyzed') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Processing...
                </span>
            );
        }
        if (status === 'error') {
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Error</span>;
        }
        if (recommendation?.shouldApply) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Relevant
                </span>
            );
        }
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Not Relevant</span>;
    };

    if (isLoading && jobs.length === 0) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Auto Jobs</h1>
                        <p className="mt-1 text-slate-600 dark:text-slate-400">
                            Automated job discovery and application preparation
                        </p>
                    </div>
                    <button
                        onClick={handleTrigger}
                        disabled={isWorkflowRunning || isTriggering}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[120px] justify-center"
                    >
                        {(isWorkflowRunning || isTriggering) ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{isTriggering ? 'Starting...' : 'Running...'}</span>
                            </>
                        ) : (
                            <>🚀 Run Now</>
                        )}
                    </button>
                </div>

                {/* Auto Jobs Schedule Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Auto Jobs Schedule</h2>

                    <div className="space-y-4">
                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Auto Jobs</label>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Automatically search for jobs on schedule (manual "Run Now" works independently)</p>
                            </div>
                            <button
                                onClick={handleToggleEnable}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>

                        {/* Schedule - only show when enabled */}
                        {settings.enabled && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Schedule
                                </label>
                                <select
                                    value={settings.schedule}
                                    onChange={handleScheduleChange}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="0 9 * * *">Daily at 9 AM</option>
                                    <option value="0 */6 * * *">Every 6 hours</option>
                                    <option value="0 */12 * * *">Every 12 hours</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Configuration Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Configuration</h2>

                    <div className="space-y-4">
                        {/* Keywords */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Job Keywords <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={settings.keywords || ''}
                                onChange={(e) => {
                                    const newSettings = { ...settings, keywords: e.target.value.substring(0, 200) };
                                    setSettings(newSettings);
                                    autoSaveSettings(newSettings, false);
                                }}
                                placeholder="e.g., mobile developer"
                                maxLength={200}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Enter job search keywords (required if location not provided). Max 200 characters.
                            </p>
                        </div>

                        {/* Location */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Location
                            </label>
                            <input
                                type="text"
                                value={locationInput}
                                onChange={(e) => handleLocationInputChange(e.target.value)}
                                onFocus={() => {
                                    if (locationInput.length >= 2) {
                                        // Use setTimeout to avoid blocking
                                        setTimeout(() => {
                                            const suggestions = generateLocationSuggestions(locationInput);
                                            setLocationSuggestions(suggestions);
                                            setShowLocationSuggestions(suggestions.length > 0);
                                        }, 0);
                                    }
                                }}
                                onBlur={() => {
                                    // Delay hiding suggestions to allow click events
                                    setTimeout(() => setShowLocationSuggestions(false), 200);
                                }}
                                placeholder="e.g., New York, NY or Berlin, Germany"
                                maxLength={100}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            {showLocationSuggestions && locationSuggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {locationSuggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleLocationSelect(suggestion)}
                                            className="w-full text-left px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-900 dark:text-white text-sm"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Enter location to filter jobs (optional). Start typing to see suggestions. Max 100 characters.
                            </p>
                        </div>

                        {/* Job Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Job Type
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['full-time', 'part-time', 'contract', 'internship'].map((type) => (
                                    <label key={type} className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.jobType?.includes(type) || false}
                                            onChange={(e) => {
                                                const currentTypes = settings.jobType || [];
                                                const newTypes = e.target.checked
                                                    ? [...currentTypes, type]
                                                    : currentTypes.filter(t => t !== type);
                                                const newSettings = { ...settings, jobType: newTypes };
                                                setSettings(newSettings);
                                                autoSaveSettings(newSettings, false);
                                            }}
                                            className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{type.replace('-', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Select 1-5 job types (optional). Leave empty to include all types.
                            </p>
                        </div>

                        {/* Experience Level */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Experience Level
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['entry level', 'associate', 'mid-senior level', 'director', 'internship'].map((level) => (
                                    <label key={level} className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.experienceLevel?.includes(level) || false}
                                            onChange={(e) => {
                                                const currentLevels = settings.experienceLevel || [];
                                                const newLevels = e.target.checked
                                                    ? [...currentLevels, level]
                                                    : currentLevels.filter(l => l !== level);
                                                const newSettings = { ...settings, experienceLevel: newLevels };
                                                setSettings(newSettings);
                                                autoSaveSettings(newSettings, false);
                                            }}
                                            className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{level}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Select 1-5 experience levels (optional). Leave empty to include all levels.
                            </p>
                        </div>

                        {/* Date Posted */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Date Posted
                            </label>
                            <select
                                value={settings.datePosted === 'past hour' ? 'past 24 hours' : (settings.datePosted || 'any time')}
                                onChange={(e) => {
                                    // Prevent selecting "past hour" (not supported by API)
                                    const datePosted = e.target.value === 'past hour' ? 'past 24 hours' : e.target.value;
                                    const newSettings = { ...settings, datePosted };
                                    setSettings(newSettings);
                                    autoSaveSettings(newSettings, false);
                                }}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="any time">Any Time</option>
                                <option value="past 24 hours">Past 24 Hours</option>
                                <option value="past week">Past Week</option>
                                <option value="past month">Past Month</option>
                            </select>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Filter jobs by posting date (optional).
                            </p>
                        </div>

                        {/* Max Jobs Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Jobs to Retrieve
                                </label>
                                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                    {settings.maxJobs || 100} jobs
                                </span>
                            </div>
                            <input
                                type="range"
                                min="20"
                                max="1000"
                                value={settings.maxJobs || 100}
                                onChange={handleMaxJobsChange}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                            />
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Maximum number of jobs to process per run (20-1000, default: 100)
                            </p>
                        </div>

                        {/* Avoid Duplicates */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Avoid Duplicates</label>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Skip already scraped jobs across runs</p>
                            </div>
                            <button
                                onClick={() => {
                                    const newSettings = { ...settings, avoidDuplicates: !settings.avoidDuplicates };
                                    setSettings(newSettings);
                                    autoSaveSettings(newSettings, false);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.avoidDuplicates ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.avoidDuplicates ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {isSavingSettings ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>

                {/* Workflow Progress Section - Inline on page */}
                {workflowProgress && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 relative overflow-hidden">
                        {/* Top Progress Bar */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-200 dark:bg-gray-700">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
                                style={{ width: `${workflowProgress.progress.percentage}%` }}
                            />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                    {workflowProgress.status === 'completed' ? 'Workflow Complete!' :
                                        workflowProgress.status === 'failed' ? 'Workflow Failed' :
                                            workflowProgress.status === 'cancelled' ? 'Workflow Cancelled' :
                                                'Running Auto Jobs'}
                                </h2>
                                {workflowProgress.status === 'running' && workflowProgress.progress.currentStep && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {workflowProgress.progress.currentStep}
                                    </p>
                                )}
                            </div>
                            {workflowProgress.status === 'running' && (
                                <button
                                    onClick={async () => {
                                        if (!currentRunId) return;
                                        if (!confirm('Are you sure you want to cancel this workflow? Processing will stop at the current job.')) return;
                                        
                                        try {
                                            await cancelWorkflow(currentRunId);
                                            showToast('Workflow cancelled successfully', 'success');
                                            const status = await getWorkflowStatus(currentRunId);
                                            setWorkflowProgress(status);
                                            setCurrentRunId(null);
                                            localStorage.removeItem('autoJobRunId');
                                        } catch (err: any) {
                                            showToast(err.response?.data?.message || 'Failed to cancel workflow', 'error');
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                            )}
                            {(workflowProgress.status === 'completed' || workflowProgress.status === 'failed' || workflowProgress.status === 'cancelled') && (
                                <button
                                    onClick={() => {
                                        setWorkflowProgress(null);
                                        setCurrentRunId(null);
                                        localStorage.removeItem('autoJobRunId');
                                        fetchData();
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Horizontal Steps Layout */}
                        <div className="relative mb-8">
                            <div className="flex items-center justify-between">
                                {workflowProgress.steps.map((step, index) => {
                                    const isCompleted = step.status === 'completed';
                                    const isRunning = step.status === 'running';
                                    const isFailed = step.status === 'failed';
                                    const isPending = step.status === 'pending';
                                    
                                    // Find the index of the running step
                                    const runningIndex = workflowProgress.steps.findIndex(s => s.status === 'running');
                                    const isBeforeRunning = index < runningIndex;
                                    
                                    return (
                                        <div key={index} className="flex-1 flex flex-col items-center relative">
                                            {/* Connector Line */}
                                            {index < workflowProgress.steps.length - 1 && (
                                                <div className="absolute top-5 left-[60%] right-0 h-0.5 -z-10">
                                                    <div className={`h-full transition-all duration-500 ${
                                                        isCompleted || isBeforeRunning 
                                                            ? 'bg-green-500 dark:bg-green-400' 
                                                            : 'bg-gray-200 dark:bg-gray-700'
                                                    }`} style={{ width: '100%' }} />
                                                </div>
                                            )}
                                            
                                            {/* Step Circle */}
                                            <div className={`
                                                w-10 h-10 rounded-full flex items-center justify-center mb-3 relative z-10
                                                transition-all duration-300
                                                ${isCompleted 
                                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/50' 
                                                    : isRunning 
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50 animate-pulse' 
                                                        : isFailed
                                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}
                                            `}>
                                                {isCompleted ? (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : isFailed ? (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                ) : isRunning ? (
                                                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                ) : (
                                                    <span className="text-sm font-semibold">{index + 1}</span>
                                                )}
                                            </div>
                                            
                                            {/* Step Label */}
                                            <div className="text-center">
                                                <div className={`text-sm font-medium mb-1 ${
                                                    isCompleted 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : isRunning 
                                                            ? 'text-blue-600 dark:text-blue-400' 
                                                            : isFailed
                                                                ? 'text-red-600 dark:text-red-400'
                                                                : 'text-gray-500 dark:text-gray-400'}
                                                `}>
                                                    {step.name}
                                                </div>
                                                {isRunning && step.message && (
                                                    <div className="text-xs text-blue-500 dark:text-blue-400 animate-pulse mt-1">
                                                        {step.message}
                                                    </div>
                                                )}
                                                {isCompleted && step.message && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {step.message}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Progress Bar for Running Step */}
                                            {isRunning && (
                                                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                                                    <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Current Action Message */}
                        {workflowProgress.status === 'running' && workflowProgress.progress.currentStep && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                                <p className="text-sm text-blue-900 dark:text-blue-100 text-center">
                                    {workflowProgress.progress.currentStep}
                                </p>
                            </div>
                        )}

                        {/* Footer Message */}
                        {workflowProgress.status === 'running' && (
                            <div className="text-center text-xs text-slate-400 dark:text-slate-500">
                                You can safely navigate away. The workflow will continue in the background.
                            </div>
                        )}
                    </div>
                )}

                {/* Jobs Table with Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Filters */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex flex-wrap gap-6">
                            <div className="flex-1 min-w-[200px]">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                    RELEVANCE
                                </label>
                                <select
                                    value={filterRelevance}
                                    onChange={(e) => { setFilterRelevance(e.target.value); setCurrentPage(1); }}
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                                >
                                    <option value="">All Relevance</option>
                                    <option value="true">Relevant</option>
                                    <option value="processing">Processing</option>
                                    <option value="false">Not Relevant</option>
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    STATUS
                                </label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                                >
                                    <option value="">All Status</option>
                                    <option value="generated">Generated</option>
                                    <option value="pending">Pending</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">JOB</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">LOCATION</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">RELEVANCE</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">SKILL MATCH</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">STATUS</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            No jobs found yet. Click "Run Now" to start discovering jobs!
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr key={job._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <a
                                                        href={job.jobUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                    >
                                                        {job.jobTitle}
                                                    </a>
                                                    <span className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{job.companyName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    {job.extractedData?.location ? (
                                                        <>
                                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                                {job.extractedData.location}
                                                            </span>
                                                            {job.extractedData?.remoteOption && (
                                                                <span className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                                                    {job.extractedData.remoteOption}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-slate-400 dark:text-slate-500 italic">
                                                            Not specified
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderRelevanceBadge(job.processingStatus, job.recommendation)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <JobRecommendationBadge 
                                                    recommendation={job.recommendation ? {
                                                        score: job.recommendation.score,
                                                        shouldApply: job.recommendation.shouldApply,
                                                        reason: job.recommendation.reason,
                                                        cached: true,
                                                        cachedAt: job.recommendation.cachedAt instanceof Date 
                                                            ? job.recommendation.cachedAt.toISOString() 
                                                            : typeof job.recommendation.cachedAt === 'string' 
                                                                ? job.recommendation.cachedAt 
                                                                : new Date().toISOString()
                                                    } : null}
                                                    isLoading={job.processingStatus === 'pending' || job.processingStatus === 'analyzed'}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                {job.processingStatus === 'generated' ? (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                                        Generated
                                                    </span>
                                                ) : job.processingStatus === 'pending' || job.processingStatus === 'analyzed' ? (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                        Pending
                                                    </span>
                                                ) : job.processingStatus === 'error' ? (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                                        Error
                                                    </span>
                                                ) : job.processingStatus ? (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                                                        {job.processingStatus.replace('_', ' ')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                        Unknown
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {(job.processingStatus === 'generated' || job.processingStatus === 'not_relevant' || job.processingStatus === 'relevant') && (
                                                        <button
                                                            onClick={() => handlePromote(job._id)}
                                                            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                                            title="Save to main dashboard"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(job._id)}
                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            Showing {total === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, total)} to {Math.min(currentPage * pageSize, total)} of {total} entries
                        </div>
                        {totalPages > 1 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast Notifications */}
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

export default AutoJobsPage;
