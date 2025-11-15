// client/src/components/common/LoadingSkeleton.tsx
import React from 'react';

interface LoadingSkeletonProps {
    lines?: number;
    className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ lines = 3, className = '' }) => {
    return (
        <div className={`animate-pulse ${className}`}>
            {Array.from({ length: lines }).map((_, index) => (
                <div
                    key={index}
                    className={`h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2 ${
                        index === lines - 1 ? 'w-3/4' : 'w-full'
                    }`}
                />
            ))}
        </div>
    );
};

export default LoadingSkeleton;

