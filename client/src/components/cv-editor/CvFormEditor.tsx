import React, { useState, useMemo } from 'react';
import { EditorProps, CvData } from './types';
import BasicsEditor from './BasicsEditor';
import WorkExperienceEditor from './WorkExperienceEditor';
import EducationEditor from './EducationEditor';
import SkillsEditor from './SkillsEditor';
import ProjectsEditor from './ProjectsEditor';
import LanguagesEditor from './LanguagesEditor';
import CertificatesEditor from './CertificatesEditor';
import { JsonResumeSchema, JsonResumeEducationItem, JsonResumeSkillItem, JsonResumeProjectItem, JsonResumeLanguageItem, JsonResumeCertificateItem, JsonResumeWorkItem, JsonResumeBasics } from '../../../../server/src/types/jsonresume';
import { AnalysisResult, generateImprovement } from '../../services/analysisApi';

interface CvFormEditorProps extends EditorProps<CvData> {
    analysisResult?: AnalysisResult | null;
    onAnalyzeSection?: (section: string) => void;
    analyzingSections?: Record<string, boolean>;
}

const CvFormEditor: React.FC<CvFormEditorProps> = ({
    data,
    onChange,
    analysisResult,
    onAnalyzeSection,
    analyzingSections = {}
}) => {
    const [generatingImprovements, setGeneratingImprovements] = useState<Record<string, boolean>>({});
    const [currentPage, setCurrentPage] = useState(1);

    if (!data) {
        return <div>Loading editor...</div>;
    }

    const handleSectionChange = (section: keyof CvData, sectionData: any) => {
        onChange({
            ...data,
            [section]: sectionData,
        });
    };

    // Helper to get analysis for a specific section key
    const getSectionAnalysis = (sectionKey: string) => {
        return analysisResult?.sectionScores?.[sectionKey] || null;
    };

    const handleApplyImprovements = async (section: string) => {
        if (!analysisResult?.id) return;

        setGeneratingImprovements(prev => ({ ...prev, [section]: true }));
        try {
            const response = await generateImprovement(analysisResult.id, section, JSON.stringify(data[section]));
            if (response.improvement) {
                handleSectionChange(section as keyof CvData, JSON.parse(response.improvement));
            }
        } catch (error) {
            console.error(`Error applying improvements to ${section}:`, error);
        } finally {
            setGeneratingImprovements(prev => ({ ...prev, [section]: false }));
        }
    };

    // Calculate total pages based on content
    const totalPages = useMemo(() => {
        const hasWork = data.work && data.work.length > 0;
        const hasEducation = data.education && data.education.length > 0;
        const hasSkills = data.skills && data.skills.length > 0;
        const hasProjects = data.projects && data.projects.length > 0;
        const hasLanguages = data.languages && data.languages.length > 0;
        const hasCertificates = data.certificates && data.certificates.length > 0;
        
        let pages = 1; // At least page 1 with basics
        if (hasWork || hasEducation || hasSkills || hasProjects || hasLanguages || hasCertificates) {
            pages = 2; // At least 2 pages
            if (hasProjects || hasLanguages || hasCertificates) {
                pages = 3; // At least 3 pages
            }
        }
        return pages;
    }, [data]);

    // Render sections based on current page
    const renderPage = () => {
        switch (currentPage) {
            case 1:
                return (
                    <div className="space-y-3">
                        {/* Basics - Full Width */}
                        <div className="p-2 border-b dark:border-gray-700">
                            <div className="mb-2">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
                            </div>
                            <BasicsEditor
                                data={data.basics}
                                onChange={(basicsData: JsonResumeBasics | undefined) => handleSectionChange('basics', basicsData)}
                                analysis={getSectionAnalysis('basics')}
                                onApplyImprovements={() => handleApplyImprovements('basics')}
                            />
                        </div>

                        {/* Work Experience - Full Width */}
                        <div className="p-2 border-b dark:border-gray-700">
                            <div className="mb-2">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Work Experience</h3>
                            </div>
                            <WorkExperienceEditor
                                data={data.work}
                                onChange={(workData: JsonResumeWorkItem[] | undefined) => handleSectionChange('work', workData)}
                                analysis={getSectionAnalysis('work')}
                                onApplyImprovements={() => handleApplyImprovements('work')}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-3">
                        {/* Education and Skills - Side by Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-2 border-b dark:border-gray-700">
                                <div className="mb-2">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Education</h3>
                                </div>
                                <EducationEditor
                                    data={data.education}
                                    onChange={(educationData: JsonResumeEducationItem[] | undefined) => handleSectionChange('education', educationData)}
                                    analysis={getSectionAnalysis('education')}
                                    onApplyImprovements={() => handleApplyImprovements('education')}
                                />
                            </div>

                            <div className="p-2 border-b dark:border-gray-700">
                                <div className="mb-2">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Skills</h3>
                                </div>
                                <SkillsEditor
                                    data={data.skills}
                                    onChange={(skillsData: JsonResumeSkillItem[] | undefined) => handleSectionChange('skills', skillsData)}
                                    analysis={getSectionAnalysis('skills')}
                                    onApplyImprovements={() => handleApplyImprovements('skills')}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-3">
                        {/* Projects and Languages - Side by Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-2 border-b dark:border-gray-700">
                                <div className="mb-2">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Projects</h3>
                                </div>
                                <ProjectsEditor
                                    data={data.projects}
                                    onChange={(projectsData: JsonResumeProjectItem[] | undefined) => handleSectionChange('projects', projectsData)}
                                    analysis={getSectionAnalysis('projects')}
                                    onApplyImprovements={() => handleApplyImprovements('projects')}
                                />
                            </div>

                            <div className="p-2 border-b dark:border-gray-700">
                                <div className="mb-2">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Languages</h3>
                                </div>
                                <LanguagesEditor
                                    data={data.languages}
                                    onChange={(languagesData: JsonResumeLanguageItem[] | undefined) => handleSectionChange('languages', languagesData)}
                                    analysis={getSectionAnalysis('languages')}
                                    onApplyImprovements={() => handleApplyImprovements('languages')}
                                />
                            </div>
                        </div>

                        {/* Certificates - Full Width */}
                        <div className="p-2 border-b dark:border-gray-700">
                            <div className="mb-2">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Certificates</h3>
                            </div>
                            <CertificatesEditor
                                data={data.certificates}
                                onChange={(certificatesData: JsonResumeCertificateItem[] | undefined) => handleSectionChange('certificates', certificatesData)}
                                analysis={getSectionAnalysis('certificates')}
                                onApplyImprovements={() => handleApplyImprovements('certificates')}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-3">
            {/* Page Content */}
            <div className="min-h-[1056px] bg-white dark:bg-gray-800 p-4 border dark:border-gray-700 rounded shadow-sm">
                {renderPage()}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default CvFormEditor;
