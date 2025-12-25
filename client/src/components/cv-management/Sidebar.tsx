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
        <div className={`flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${className}`}>
            {/* Header */}
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 border-2 border-white dark:border-gray-800 shadow-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">My CVs</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage your documents</p>
                    </div>
                </div>

                {/* CV List */}
                <div className="space-y-1">
                    {/* Master CV */}
                    {masterCv && (
                        <div
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group ${activeCvId === 'master'
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <button
                                onClick={() => onSelectCv('master')}
                                className="flex items-center gap-3 flex-1 min-w-0"
                            >
                                <svg className={`w-5 h-5 flex-shrink-0 ${activeCvId === 'master' ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate text-sm">
                                    {masterCv.basics?.name ? `${masterCv.basics.name}_CV.pdf` : 'CV_Document_1.pdf'}
                                </span>
                            </button>
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onReplaceCv && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReplaceCv('master');
                                        }}
                                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                        title="Replace CV"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                        title="Delete CV"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group ${activeCvId === job._id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <button
                                onClick={() => onSelectCv(job._id)}
                                className="flex items-center gap-3 flex-1 min-w-0"
                            >
                                <svg className={`w-5 h-5 flex-shrink-0 ${activeCvId === job._id ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate text-sm">
                                    {job.jobTitle ? `${job.jobTitle.replace(/\s+/g, '_')}_CV.pdf` : 'Job_CV.pdf'}
                                </span>
                            </button>
                            {/* Action Buttons - Job CVs only show delete since they're tied to jobs */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onDeleteCv && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteCv(job._id);
                                        }}
                                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                        title="Delete CV"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Footer Action */}
            <div className="p-4">
                <button
                    onClick={onAddNewCv}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                    Add New CV
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
