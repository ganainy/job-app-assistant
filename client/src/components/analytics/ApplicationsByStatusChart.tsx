// client/src/components/analytics/ApplicationsByStatusChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ApplicationsByStatusChartProps {
    applicationsByStatus: Record<string, number>;
}

const ApplicationsByStatusChart: React.FC<ApplicationsByStatusChartProps> = ({ applicationsByStatus }) => {
    // Convert the data to an array format for the chart
    const data = Object.entries(applicationsByStatus).map(([name, value]) => ({
        name,
        value,
    }));

    // Define colors for the chart
    const COLORS = [
        '#3B82F6', // blue
        '#10B981', // green
        '#8B5CF6', // purple
        '#F59E0B', // yellow
        '#EF4444', // red
        '#6B7280', // gray
        '#EC4899', // pink
    ];

    // Custom label function
    const renderLabel = (entry: any) => {
        return `${entry.name}: ${entry.value}`;
    };

    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Applications by Status
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
                Applications by Status
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                        }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ApplicationsByStatusChart;

