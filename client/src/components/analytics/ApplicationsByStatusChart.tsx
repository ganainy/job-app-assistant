
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ApplicationsByStatusChartProps {
    data: { _id: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const ApplicationsByStatusChart: React.FC<ApplicationsByStatusChartProps> = ({ data }) => {
    // Filter out statuses with 0 count for cleaner chart
    const chartData = data.filter(item => item.count > 0).map(item => ({
        name: item._id,
        value: item.count,
    }));

    if (chartData.length === 0) {
        return (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No application status data to display.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};
