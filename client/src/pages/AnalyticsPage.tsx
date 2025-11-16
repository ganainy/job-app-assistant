// client/src/pages/AnalyticsPage.tsx
import React, { useState, useEffect } from 'react';
import { getJobApplicationStats, JobApplicationStats } from '../services/analyticsApi';
import { StatsSummary, ApplicationsByStatusChart, ApplicationsOverTimeChart } from '../components/analytics';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';

const AnalyticsPage: React.FC = () => {
    const [stats, setStats] = useState<JobApplicationStats | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await getJobApplicationStats();
                setStats(data);
            } catch (err: any) {
                console.error('Error fetching analytics:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load analytics data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Analytics</h1>
                <LoadingSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Analytics</h1>
                <ErrorAlert message={error} />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Analytics</h1>
                <p className="text-gray-500 dark:text-gray-400">No data available</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Analytics</h1>
            
            {/* Stats Summary Cards */}
            <StatsSummary
                totalApplications={stats.totalApplications}
                applicationsByStatus={stats.applicationsByStatus}
            />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Applications by Status Chart */}
                <ApplicationsByStatusChart applicationsByStatus={stats.applicationsByStatus} />

                {/* Applications Over Time Chart */}
                <ApplicationsOverTimeChart applicationsOverTime={stats.applicationsOverTime} />
            </div>
        </div>
    );
};

export default AnalyticsPage;

