import React, { useState } from 'react';
import { CVDocument } from '../../services/cvApi';

interface SidebarProps {
    masterCv: CVDocument | null;
    jobCvs: CVDocument[];
    activeCvId: string | null;
    onSelectCv: (id: string) => void;
    onAddNewCv: () => void;
    onDeleteCv?: (id: string) => void;
    onReplaceCv?: (id: string) => void;
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    masterCv,
    jobCvs,
    activeCvId,
    onSelectCv,
    onAddNewCv,
    onDeleteCv,
    onReplaceCv,
    className = ''
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredJobCvs = jobCvs.filter(cv => {
        const title = cv.jobApplication?.jobTitle || 'Job Application CV';
        return title.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return `${Math.floor(diffInSeconds / 604800)}w ago`;
    };

    const CvCard = ({ cv, isMaster = false }: { cv: CVDocument, isMaster?: boolean }) => {
        const isActive = activeCvId === cv._id;
        const title = isMaster
            ? (cv.cvJson?.basics?.name ? `${cv.cvJson.basics.name}` : 'Master CV')
            : (cv.jobApplication?.jobTitle || 'Job Application CV');

        return (
            <div
                onClick={() => onSelectCv(cv._id)}
                className={`
                    group relative p-4 rounded-xl border cursor-pointer transition-all duration-200
                    ${isActive
                        ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }
                    dark:bg-gray-800 dark:border-gray-700
                `}
            >
                {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
                )}

                <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-semibold text-sm line-clamp-1 ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'}`}>
                        {title}
                    </h3>
                    {isMaster && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            MASTER
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500 self-end">
                        Edited: {getRelativeTime(cv.updatedAt)}
                    </span>

                    <div className="flex gap-1.5">
                        {cv.isMasterCv && (
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-500 font-medium">
                                Design
                            </span>
                        )}
                        {!cv.isMasterCv && (
                            <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                Job
                            </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-500 font-medium">
                            English
                        </span>
                    </div>
                </div>

                {/* Hover Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onDeleteCv && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCv(cv._id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 bg-white/80 dark:bg-gray-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/40"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
            <div className="p-4 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Documents</h2>

                {/* Search */}
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Filter CVs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full py-2 pl-9 pr-4 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 custom-scrollbar">
                {masterCv && <CvCard cv={masterCv} isMaster />}
                {filteredJobCvs.map(cv => (
                    <CvCard key={cv._id} cv={cv} />
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
