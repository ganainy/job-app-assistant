// client/src/components/analytics/StatsSummary.tsx
import React from 'react';

interface StatsSummaryProps {
    totalApplications: number;
    applicationsByStatus: Record<string, number>;
}

const StatsSummary: React.FC<StatsSummaryProps> = ({ totalApplications, applicationsByStatus }) => {
    // Calculate key metrics
    const appliedCount = applicationsByStatus['Applied'] || 0;
    const interviewCount = applicationsByStatus['Interview'] || 0;
    const offerCount = applicationsByStatus['Offer'] || 0;
    const rejectedCount = applicationsByStatus['Rejected'] || 0;

    const stats = [
        {
            label: 'Total Applications',
            value: totalApplications,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-blue-500 dark:bg-blue-600',
        },
        {
            label: 'Applied',
            value: appliedCount,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'bg-green-500 dark:bg-green-600',
        },
        {
            label: 'Interviews',
            value: interviewCount,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            color: 'bg-purple-500 dark:bg-purple-600',
        },
        {
            label: 'Offers',
            value: offerCount,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'bg-yellow-500 dark:bg-yellow-600',
        },
        {
            label: 'Rejected',
            value: rejectedCount,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            ),
            color: 'bg-red-500 dark:bg-red-600',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                        </div>
                        <div className={`${stat.color} text-white rounded-lg p-3`}>
                            {stat.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StatsSummary;

