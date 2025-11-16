import React from 'react';
import { EditorProps, CvData } from './types';
import CvDocumentRenderer from './CvDocumentRenderer';
import { JsonResumeSchema } from '../../../../server/src/types/jsonresume';
import { SectionAnalysisResult } from '../../services/analysisApi';

interface CvFormEditorProps extends EditorProps<CvData> {
    analyses?: Record<string, SectionAnalysisResult[]>;
    onImproveSection?: (sectionName: string, sectionIndex: number, originalData: any) => void;
    improvingSections?: Record<string, boolean>;
}

const CvFormEditor: React.FC<CvFormEditorProps> = ({
    data,
    onChange,
    analyses,
    onImproveSection,
    improvingSections
}) => {
    if (!data) {
        return <div>Loading editor...</div>;
    }

    return (
        <div className="flex justify-center w-full">
            {/* Document Container - A4-like appearance */}
            <div
                className="cv-document-container"
                style={{
                    width: '816px',
                    maxWidth: '100%',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    margin: '0 auto',
                    padding: '0',
                    position: 'relative',
                    borderRadius: '4px',
                    overflow: 'hidden',
                }}
            >
                {/* Page-like background */}
                <div
                    className="cv-page"
                    style={{
                        width: '100%',
                        padding: '40px',
                        backgroundColor: 'white',
                        position: 'relative',
                        minHeight: '1056px',
                    }}
                >
                    <CvDocumentRenderer
                        data={data as JsonResumeSchema}
                        onChange={onChange}
                        analyses={analyses}
                        onImproveSection={onImproveSection}
                        improvingSections={improvingSections}
                    />
                </div>
            </div>
        </div>
    );
};

export default CvFormEditor;
