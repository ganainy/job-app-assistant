
import React from 'react';

interface StatsSummaryProps {
    totalApplications: number;
    applicationsByStatus: { _id: string; count: number }[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ totalApplications, applicationsByStatus }) => {
    const getStatusCount = (status: string) => {
        return applicationsByStatus.find(s => s._id === status)?.count || 0;
    };

    const appliedCount = getStatusCount('Applied');
    const interviewCount = getStatusCount('Interview');
    const offerCount = getStatusCount('Offer');
    const rejectedCount = getStatusCount('Rejected');

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Applications Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{totalApplications}</p>
            </div>

            {/* Applied Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Applied</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{appliedCount}</p>
            </div>

            {/* Interview Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Interviews</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{interviewCount}</p>
            </div>

            {/* Offers Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Offers</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{offerCount}</p>
            </div>
        </div>
    );
};
