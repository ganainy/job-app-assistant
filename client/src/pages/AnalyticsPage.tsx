
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
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Job Application Analytics</h1>

            <StatsSummary
                totalApplications={stats.totalApplications}
                applicationsByStatus={stats.applicationsByStatus}
            />

            <div className="mt-8 mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Application Pipeline</h2>
                <ApplicationPipelineKanban
                    jobs={jobs}
                    isLoading={isLoadingJobs}
                    onStatusChange={handleStatusChange}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Applications by Status</h2>
                    <ApplicationsByStatusChart data={stats.applicationsByStatus} />
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Applications Over Time</h2>
                    <ApplicationsOverTimeChart data={stats.applicationsOverTime} />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
