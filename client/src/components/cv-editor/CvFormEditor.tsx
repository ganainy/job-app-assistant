import React from 'react';
import { EditorProps, CvData } from './types';
import BasicsEditor from './BasicsEditor';
import WorkExperienceEditor from './WorkExperienceEditor';
import EducationEditor from './EducationEditor';
import SkillsEditor from './SkillsEditor';
import ProjectsEditor from './ProjectsEditor';
import LanguagesEditor from './LanguagesEditor';
import AwardsEditor from './AwardsEditor';
import CertificatesEditor from './CertificatesEditor';
import PublicationsEditor from './PublicationsEditor';
import VolunteerEditor from './VolunteerEditor';
import InterestsEditor from './InterestsEditor';
import ReferencesEditor from './ReferencesEditor';
import { JsonResumeSchema, JsonResumeEducationItem, JsonResumeSkillItem, JsonResumeProjectItem, JsonResumeLanguageItem, JsonResumeAwardItem, JsonResumeCertificateItem, JsonResumePublicationItem, JsonResumeVolunteerItem, JsonResumeInterestItem, JsonResumeReferenceItem, JsonResumeWorkItem, JsonResumeBasics } from '../../../../server/src/types/jsonresume';

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
            <AwardsEditor
                data={data.awards}
                onChange={(awardsData: JsonResumeAwardItem[] | undefined) => handleSectionChange('awards', awardsData)}
            />
            {/* Certificates Section */}
            <CertificatesEditor
                data={data.certificates}
                onChange={(certificatesData: JsonResumeCertificateItem[] | undefined) => handleSectionChange('certificates', certificatesData)}
            />
            {/* Publications Section */}
            <PublicationsEditor
                data={data.publications}
                onChange={(publicationsData: JsonResumePublicationItem[] | undefined) => handleSectionChange('publications', publicationsData)}
            />
            {/* Volunteer Section */}
            <VolunteerEditor
                data={data.volunteer}
                onChange={(volunteerData: JsonResumeVolunteerItem[] | undefined) => handleSectionChange('volunteer', volunteerData)}
            />
            {/* Interests Section */}
            <InterestsEditor
                data={data.interests}
                onChange={(interestsData: JsonResumeInterestItem[] | undefined) => handleSectionChange('interests', interestsData)}
            />
            {/* References Section */}
            <ReferencesEditor
                data={data.references}
                onChange={(referencesData: JsonResumeReferenceItem[] | undefined) => handleSectionChange('references', referencesData)}
            />
        </div>
    );
};

export default CvFormEditor;
