
import JobApplication from '../models/JobApplication';
import mongoose from 'mongoose';

export const getJobApplicationStats = async (userId: string) => {
    const stats = await JobApplication.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $facet: {
                totalApplications: [{ $count: 'count' }],
                applicationsByStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                applicationsOverTime: [
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ],
            },
        },
    ]);

    return {
        totalApplications: stats[0].totalApplications[0]?.count || 0,
        applicationsByStatus: stats[0].applicationsByStatus,
        applicationsOverTime: stats[0].applicationsOverTime,
    };
};
