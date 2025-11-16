
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

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setIsLoading(true);
                const data = await getApplicationStats();
                setStats(data);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch analytics data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

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
            const data = await getApplicationStats();
            setStats(data);
        } catch (err: any) {
            console.error('Failed to update job status:', err);
            throw err;
        }
    };

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

    if (!stats) {
        return (
            <div className="container mx-auto p-4 text-center text-gray-600 dark:text-gray-300">
                No analytics data available.
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 lg:p-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Analytics Dashboard</h2>

            <StatsSummary
                totalApplications={stats.totalApplications}
                applicationsByStatus={stats.applicationsByStatus}
                applicationsOverTime={stats.applicationsOverTime}
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Applications by Status</h3>
                    <ApplicationsByStatusChart data={stats.applicationsByStatus} />
                </div>
                <div className="lg:col-span-3 bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Applications Over Time</h3>
                    <ApplicationsOverTimeChart data={stats.applicationsOverTime} />
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
