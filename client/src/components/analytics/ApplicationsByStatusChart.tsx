
import React, { useMemo } from 'react';

interface ApplicationsByStatusChartProps {
    data: { _id: string; count: number }[];
}

interface StatusData {
    label: string;
    count: number;
    color: string;
    dashArray: string;
    dashOffset: number;
}

export const ApplicationsByStatusChart: React.FC<ApplicationsByStatusChartProps> = ({ data }) => {
    const { statusData, total } = useMemo(() => {
        const statusMap: Record<string, number> = {};
        data.forEach(item => {
            statusMap[item._id] = (statusMap[item._id] || 0) + item.count;
        });

        const applied = statusMap['Applied'] || 0;
        const interview = (statusMap['Interview'] || 0) + (statusMap['Assessment'] || 0);
        const offer = statusMap['Offer'] || 0;
        const saved = statusMap['Not Applied'] || 0;

        const total = applied + interview + offer + saved;

        if (total === 0) {
            return { statusData: [], total: 0 };
        }

        const statusData: StatusData[] = [];
        let currentOffset = 0;
        const circumference = 100; // 100% for the circle

        if (applied > 0) {
            const percentage = (applied / total) * 100;
            statusData.push({
                label: 'Applied',
                count: applied,
                color: 'text-blue-500',
                dashArray: `${percentage}, ${circumference}`,
                dashOffset: currentOffset
            });
            currentOffset -= percentage;
        }

        if (interview > 0) {
            const percentage = (interview / total) * 100;
            statusData.push({
                label: 'Interviewing',
                count: interview,
                color: 'text-yellow-500',
                dashArray: `${percentage}, ${circumference}`,
                dashOffset: currentOffset
            });
            currentOffset -= percentage;
        }

        if (offer > 0) {
            const percentage = (offer / total) * 100;
            statusData.push({
                label: 'Offers',
                count: offer,
                color: 'text-green-500',
                dashArray: `${percentage}, ${circumference}`,
                dashOffset: currentOffset
            });
            currentOffset -= percentage;
        }

        if (saved > 0) {
            const percentage = (saved / total) * 100;
            statusData.push({
                label: 'Saved',
                count: saved,
                color: 'text-blue-200 dark:text-blue-900',
                dashArray: `${percentage}, ${circumference}`,
                dashOffset: currentOffset
            });
        }

        return { statusData, total };
    }, [data]);

    if (total === 0) {
        return (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No application status data to display.
            </div>
        );
    }

    const getColorClass = (label: string) => {
        switch (label) {
            case 'Applied':
                return 'bg-blue-500';
            case 'Interviewing':
                return 'bg-yellow-500';
            case 'Offers':
                return 'bg-green-500';
            case 'Saved':
                return 'bg-blue-200 dark:bg-blue-900';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="relative w-40 h-40 flex-shrink-0 mx-auto md:mx-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                        className="stroke-current text-blue-200 dark:text-blue-900"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="4"
                    />
                    {statusData.map((status, index) => (
                        <path
                            key={status.label}
                            className={`stroke-current ${status.color}`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            strokeDasharray={status.dashArray}
                            strokeDashoffset={status.dashOffset}
                            strokeLinecap="round"
                            strokeWidth="4"
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{total}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                </div>
            </div>
            <div className="space-y-3 flex-1">
                {statusData.map((status) => (
                    <div key={status.label} className="flex items-center">
                        <span className={`h-3 w-3 rounded-full ${getColorClass(status.label)}`}></span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                            {status.label}: {status.count}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
