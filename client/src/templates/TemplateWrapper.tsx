import { forwardRef } from 'react';
import { JsonResumeSchema } from '../../../server/src/types/jsonresume';
import { transformJsonResumeToResumeData, ResumeData } from '../utils/cvDataTransform';

interface TemplateWrapperProps {
  data: JsonResumeSchema;
  templateId: string;
  TemplateComponent: React.ForwardRefExoticComponent<{ data: ResumeData } & React.RefAttributes<HTMLDivElement>>;
}

export const TemplateWrapper = forwardRef<HTMLDivElement, TemplateWrapperProps>(
  ({ data, templateId, TemplateComponent }, ref) => {
    const transformedData = transformJsonResumeToResumeData(data, templateId);
    return <TemplateComponent ref={ref} data={transformedData} />;
  }
);

TemplateWrapper.displayName = 'TemplateWrapper';

