// client/src/pages/AutoJobsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    getAutoJobs,
    getStats,
    getSettings,
    updateSettings,
    triggerWorkflow,
    promoteAutoJob,
    deleteAutoJob,
    AutoJob,
    WorkflowStats,
    AutoJobSettings
} from '../services/autoJobApi';
import Toast from '../components/common/Toast';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const AutoJobsPage: React.FC = () => {
    // State
    const [jobs, setJobs] = useState<AutoJob[]>([]);
    const [stats, setStats] = useState<WorkflowStats | null>(null);
    const [settings, setSettings] = useState<AutoJobSettings>({ enabled: false, linkedInSearchUrl: '', schedule: '0 9 * * *' });
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    // Filters
    const [filterRelevance, setFilterRelevance] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    // Fetch data
    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [jobsData, statsData, settingsData] = await Promise.all([
                getAutoJobs({
                    page: currentPage,
                    limit: pageSize,
                    relevance: filterRelevance,
                    status: filterStatus
                }),
                getStats(),
                getSettings()
            ]);

            setJobs(jobsData.jobs);
            setTotalPages(jobsData.pagination.pages);
            setTotal(jobsData.pagination.total);
            setStats(statsData);
            setSettings(settingsData);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load data');
            showToast('Failed to load auto jobs', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentPage, filterRelevance, filterStatus]);

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    // Handle workflow trigger
    const handleTrigger = async () => {
        try {
            setIsTriggering(true);
            const result = await triggerWorkflow();
            showToast(`Workflow complete! ${result.stats.generated} jobs generated from ${result.stats.jobsFound} found`, 'success');
            fetchData(); // Refresh data
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to trigger workflow', 'error');
        } finally {
            setIsTriggering(false);
        }
    };

    // Handle settings save
    const handleSaveSettings = async () => {
        try {
            setIsSavingSettings(true);
            await updateSettings(settings);
            showToast('Settings saved successfully', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to save settings', 'error');
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Handle toggle enable
    const handleToggleEnable = async () => {
        const newEnabled = !settings.enabled;
        const newSettings = { ...settings, enabled: newEnabled };
        setSettings(newSettings); // Optimistic update

        try {
            await updateSettings(newSettings);
            showToast(`Auto jobs ${newEnabled ? 'enabled' : 'disabled'}`, 'success');
        } catch (err: any) {
            setSettings(settings); // Revert on error
            showToast('Failed to update settings', 'error');
        }
    };

    // Handle promote job
    const handlePromote = async (id: string) => {
        if (!confirm('Promote this job to your main dashboard?')) return;

        try {
            await promoteAutoJob(id);
            showToast('Job promoted successfully!', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to promote job', 'error');
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

    // Render skill match stars
    const renderSkillMatch = (score?: number) => {
        if (!score) return <span className="text-gray-400 dark:text-gray-500">N/A</span>;
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= score ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>
                        ★
                    </span>
                ))}
            </div>
        );
    };

    // Render relevance badge
    const renderRelevanceBadge = (isRelevant?: boolean, status?: string) => {
        if (status === 'pending' || status === 'analyzed') {
            return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Processing...</span>;
        }
        if (status === 'error') {
            return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Error</span>;
        }
        if (isRelevant) {
            return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">✓ Relevant</span>;
        }
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Not Relevant</span>;
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
                        disabled={isTriggering || !settings.enabled}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isTriggering ? (
                            <>
                                <span className="animate-spin">⟳</span>
                                Running...
                            </>
                        ) : (
                            <>🚀 Run Now</>
                        )}
                    </button>
                </div>

                {/* Settings Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Configuration</h2>

                    <div className="space-y-4">
                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Auto Jobs</label>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Automatically search for jobs daily</p>
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

                        {/* LinkedIn URL */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                LinkedIn Search URL
                            </label>
                            <input
                                type="url"
                                value={settings.linkedInSearchUrl}
                                onChange={(e) => setSettings({ ...settings, linkedInSearchUrl: e.target.value })}
                                placeholder="https://www.linkedin.com/jobs/search/?keywords=..."
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Paste your LinkedIn job search URL with your desired filters
                            </p>
                        </div>

                        {/* Max Jobs Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Jobs to Retrieve
                                </label>
                                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                    {settings.maxJobs || 50} jobs
                                </span>
                            </div>
                            <input
                                type="range"
                                min="20"
                                max="100"
                                value={settings.maxJobs || 50}
                                onChange={(e) => setSettings({ ...settings, maxJobs: parseInt(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                            />
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Maximum number of jobs to process per run (20-100)
                            </p>
                        </div>

                        {/* Schedule */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Schedule
                            </label>
                            <select
                                value={settings.schedule}
                                onChange={(e) => setSettings({ ...settings, schedule: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="0 9 * * *">Daily at 9 AM</option>
                                <option value="0 */6 * * *">Every 6 hours</option>
                                <option value="0 */12 * * *">Every 12 hours</option>
                            </select>
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

                {/* Stats Dashboard */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border border-slate-200 dark:border-slate-700">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Total Jobs</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border border-slate-200 dark:border-slate-700">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.relevant}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Relevant</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border border-slate-200 dark:border-slate-700">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.generated}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Generated</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border border-slate-200 dark:border-slate-700">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Processing</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Relevance
                            </label>
                            <select
                                value={filterRelevance}
                                onChange={(e) => { setFilterRelevance(e.target.value); setCurrentPage(1); }}
                                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                                <option value="">All</option>
                                <option value="true">Relevant Only</option>
                                <option value="false">Not Relevant</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Status
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="analyzed">Analyzed</option>
                                <option value="generated">Generated</option>
                                <option value="error">Error</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Jobs Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Job</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Relevance</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Skill Match</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            {settings.enabled ? 'No jobs found yet. Click "Run Now" to start discovering jobs!' : 'Enable auto jobs in settings to start discovering opportunities!'}
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr key={job._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <a
                                                        href={job.jobUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                                                    >
                                                        {job.jobTitle}
                                                    </a>
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">{job.companyName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderRelevanceBadge(job.isRelevant, job.processingStatus)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderSkillMatch(job.skillMatchScore)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">
                                                    {job.processingStatus.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {job.isRelevant && job.processingStatus === 'generated' && (
                                                        <button
                                                            onClick={() => handlePromote(job._id)}
                                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                        >
                                                            Promote
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(job._id)}
                                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                                    >
                                                        Delete
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
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Showing {Math.min((currentPage - 1) * pageSize + 1, total)} - {Math.min(currentPage * pageSize, total)} of {total}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
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
