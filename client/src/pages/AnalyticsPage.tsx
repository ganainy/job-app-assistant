
import React, { useEffect, useState } from 'react';
import { getApplicationStats, ApplicationStats } from '../services/analyticsApi';
import { getJobs, updateJob, JobApplication } from '../services/jobApi';
import ErrorAlert from '../components/common/ErrorAlert';
import Spinner from '../components/common/Spinner';
import { StatsGrid } from '../components/analytics/StatsGrid';
import { ApplicationsOverTimeChart } from '../components/analytics/ApplicationsOverTimeChart';
import { WeeklyGoalWidget } from '../components/analytics/WeeklyGoalWidget';
import { PipelineConversionWidget } from '../components/analytics/PipelineConversionWidget';
import { RecentActivityWidget } from '../components/analytics/RecentActivityWidget';
import ApplicationPipelineKanban from '../components/jobs/ApplicationPipelineKanban';
import { Calendar } from 'lucide-react';

const AnalyticsPage: React.FC = () => {
    const [stats, setStats] = useState<ApplicationStats | null>(null);
    const [jobs, setJobs] = useState<JobApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingJobs, setIsLoadingJobs] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // Weekly Goal State (Persisted)
    const [weeklyGoal, setWeeklyGoal] = useState<number>(() => {
        const saved = localStorage.getItem('weeklyGoalTarget');
        return saved ? parseInt(saved, 10) : 20;
    });

    const handleUpdateWeeklyGoal = (newTarget: number) => {
        setWeeklyGoal(newTarget);
        localStorage.setItem('weeklyGoalTarget', newTarget.toString());
    };

    const fetchStats = async (month?: string) => {
        try {
            setIsLoadingStats(true);
            const data = await getApplicationStats(month);
            setStats(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch analytics data.');
        } finally {
            setIsLoadingStats(false);
            setIsLoading(false);
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
            setJobs(prevJobs =>
                prevJobs.map(job =>
                    job._id === jobId ? { ...job, status: newStatus } : job
                )
            );
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
        <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Overview</h2>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <select
                        value={selectedMonth || ''}
                        onChange={(e) => handleMonthSelect(e.target.value || null)}
                        className="text-sm bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                        <option value="">Last 6 Months</option>
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Top Stats Grid */}
            <StatsGrid stats={stats} jobs={jobs} />

            {/* Middle Row: Velocity Chart + Weekly Goal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Application Velocity Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[400px] min-w-0">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">Application Velocity</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Applications sent vs status changes</p>
                        </div>
                        {/* Legend is handled inside the chart component */}
                    </div>

                    <div className="flex-1 w-full min-h-0 min-w-0">
                        {isLoadingStats ? (
                            <div className="h-full flex items-center justify-center">
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

                {/* Weekly Goal Widget */}
                <div>
                    <WeeklyGoalWidget
                        jobs={jobs}
                        target={weeklyGoal}
                        onUpdateTarget={handleUpdateWeeklyGoal}
                    />
                </div>
            </div>

            {/* Bottom Row: Pipeline + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pipeline Conversion */}
                <div>
                    <PipelineConversionWidget stats={stats} />
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <RecentActivityWidget jobs={jobs} />
                </div>
            </div>

            {/* Kanban Board Section */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Application Pipeline</h3>
                <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <ApplicationPipelineKanban
                        jobs={jobs}
                        isLoading={isLoadingJobs}
                        onStatusChange={handleStatusChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
