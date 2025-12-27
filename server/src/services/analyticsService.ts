
import JobApplication from '../models/JobApplication';
import mongoose from 'mongoose';

export const getJobApplicationStats = async (userId: string, monthFilter?: string) => {
    // Base match criteria
    const matchStage: any = {
        userId: new mongoose.Types.ObjectId(userId),
        showInDashboard: true, // Only count jobs shown in dashboard
        deletedAt: null
    };

    // If filter is provided (format "YYYY-MM"), restrict date range
    if (monthFilter) {
        const startDate = new Date(`${monthFilter}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        matchStage.createdAt = {
            $gte: startDate,
            $lt: endDate
        };
    }

    // Determine grouping format: Daily if filtered by month, otherwise Monthly
    const dateFormat = monthFilter ? '%Y-%m-%d' : '%Y-%m';

    const stats = await JobApplication.aggregate([
        {
            $match: matchStage
        },
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
                // Group by [Month or Day] and status for multi-line chart
                applicationsOverTimeByStatus: [
                    {
                        $group: {
                            _id: {
                                date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                                status: '$status'
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.date': 1 } },
                ],
            },
        },
    ]);

    // Transform applicationsOverTimeByStatus into a more usable format
    // From: [{ _id: { date: '2024-12-05', status: 'Applied' }, count: 1 }, ...]
    // To: [{ month: '2024-12-05', Applied: 1, ... }, ...] (keeping key as 'month' for frontend compatibility)
    const statusByDate: Record<string, Record<string, number>> = {};
    const allStatuses = ['Applied', 'Not Applied', 'Interview', 'Assessment', 'Rejected', 'Closed', 'Offer'];

    // Safety check if aggregation returned nothing
    if (stats[0].applicationsOverTimeByStatus) {
        stats[0].applicationsOverTimeByStatus.forEach((item: any) => {
            const dateKey = item._id.date;
            const status = item._id.status;
            if (!statusByDate[dateKey]) {
                statusByDate[dateKey] = {};
                allStatuses.forEach(s => statusByDate[dateKey][s] = 0);
            }
            statusByDate[dateKey][status] = item.count;
        });
    }

    const applicationsOverTimeByStatus = Object.entries(statusByDate)
        .map(([date, statuses]) => ({
            month: date,
            ...statuses
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

    return {
        totalApplications: stats[0].totalApplications[0]?.count || 0,
        applicationsByStatus: stats[0].applicationsByStatus || [],
        applicationsOverTime: stats[0].applicationsOverTime || [],
        applicationsOverTimeByStatus,
    };
};
