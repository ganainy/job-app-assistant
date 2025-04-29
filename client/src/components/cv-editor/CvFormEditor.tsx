import React from 'react';
import { EditorProps, CvData } from './types';
import BasicsEditor from './BasicsEditor';
import WorkExperienceEditor from './WorkExperienceEditor';
import EducationEditor from './EducationEditor';
import SkillsEditor from './SkillsEditor';
import ProjectsEditor from './ProjectsEditor';
import LanguagesEditor from './LanguagesEditor';
import CertificatesEditor from './CertificatesEditor';
import { JsonResumeSchema, JsonResumeEducationItem, JsonResumeSkillItem, JsonResumeProjectItem, JsonResumeLanguageItem, JsonResumeCertificateItem, JsonResumeWorkItem, JsonResumeBasics } from '../../../../server/src/types/jsonresume';

const CvFormEditor: React.FC<EditorProps<CvData>> = ({ data, onChange }) => {
    if (!data) {
        return <div>Loading editor...</div>; // Or handle null data state appropriately
    }

    const handleSectionChange = (section: keyof CvData, sectionData: any) => {
        onChange({
            ...data,
            [section]: sectionData,
        });
    };

    return (
        <div className="space-y-6">
            {/* Basics Section */}
            <BasicsEditor
                data={data.basics}
                onChange={(basicsData: JsonResumeBasics | undefined) => handleSectionChange('basics', basicsData)}
            />

            {/* Work Experience Section */}
            <WorkExperienceEditor
                data={data.work}
                onChange={(workData: JsonResumeWorkItem[] | undefined) => handleSectionChange('work', workData)}
            />

            {/* Education Section */}
            <EducationEditor
                data={data.education}
                onChange={(educationData: JsonResumeEducationItem[] | undefined) => handleSectionChange('education', educationData)}
            />
            {/* Skills Section */}
            <SkillsEditor
                data={data.skills}
                onChange={(skillsData: JsonResumeSkillItem[] | undefined) => handleSectionChange('skills', skillsData)}
            />
            {/* Projects Section */}
            <ProjectsEditor
                data={data.projects}
                onChange={(projectsData: JsonResumeProjectItem[] | undefined) => handleSectionChange('projects', projectsData)}
            />
            {/* Languages Section */}
            <LanguagesEditor
                data={data.languages}
                onChange={(languagesData: JsonResumeLanguageItem[] | undefined) => handleSectionChange('languages', languagesData)}
            />
            {/* Awards Section */}
            {/* Certificates Section */}
            <CertificatesEditor
                data={data.certificates}
                onChange={(certificatesData: JsonResumeCertificateItem[] | undefined) => handleSectionChange('certificates', certificatesData)}
            />
        </div>
    );
};

export default CvFormEditor;
