
import React, { useMemo } from 'react';

interface StatsSummaryProps {
    totalApplications: number;
    applicationsByStatus: { _id: string; count: number }[];
    applicationsOverTime?: { _id: string; count: number }[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ 
    totalApplications, 
    applicationsByStatus,
    applicationsOverTime = []
}) => {
    const getStatusCount = (status: string) => {
        return applicationsByStatus.find(s => s._id === status)?.count || 0;
    };

    // Calculate pending applications (Applied + Interview + Assessment)
    const pendingCount = getStatusCount('Applied') + getStatusCount('Interview') + getStatusCount('Assessment');

    // Calculate month-over-month change
    const monthOverMonth = useMemo(() => {
        if (!applicationsOverTime || applicationsOverTime.length === 0) {
            return { percentage: 0, isPositive: true, lastMonthCount: 0 };
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Get current month applications
        const currentMonthApps = applicationsOverTime.filter(item => {
            const date = new Date(item._id);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, item) => sum + item.count, 0);

        // Get last month applications
        const lastMonthApps = applicationsOverTime.filter(item => {
            const date = new Date(item._id);
            return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        }).reduce((sum, item) => sum + item.count, 0);

        if (lastMonthApps === 0) {
            return { 
                percentage: currentMonthApps > 0 ? 100 : 0, 
                isPositive: true, 
                lastMonthCount: 0 
            };
        }

        const percentage = Math.round(((currentMonthApps - lastMonthApps) / lastMonthApps) * 100);
        return {
            percentage: Math.abs(percentage),
            isPositive: percentage >= 0,
            lastMonthCount: lastMonthApps
        };
    }, [applicationsOverTime]);

    // Get current month total
    const currentMonthTotal = useMemo(() => {
        if (!applicationsOverTime || applicationsOverTime.length === 0) {
            return totalApplications;
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return applicationsOverTime
            .filter(item => {
                const date = new Date(item._id);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            })
            .reduce((sum, item) => sum + item.count, 0);
    }, [applicationsOverTime, totalApplications]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Total Applications Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Applications</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{totalApplications}</p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">For this month</p>
            </div>

            {/* vs Last Month Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">vs Last Month</p>
                    <div className="flex items-baseline mt-2">
                        <p className={`text-4xl font-bold ${monthOverMonth.isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                            {monthOverMonth.percentage}%
                        </p>
                        <span className={`material-symbols-outlined ${monthOverMonth.isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'} ml-2`}>
                            {monthOverMonth.isPositive ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                    </div>
                </div>
                <p className={`text-sm ${monthOverMonth.isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'} mt-4`}>
                    {monthOverMonth.isPositive ? 'Up' : 'Down'} from {monthOverMonth.lastMonthCount}
                </p>
            </div>

            {/* Pending Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{pendingCount}</p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Awaiting response</p>
            </div>
        </div>
    );
};
