import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { JsonResumeSchema } from '../../../../server/src/types/jsonresume';
import { getTemplate, TemplateConfig } from '../../templates/config';
import { TemplateWrapper } from '../../templates/TemplateWrapper';

interface CvLivePreviewProps {
  data: JsonResumeSchema | null;
  templateId: string;
  onTemplateChange?: (templateId: string) => void;
  className?: string;
}

/** Ref API exposed by CvLivePreview */
export type CvLivePreviewRef = HTMLDivElement;

const CvLivePreview = forwardRef<HTMLDivElement, CvLivePreviewProps>(({
  data,
  templateId,
  onTemplateChange,
  className = '',
}, ref) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<TemplateConfig[]>([]);

  // Expose the preview element via ref - Forwarding direct DOM ref now for react-to-print
  // useImperativeHandle(ref, () => ({
  //   getPreviewElement: () => previewContainerRef.current,
  // }), []);

  useEffect(() => {
    const template = getTemplate(templateId);
    if (template) {
      setSelectedTemplate(template);
    }
  }, [templateId]);

  useEffect(() => {
    import('../../templates/config').then((module) => {
      setAvailableTemplates(module.getAllTemplates());
    });
  }, []);

  if (!data) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">No CV data available for preview</p>
        </div>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Template not found</p>
        </div>
      </div>
    );
  }

  const handleTemplateChange = (newTemplateId: string) => {
    if (onTemplateChange) {
      onTemplateChange(newTemplateId);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {availableTemplates.length > 0 && (
        <div className="mb-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template:
          </label>
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="bg-white dark:bg-white shadow-lg mx-auto"
          style={{ maxWidth: '816px', width: '100%' }}
          id="cv-preview-container"
        >
          <div ref={previewRef} className="cv-preview-container">
            <TemplateWrapper
              ref={previewRef}
              data={data}
              templateId={templateId}
              TemplateComponent={selectedTemplate.component}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

CvLivePreview.displayName = 'CvLivePreview';

export default CvLivePreview;
