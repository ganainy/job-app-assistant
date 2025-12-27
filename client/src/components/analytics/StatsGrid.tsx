
import React, { useMemo } from 'react';
import { Send, MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { ApplicationStats } from '../../services/analyticsApi';
import { JobApplication } from '../../services/jobApi';

interface StatsGridProps {
    stats: ApplicationStats | null;
    jobs?: JobApplication[];
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, jobs = [] }) => {

    const metrics = useMemo(() => {
        if (!stats) return {
            total: 0,
            responseRate: 0,
            interviews: 0,
            offers: 0,
            trends: {
                total: null,
                response: null,
                interviews: null,
                offers: null
            }
        };

        const total = stats.totalApplications || 0;

        const getCount = (status: string) =>
            stats.applicationsByStatus.find(s => s._id === status)?.count || 0;

        const interviews = getCount('Interview');
        const offers = getCount('Offer');
        const rejections = getCount('Rejected');

        const responses = interviews + offers + rejections;
        const responseRate = total > 0 ? Math.round((responses / total) * 1000) / 10 : 0;

        // --- Trend Calculation ---
        const history = stats.applicationsOverTimeByStatus || [];
        // Sort by month ascending
        const sortedHistory = [...history].sort((a, b) => a.month.localeCompare(b.month));

        // Get this month (latest data point) 
        const currentMonthData = sortedHistory[sortedHistory.length - 1];

        let prevMonthData = null;

        if (currentMonthData && currentMonthData.month.match(/^\d{4}-\d{2}$/)) {
            // Parse current month string "YYYY-MM"
            const [y, m] = currentMonthData.month.split('-').map(Number);
            // Calculate previous month
            const prevDate = new Date(y, m - 2, 1); // m is 1-indexed, so m-1 is current index, m-2 is prev index
            // Format back to YYYY-MM
            const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

            // Find data or default to null (which we will handle as 0 later)
            prevMonthData = history.find(d => d.month === prevMonthKey) || null;

            // If we have current data but NO previous data explicitly found, 
            // AND we know previous month *should* be valid (time exists), 
            // we default to 0s to trigger the "100% increase" trend.
            if (!prevMonthData) {
                prevMonthData = {
                    month: prevMonthKey,
                    Applied: 0, 'Not Applied': 0, Interview: 0, Assessment: 0, Rejected: 0, Closed: 0, Offer: 0
                };
            }
        } else if (sortedHistory.length > 1) {
            // Fallback for daily view or other non-standard cases
            prevMonthData = sortedHistory[sortedHistory.length - 2];
        }

        // Helper to calculate percentage change
        const calculateTrend = (current: number, previous: number, label: string = 'vs last month') => {
            // If both are 0, neutral
            if (current === 0 && previous === 0) {
                return { value: 0, label, positive: false, neutral: true };
            }
            // If previous is 0, it's a 100% 'new' increase
            if (previous === 0) {
                return { value: 100, label, positive: true };
            }

            const diff = current - previous;
            const pct = Math.round((diff / previous) * 100);
            return {
                value: Math.abs(pct),
                label,
                positive: pct >= 0,
                neutral: pct === 0
            };
        };

        // Total Applications Trend
        const getTotal = (d: any) => d ? (d.Applied + d['Not Applied'] + d.Interview + d.Assessment + d.Rejected + d.Closed + d.Offer) : 0;
        const currentTotal = getTotal(currentMonthData);
        const prevTotal = getTotal(prevMonthData);
        // Always attempt calculation if we have current data
        const totalTrend = currentMonthData ? calculateTrend(currentTotal, prevTotal) : null;

        // Response Rate Trend
        const getRate = (d: any) => {
            if (!d) return 0;
            const t = getTotal(d);
            if (t === 0) return 0;
            const r = d.Interview + d.Offer + d.Rejected; // heuristic for response
            return (r / t) * 100;
        };
        const currentRate = getRate(currentMonthData);
        const prevRate = getRate(prevMonthData);
        const responseRateDiff = Math.abs(currentRate - prevRate);
        const formattedDiff = Math.round(responseRateDiff * 10) / 10;

        const responseTrend = currentMonthData ? {
            value: formattedDiff,
            label: 'vs last month',
            positive: (currentRate - prevRate) >= 0,
            neutral: formattedDiff === 0
        } : null;

        // Interviews "This Week" (current week starting Monday)
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = now.getDay() || 7;
        if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
        else startOfWeek.setHours(0, 0, 0, 0);

        // Better: Reset to literal start of this week's Monday 00:00
        const monday = new Date(now);
        monday.setDate(now.getDate() - (now.getDay() + 6) % 7);
        monday.setHours(0, 0, 0, 0);

        const interviewsThisWeek = jobs.filter(j =>
            j.status === 'Interview' && new Date(j.updatedAt) >= monday
        ).length;

        const interviewTrend = {
            value: interviewsThisWeek,
            label: 'new this week',
            positive: true,
            neutral: interviewsThisWeek === 0
        };

        // Offers Trend
        const currentOffers = currentMonthData?.Offer || 0;
        const prevOffers = prevMonthData?.Offer || 0;
        const offerDiff = currentOffers - prevOffers;
        const offerTrend = {
            value: Math.abs(offerDiff),
            label: offerDiff === 0 ? 'no change' : 'vs last month',
            positive: offerDiff > 0,
            neutral: offerDiff === 0
        };

        return {
            total,
            responseRate,
            interviews,
            offers,
            trends: {
                total: totalTrend,
                response: responseTrend,
                interviews: interviewTrend,
                offers: offerTrend
            }
        };
    }, [stats, jobs]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
                title="Total Applications"
                value={metrics.total}
                icon={Send}
                iconColor="text-blue-500 dark:text-blue-400"
                iconBgColor="bg-blue-100 dark:bg-blue-900/30"
                trend={metrics.trends.total || undefined}
            />
            <StatsCard
                title="Response Rate"
                value={`${metrics.responseRate}%`}
                icon={MessageSquare}
                iconColor="text-purple-500 dark:text-purple-400"
                iconBgColor="bg-purple-100 dark:bg-purple-900/30"
                trend={metrics.trends.response || undefined}
            />
            <StatsCard
                title="Interviews"
                value={metrics.interviews}
                icon={Calendar}
                iconColor="text-amber-500 dark:text-amber-400"
                iconBgColor="bg-amber-100 dark:bg-amber-900/30"
                trend={metrics.trends.interviews?.neutral ? undefined : {
                    value: metrics.trends.interviews!.value,
                    label: metrics.trends.interviews!.label,
                    positive: metrics.trends.interviews!.positive,
                    neutral: metrics.trends.interviews!.neutral
                }}
            />
            <StatsCard
                title="Offers Received"
                value={metrics.offers}
                icon={CheckCircle}
                iconColor="text-emerald-500 dark:text-emerald-400"
                iconBgColor="bg-emerald-100 dark:bg-emerald-900/30"
                trend={metrics.trends.offers || undefined}
            />
        </div>
    );
};
