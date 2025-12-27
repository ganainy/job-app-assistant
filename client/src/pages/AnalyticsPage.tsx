
import React, { useEffect, useState } from 'react';
import { getApplicationStats, ApplicationStats } from '../services/analyticsApi';
import { getJobs, updateJob, JobApplication } from '../services/jobApi';
import ErrorAlert from '../components/common/ErrorAlert';
import Spinner from '../components/common/Spinner';
import { StatsSummary } from '../components/analytics/StatsSummary';
import { ApplicationsByStatusChart } from '../components/analytics/ApplicationsByStatusChart';
import { ApplicationsOverTimeChart } from '../components/analytics/ApplicationsOverTimeChart';
import ApplicationPipelineKanban from '../components/jobs/ApplicationPipelineKanban';

const AnalyticsPage: React.FC = () => {
    const [stats, setStats] = useState<ApplicationStats | null>(null);
    const [jobs, setJobs] = useState<JobApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingJobs, setIsLoadingJobs] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    const fetchStats = async (month?: string) => {
        try {
            setIsLoadingStats(true);
            const data = await getApplicationStats(month);
            setStats(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch analytics data.');
        } finally {
            setIsLoadingStats(false);
            setIsLoading(false); // Initial load done
        }
    };

    useEffect(() => {
        fetchStats(selectedMonth || undefined);
    }, [selectedMonth]);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                setIsLoadingJobs(true);
                const data = await getJobs();
                setJobs(data);
            } catch (err: any) {
                console.error('Failed to fetch jobs:', err);
            } finally {
                setIsLoadingJobs(false);
            }
        };
        fetchJobs();
    }, []);

    const handleMonthSelect = (month: string | null) => {
        setSelectedMonth(month);
    };

    const handleStatusChange = async (jobId: string, newStatus: JobApplication['status']) => {
        try {
            await updateJob(jobId, { status: newStatus });
            // Update local state
            setJobs(prevJobs =>
                prevJobs.map(job =>
                    job._id === jobId ? { ...job, status: newStatus } : job
                )
            );
            // Refresh stats to reflect the change
            const data = await getApplicationStats(selectedMonth || undefined);
            setStats(data);
        } catch (err: any) {
            console.error('Failed to update job status:', err);
            throw err;
        }
    };

    // Generate last 12 months for dropdown
    const monthOptions = React.useMemo(() => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    }, []);

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 text-center">
                <Spinner />
                <p className="text-gray-600 dark:text-gray-300 mt-2">Loading analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <ErrorAlert message={error} />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-400">View:</span>
                    <select
                        value={selectedMonth || ''}
                        onChange={(e) => handleMonthSelect(e.target.value || null)}
                        className="block w-56 pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm"
                    >
                        <option value="">Applications Over Time</option>
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <StatsSummary
                totalApplications={stats?.totalApplications || 0}
                applicationsByStatus={stats?.applicationsByStatus || []}
                applicationsOverTime={stats?.applicationsOverTime || []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Applications by Status</h3>
                    <ApplicationsByStatusChart data={stats?.applicationsByStatus || []} />
                </div>
                <div className="lg:col-span-3 bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800 relative">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedMonth ? `Applications in ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'Applications Over Time'}
                        </h3>
                    </div>
                    {isLoadingStats ? (
                        <div className="h-64 flex items-center justify-center">
                            <Spinner />
                        </div>
                    ) : (
                        <ApplicationsOverTimeChart
                            data={stats?.applicationsOverTimeByStatus || []}
                            onMonthClick={handleMonthSelect}
                            selectedMonth={selectedMonth}
                        />
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Application Pipeline</h3>
                <ApplicationPipelineKanban
                    jobs={jobs}
                    isLoading={isLoadingJobs}
                    onStatusChange={handleStatusChange}
                />
            </div>
        </div>
    );
};

export default AnalyticsPage;
