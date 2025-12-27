
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    trend?: {
        value: number;
        label: string;
        positive: boolean;
        neutral?: boolean;
    };
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    trend,
    icon: Icon,
    iconColor = 'text-indigo-600 dark:text-indigo-400',
    iconBgColor = 'bg-indigo-100 dark:bg-indigo-900/30'
}) => {
    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-200 dark:border-zinc-800 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
                    <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                        {value}
                    </div>
                </div>
                <div className={`p-2 rounded-lg ${iconBgColor}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
            </div>

            {trend && (
                <div className="flex items-center text-sm">
                    <span
                        className={`font-medium px-1.5 py-0.5 rounded text-xs mr-2 ${trend.neutral
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                : trend.positive
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                    >
                        {trend.positive ? '↑' : trend.neutral ? '-' : '↓'} {trend.neutral ? '' : Math.abs(trend.value) + '%'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                        {trend.label}
                    </span>
                </div>
            )}
        </div>
    );
};
