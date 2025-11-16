// client/src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { getCurrentUserProfile, UserProfile } from '../services/authApi';
import { getApplicationStats, ApplicationStats } from '../services/analyticsApi';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';

const ProfilePage: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<ApplicationStats | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const [profileData, statsData] = await Promise.all([
                    getCurrentUserProfile(),
                    getApplicationStats(),
                ]);
                setProfile(profileData);
                setStats(statsData);
            } catch (err: any) {
                console.error('Error fetching profile data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load profile data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getInitials = (email: string): string => {
        if (!email) return 'U';
        return email.charAt(0).toUpperCase();
    };

    const getStatusColor = (status: string): string => {
        const statusColors: Record<string, string> = {
            'Applied': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800',
            'Interview': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800',
            'Assessment': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800',
            'Offer': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
            'Rejected': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800',
            'Not Applied': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700',
            'Closed': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700',
        };
        return statusColors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 border border-slate-200 dark:border-slate-700">
                    <LoadingSkeleton lines={5} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <ErrorAlert message={error} />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Profile Header Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 mb-6 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32"></div>
                <div className="px-8 pb-8 -mt-16">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-3xl border-4 border-white dark:border-slate-800 shadow-lg mb-4">
                        {profile ? getInitials(profile.email) : 'U'}
                    </div>

                    {/* User Info */}
                    <div className="mt-4">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            Profile
                        </h1>
                        {profile && (
                            <>
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                    <p className="text-lg text-slate-700 dark:text-slate-300">{profile.email}</p>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">
                                        Member since {formatDate(profile.createdAt)}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Statistics Section */}
            {stats && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                        Application Statistics
                    </h2>

                    {/* Total Applications Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-6 mb-6 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                                    Total Applications
                                </p>
                                <p className="text-4xl font-bold text-indigo-900 dark:text-indigo-100">
                                    {stats.totalApplications}
                                </p>
                            </div>
                            <div className="bg-indigo-500 text-white rounded-lg p-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                            Status Breakdown
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.applicationsByStatus.map((status) => (
                                <div
                                    key={status._id}
                                    className={`${getStatusColor(status._id)} rounded-lg p-4 border-2 transition-transform hover:scale-105`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium mb-1">{status._id}</p>
                                            <p className="text-2xl font-bold">{status.count}</p>
                                        </div>
                                        <div className="text-2xl opacity-75">
                                            {status._id === 'Applied' && '✓'}
                                            {status._id === 'Interview' && '📅'}
                                            {status._id === 'Assessment' && '📝'}
                                            {status._id === 'Offer' && '🎉'}
                                            {status._id === 'Rejected' && '✗'}
                                            {status._id === 'Not Applied' && '○'}
                                            {status._id === 'Closed' && '🔒'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {stats && stats.totalApplications === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-600 dark:text-slate-400 text-base">
                        No applications yet. Start tracking your job applications from the Dashboard!
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;