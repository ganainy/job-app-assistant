import React, { useMemo } from 'react';

interface ApplicationsOverTimeChartProps {
    data: { _id: string; count: number }[];
}

export const ApplicationsOverTimeChart: React.FC<ApplicationsOverTimeChartProps> = ({ data }) => {
    const { chartData, maxCount } = useMemo(() => {
        // Generate last 6 months with year
        const now = new Date();
        const last6Months: { month: string; year: number; key: string }[] = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            last6Months.push({
                month: monthName,
                year: date.getFullYear(),
                key: `${date.getFullYear()}-${date.getMonth()}`
            });
        }

        if (!data || data.length === 0) {
            return {
                chartData: last6Months.map(m => ({ month: m.month, count: 0 })),
                maxCount: 1
            };
        }

        // Group by month and year
        const monthlyData: Record<string, number> = {};
        data.forEach(item => {
            try {
                const date = new Date(item._id);
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date:', item._id);
                    return;
                }
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                monthlyData[key] = (monthlyData[key] || 0) + item.count;
            } catch (error) {
                console.error('Error parsing date:', item._id, error);
            }
        });

        const chartData = last6Months.map(m => ({
            month: m.month,
            count: monthlyData[m.key] || 0
        }));

        const counts = chartData.map(d => d.count);
        const maxCount = Math.max(...counts);

        return { chartData, maxCount: maxCount || 1 };
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No application data over time to display.
            </div>
        );
    }

    // Generate y-axis tick values
    const getYAxisTicks = () => {
        if (maxCount === 0) return { ticks: [0], yAxisMax: 1 };
        
        let yAxisMax;
        if (maxCount <= 3) {
            yAxisMax = 5;
        } else if (maxCount <= 5) {
            yAxisMax = Math.ceil(maxCount * 1.2); // Add 20% padding
        } else if (maxCount <= 10) {
            yAxisMax = Math.ceil(maxCount / 2) * 2 + 2; // Round up to nearest even + 2
        } else {
            yAxisMax = Math.ceil(maxCount / 5) * 5 + 5; // Round up to nearest multiple of 5 + 5
        }
        
        const ticks: number[] = [];
        
        if (yAxisMax <= 5) {
            for (let i = 0; i <= yAxisMax; i++) {
                ticks.push(i);
            }
        } else {
            const numTicks = 5;
            const step = yAxisMax / (numTicks - 1);
            
            for (let i = 0; i < numTicks; i++) {
                ticks.push(Math.round(i * step));
            }
            
            ticks[ticks.length - 1] = yAxisMax;
        }
        
        return { ticks, yAxisMax };
    };

    const { ticks: yAxisTicks, yAxisMax } = getYAxisTicks();

    const getHeightPercentage = (count: number) => {
        if (yAxisMax === 0 || count === 0) return 0;
        return (count / yAxisMax) * 100;
    };

    const hasData = chartData.some(item => item.count > 0);
    const reversedTicks = [...yAxisTicks].reverse();

    return (
        <div className="flex gap-2">
            {/* Y-axis */}
            <div className="flex flex-col justify-between h-56 pr-2">
                {reversedTicks.map((tick, index) => (
                    <div
                        key={index}
                        className="text-xs text-gray-500 dark:text-gray-400"
                    >
                        {tick}
                    </div>
                ))}
            </div>
            
            {/* Chart */}
            <div className="h-56 relative flex-1 flex items-end space-x-2 md:space-x-4">
                {chartData.map((item, index) => {
                    const heightPercent = getHeightPercentage(item.count);
                    return (
                        <div key={index} className="flex-1 flex flex-col items-center h-full">
                            <div className="w-full flex-1 flex items-end">
                                {item.count > 0 ? (
                                    <div
                                        className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                                        style={{ 
                                            height: `${heightPercent}%`,
                                            minHeight: item.count > 0 ? '4px' : '0'
                                        }}
                                        title={`${item.count} application${item.count !== 1 ? 's' : ''} in ${item.month}`}
                                    ></div>
                                ) : (
                                    <div className="w-full" style={{ height: '2px', backgroundColor: 'transparent' }}></div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.month}</p>
                        </div>
                    );
                })}
                {!hasData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-sm text-gray-400 dark:text-gray-500">No data for the last 6 months</p>
                    </div>
                )}
            </div>
        </div>
    );
};