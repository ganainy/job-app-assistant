import React from 'react';
import { JobApplication } from '../../services/jobApi';
import { JsonResumeSchema } from '../../../../server/src/types/jsonresume';

interface SidebarProps {
    masterCv: JsonResumeSchema | null;
    jobCvs: JobApplication[];
    activeCvId: string;
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
    return (
        <div className={`flex flex-row items-center w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-gray-700 mr-4 flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 border border-white dark:border-gray-800 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">My CVs</h2>
                </div>
            </div>

            {/* CV List - Horizontal Scroll */}
            <div className="flex items-center gap-2 flex-1 overflow-x-auto min-w-0 no-scrollbar">
                {/* Master CV */}
                {masterCv && (
                    <div
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-left group border ${activeCvId === 'master'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium'
                            : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <button
                            onClick={() => onSelectCv('master')}
                            className="flex items-center gap-2 min-w-0"
                        >
                            <svg className={`w-4 h-4 flex-shrink-0 ${activeCvId === 'master' ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate text-sm max-w-[150px]">
                                {masterCv.basics?.name ? `${masterCv.basics.name}_CV.pdf` : 'CV_Document_1.pdf'}
                            </span>
                        </button>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-1 border-l border-gray-200 dark:border-gray-600 ml-1">
                            {onReplaceCv && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReplaceCv('master');
                                    }}
                                    className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                    title="Replace CV"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </button>
                            )}
                            {onDeleteCv && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteCv('master');
                                    }}
                                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                    title="Delete CV"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Job CVs */}
                {jobCvs.map((job) => (
                    <div
                        key={job._id}
                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-left group border ${activeCvId === job._id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium'
                            : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <button
                            onClick={() => onSelectCv(job._id)}
                            className="flex items-center gap-2 min-w-0"
                        >
                            <svg className={`w-4 h-4 flex-shrink-0 ${activeCvId === job._id ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate text-sm max-w-[150px]">
                                {job.jobTitle ? `${job.jobTitle.replace(/\s+/g, '_')}_CV.pdf` : 'Job_CV.pdf'}
                            </span>
                        </button>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-1 border-l border-gray-200 dark:border-gray-600 ml-1">
                            {onDeleteCv && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteCv(job._id);
                                    }}
                                    className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                    title="Delete CV"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Spacer/Separator */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-4 flex-shrink-0"></div>

            {/* Add New CV Button */}
            <button
                onClick={onAddNewCv}
                className="flex flex-shrink-0 items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add CV</span>
            </button>
        </div>
    );
};

export default Sidebar;
