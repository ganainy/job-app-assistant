// client/src/components/analytics/ApplicationsOverTimeChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ApplicationsOverTimeChartProps {
    applicationsOverTime: Array<{
        date: string;
        count: number;
    }>;
}

const ApplicationsOverTimeChart: React.FC<ApplicationsOverTimeChartProps> = ({ applicationsOverTime }) => {
    // Format date for display (e.g., "2024-01-15" -> "Jan 15")
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Prepare data for the chart
    const chartData = applicationsOverTime.map((item) => ({
        date: formatDate(item.date),
        fullDate: item.date,
        count: item.count,
    }));

    if (chartData.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Applications Over Time
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No data available
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Applications Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                        }}
                        labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                                return `Date: ${payload[0].payload.fullDate}`;
                            }
                            return label;
                        }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#3B82F6" name="Applications" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ApplicationsOverTimeChart;

