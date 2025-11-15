import React, { useState } from 'react';
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
    }

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

    return (
        <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    {onAnalyzeSection && (
                        <button
                            onClick={() => onAnalyzeSection('basics')}
                            disabled={analyzingSections['basics']}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                            {analyzingSections['basics'] ? 'Analyzing...' : 'Analyze Section'}
                        </button>
                    )}
                </div>
                <BasicsEditor
                    data={data.basics}
                    onChange={(basicsData: JsonResumeBasics | undefined) => handleSectionChange('basics', basicsData)}
                    analysis={getSectionAnalysis('basics')}
                    onApplyImprovements={() => handleApplyImprovements('basics')}
                />
            </div>

            <div className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Work Experience</h3>
                    {onAnalyzeSection && (
                        <button
                            onClick={() => onAnalyzeSection('work')}
                            disabled={analyzingSections['work']}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                            {analyzingSections['work'] ? 'Analyzing...' : 'Analyze Section'}
                        </button>
                    )}
                </div>
                <WorkExperienceEditor
                    data={data.work}
                    onChange={(workData: JsonResumeWorkItem[] | undefined) => handleSectionChange('work', workData)}
                    analysis={getSectionAnalysis('work')}
                    onApplyImprovements={() => handleApplyImprovements('work')}
                />
            </div>

            <div className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Education</h3>
                    {onAnalyzeSection && (
                        <button
                            onClick={() => onAnalyzeSection('education')}
                            disabled={analyzingSections['education']}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                            {analyzingSections['education'] ? 'Analyzing...' : 'Analyze Section'}
                        </button>
                    )}
                </div>
                <EducationEditor
                    data={data.education}
                    onChange={(educationData: JsonResumeEducationItem[] | undefined) => handleSectionChange('education', educationData)}
                    analysis={getSectionAnalysis('education')}
                    onApplyImprovements={() => handleApplyImprovements('education')}
                />
            </div>

            <div className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Skills</h3>
                    {onAnalyzeSection && (
                        <button
                            onClick={() => onAnalyzeSection('skills')}
                            disabled={analyzingSections['skills']}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                            {analyzingSections['skills'] ? 'Analyzing...' : 'Analyze Section'}
                        </button>
                    )}
                </div>
                <SkillsEditor
                    data={data.skills}
                    onChange={(skillsData: JsonResumeSkillItem[] | undefined) => handleSectionChange('skills', skillsData)}
                    analysis={getSectionAnalysis('skills')}
                    onApplyImprovements={() => handleApplyImprovements('skills')}
                />
            </div>

            <div className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Projects</h3>
                    {onAnalyzeSection && (
                        <button
                            onClick={() => onAnalyzeSection('projects')}
                            disabled={analyzingSections['projects']}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                            {analyzingSections['projects'] ? 'Analyzing...' : 'Analyze Section'}
                        </button>
                    )}
                </div>
                <ProjectsEditor
                    data={data.projects}
                    onChange={(projectsData: JsonResumeProjectItem[] | undefined) => handleSectionChange('projects', projectsData)}
                    analysis={getSectionAnalysis('projects')}
                    onApplyImprovements={() => handleApplyImprovements('projects')}
                />
            </div>

            <div className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Languages</h3>
                    {onAnalyzeSection && (
                        <button
                            onClick={() => onAnalyzeSection('languages')}
                            disabled={analyzingSections['languages']}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                            {analyzingSections['languages'] ? 'Analyzing...' : 'Analyze Section'}
                        </button>
                    )}
                </div>
                <LanguagesEditor
                    data={data.languages}
                    onChange={(languagesData: JsonResumeLanguageItem[] | undefined) => handleSectionChange('languages', languagesData)}
                    analysis={getSectionAnalysis('languages')}
                    onApplyImprovements={() => handleApplyImprovements('languages')}
                />
            </div>

            <div className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Certificates</h3>
                    {onAnalyzeSection && (
                        <button
                            onClick={() => onAnalyzeSection('certificates')}
                            disabled={analyzingSections['certificates']}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                            {analyzingSections['certificates'] ? 'Analyzing...' : 'Analyze Section'}
                        </button>
                    )}
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
};

export default CvFormEditor;
