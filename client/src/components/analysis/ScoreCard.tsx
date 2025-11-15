// client/src/components/analysis/ScoreCard.tsx
import React from 'react';

interface ScoreCardProps {
    title: string;
    score: number;
    maxScore?: number;
    subtitle?: string;
    icon?: React.ReactNode;
    className?: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const ScoreCard: React.FC<ScoreCardProps> = ({
    title,
    score,
    maxScore = 100,
    subtitle,
    icon,
    className = '',
    color = 'blue',
}) => {
    const percentage = Math.min((score / maxScore) * 100, 100);
    
    const colorClasses = {
        blue: {
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            icon: 'text-blue-600 dark:text-blue-400',
            progress: 'bg-blue-600 dark:bg-blue-700',
            text: 'text-blue-600 dark:text-blue-400',
        },
        green: {
            bg: 'bg-green-100 dark:bg-green-900/30',
            icon: 'text-green-600 dark:text-green-400',
            progress: 'bg-green-600 dark:bg-green-700',
            text: 'text-green-600 dark:text-green-400',
        },
        yellow: {
            bg: 'bg-yellow-100 dark:bg-yellow-900/30',
            icon: 'text-yellow-600 dark:text-yellow-400',
            progress: 'bg-yellow-600 dark:bg-yellow-700',
            text: 'text-yellow-600 dark:text-yellow-400',
        },
        red: {
            bg: 'bg-red-100 dark:bg-red-900/30',
            icon: 'text-red-600 dark:text-red-400',
            progress: 'bg-red-600 dark:bg-red-700',
            text: 'text-red-600 dark:text-red-400',
        },
        purple: {
            bg: 'bg-purple-100 dark:bg-purple-900/30',
            icon: 'text-purple-600 dark:text-purple-400',
            progress: 'bg-purple-600 dark:bg-purple-700',
            text: 'text-purple-600 dark:text-purple-400',
        },
    };

    const colors = colorClasses[color];
    const scoreColor = percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : percentage >= 40 ? 'yellow' : 'red';

    return (
        <div
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 ${className}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {icon && <div className={colors.bg + ' p-2 rounded-lg'}>{icon}</div>}
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
                        {subtitle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-3xl font-bold ${colorClasses[scoreColor].text}`}>
                        {score}
                        {maxScore !== 100 && <span className="text-lg text-gray-500 dark:text-gray-400">/{maxScore}</span>}
                    </p>
                </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${colorClasses[scoreColor].progress}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">{percentage.toFixed(0)}%</p>
        </div>
    );
};

export default ScoreCard;

