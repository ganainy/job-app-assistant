
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ApplicationsOverTimeChartProps {
    data: { _id: string; count: number }[];
}

export const ApplicationsOverTimeChart: React.FC<ApplicationsOverTimeChartProps> = ({ data }) => {
    // Sort data by date to ensure correct chronological order
    const sortedData = [...data].sort((a, b) => new Date(a._id).getTime() - new Date(b._id).getTime());

    if (sortedData.length === 0) {
        return (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No application data over time to display.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={sortedData}
                margin={{
                    top: 5, right: 30, left: 20, bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" dark:stroke="#444" />
                <XAxis dataKey="_id" tick={{ fill: '#666' }} />
                <YAxis allowDecimals={false} tick={{ fill: '#666' }} />
                <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.1)' }}
                    contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '5px', color: '#fff' }}
                    labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Applications" />
            </BarChart>
        </ResponsiveContainer>
    );
};
