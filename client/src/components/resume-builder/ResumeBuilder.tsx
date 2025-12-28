import React from 'react';
import { JsonResumeSchema } from '../../../../server/src/types/jsonresume';
import {
    ProfileForm,
    WorkExperiencesForm,
    EducationsForm,
    SkillsForm,
    ProjectsForm,
    LanguagesForm,
    CertificatesForm,
} from './Forms';

interface ResumeBuilderProps {
    data: JsonResumeSchema;
    onChange: (data: JsonResumeSchema) => void;
    onImproveSection?: (sectionName: string, sectionIndex: number, originalData: any, customInstructions?: string) => void;
    improvingSections?: Record<string, boolean>;
}

/**
 * ResumeBuilder is the main container that combines all resume section forms
 * into a cohesive resume building experience.
 */
export const ResumeBuilder: React.FC<ResumeBuilderProps> = ({
    data,
    onChange,
    onImproveSection,
    improvingSections = {},
}) => {
    // Handler for improving the summary/profile section
    const handleImproveProfile = (customInstructions?: string) => {
        if (onImproveSection && data.basics) {
            onImproveSection('basics', 0, data.basics, customInstructions);
        }
    };

    // Handler for improving work experience entries
    const handleImproveWork = (index: number, customInstructions?: string) => {
        if (onImproveSection && data.work?.[index]) {
            onImproveSection('work', index, data.work[index], customInstructions);
        }
    };

    return (
        <div className="resume-builder flex flex-col gap-6 max-w-3xl mx-auto p-4">
            {/* Profile/Basics Section */}
            <ProfileForm
                data={data}
                onChange={onChange}
                onImprove={handleImproveProfile}
                isImproving={improvingSections['basics-0'] || false}
            />

            {/* Work Experience Section */}
            <WorkExperiencesForm
                data={data}
                onChange={onChange}
                onImprove={handleImproveWork}
                improvingSections={improvingSections}
            />

            {/* Projects Section */}
            <ProjectsForm
                data={data}
                onChange={onChange}
            />

            {/* Education Section */}
            <EducationsForm
                data={data}
                onChange={onChange}
            />

            {/* Skills Section */}
            <SkillsForm
                data={data}
                onChange={onChange}
            />

            {/* Languages Section */}
            <LanguagesForm
                data={data}
                onChange={onChange}
            />

            {/* Certifications Section */}
            <CertificatesForm
                data={data}
                onChange={onChange}
            />
        </div>
    );
};

export default ResumeBuilder;
