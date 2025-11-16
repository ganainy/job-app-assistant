import React from 'react';
import { JsonResumeSchema, JsonResumeBasics, JsonResumeWorkItem, JsonResumeEducationItem, JsonResumeSkillItem, JsonResumeProjectItem, JsonResumeLanguageItem, JsonResumeCertificateItem } from '../../../../server/src/types/jsonresume';
import EditableText from './EditableText';
import EditableTextarea from './EditableTextarea';
import EditableList from './EditableList';
import SectionManager from './SectionManager';

interface CvDocumentRendererProps {
    data: JsonResumeSchema;
    onChange: (data: JsonResumeSchema) => void;
}

const CvDocumentRenderer: React.FC<CvDocumentRendererProps> = ({ data, onChange }) => {
    const basics = data.basics || { name: '', profiles: [] };
    const location = basics.location || {};
    const profiles = basics.profiles || [];

    const handleBasicsChange = (field: keyof JsonResumeBasics, value: string) => {
        onChange({
            ...data,
            basics: {
                ...basics,
                [field]: value,
            },
        });
    };

    const handleLocationChange = (field: string, value: string) => {
        onChange({
            ...data,
            basics: {
                ...basics,
                location: {
                    ...location,
                    [field]: value,
                },
            },
        });
    };

    const handleWorkChange = (index: number, field: keyof JsonResumeWorkItem, value: string | string[]) => {
        const work = [...(data.work || [])];
        work[index] = { ...work[index], [field]: value };
        onChange({ ...data, work });
    };

    const handleEducationChange = (index: number, field: keyof JsonResumeEducationItem, value: string | string[]) => {
        const education = [...(data.education || [])];
        education[index] = { ...education[index], [field]: value };
        onChange({ ...data, education });
    };

    const handleSkillsChange = (index: number, field: keyof JsonResumeSkillItem, value: string | string[]) => {
        const skills = [...(data.skills || [])];
        skills[index] = { ...skills[index], [field]: value };
        onChange({ ...data, skills });
    };

    const handleProjectsChange = (index: number, field: keyof JsonResumeProjectItem, value: string | string[]) => {
        const projects = [...(data.projects || [])];
        projects[index] = { ...projects[index], [field]: value };
        onChange({ ...data, projects });
    };

    const handleLanguagesChange = (index: number, field: keyof JsonResumeLanguageItem, value: string) => {
        const languages = [...(data.languages || [])];
        languages[index] = { ...languages[index], [field]: value };
        onChange({ ...data, languages });
    };

    const handleCertificatesChange = (index: number, field: keyof JsonResumeCertificateItem, value: string) => {
        const certificates = [...(data.certificates || [])];
        certificates[index] = { ...certificates[index], [field]: value };
        onChange({ ...data, certificates });
    };

    const addWorkItem = () => {
        const newItem: JsonResumeWorkItem = {
            name: '',
            position: '',
            startDate: '',
            summary: '',
            highlights: []
        };
        onChange({ ...data, work: [...(data.work || []), newItem] });
    };

    const deleteWorkItem = (index: number) => {
        const work = (data.work || []).filter((_, i) => i !== index);
        onChange({ ...data, work });
    };

    const addEducationItem = () => {
        const newItem: JsonResumeEducationItem = {
            institution: '',
            area: '',
            studyType: '',
            startDate: '',
            courses: []
        };
        onChange({ ...data, education: [...(data.education || []), newItem] });
    };

    const deleteEducationItem = (index: number) => {
        const education = (data.education || []).filter((_, i) => i !== index);
        onChange({ ...data, education });
    };

    const addSkillItem = () => {
        const newItem: JsonResumeSkillItem = {
            name: '',
            level: '',
            keywords: []
        };
        onChange({ ...data, skills: [...(data.skills || []), newItem] });
    };

    const deleteSkillItem = (index: number) => {
        const skills = (data.skills || []).filter((_, i) => i !== index);
        onChange({ ...data, skills });
    };

    const addProjectItem = () => {
        const newItem: JsonResumeProjectItem = {
            name: '',
            description: '',
            highlights: [],
            keywords: []
        };
        onChange({ ...data, projects: [...(data.projects || []), newItem] });
    };

    const deleteProjectItem = (index: number) => {
        const projects = (data.projects || []).filter((_, i) => i !== index);
        onChange({ ...data, projects });
    };

    const addLanguageItem = () => {
        const newItem: JsonResumeLanguageItem = {
            language: '',
            fluency: ''
        };
        onChange({ ...data, languages: [...(data.languages || []), newItem] });
    };

    const deleteLanguageItem = (index: number) => {
        const languages = (data.languages || []).filter((_, i) => i !== index);
        onChange({ ...data, languages });
    };

    const addCertificateItem = () => {
        const newItem: JsonResumeCertificateItem = {
            name: '',
            date: '',
            issuer: '',
            url: ''
        };
        onChange({ ...data, certificates: [...(data.certificates || []), newItem] });
    };

    const deleteCertificateItem = (index: number) => {
        const certificates = (data.certificates || []).filter((_, i) => i !== index);
        onChange({ ...data, certificates });
    };

    return (
        <div className="cv-document" style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.5',
            color: '#333',
            padding: '40px',
        }}>
            {/* Header Section */}
            <div className="header section" style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h1 style={{
                    fontSize: '18pt',
                    color: '#111',
                    marginBottom: '5px',
                    borderBottom: 'none',
                    fontWeight: 'bold'
                }}>
                    <EditableText
                        value={basics.name || ''}
                        onChange={(v) => handleBasicsChange('name', v)}
                        placeholder="Your Name"
                        style={{ fontSize: '18pt', fontWeight: 'bold' }}
                    />
                </h1>
                <p style={{ fontSize: '14pt', color: '#555', marginTop: '0', marginBottom: '10px' }}>
                    <EditableText
                        value={basics.label || ''}
                        onChange={(v) => handleBasicsChange('label', v)}
                        placeholder="Job Title / Label"
                        style={{ fontSize: '14pt', color: '#555' }}
                    />
                </p>
                <div className="contact-info" style={{ fontSize: '10pt', color: '#555', marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '0 8px', justifyContent: 'center', alignItems: 'center' }}>
                    <span>
                        <EditableText
                            value={location.address || ''}
                            onChange={(v) => handleLocationChange('address', v)}
                            placeholder="Address"
                            style={{ fontSize: '10pt' }}
                        />
                    </span>
                    <span>
                        <EditableText
                            value={location.city || ''}
                            onChange={(v) => handleLocationChange('city', v)}
                            placeholder="City"
                            style={{ fontSize: '10pt' }}
                        />
                        {location.postalCode && (
                            <>
                                {' '}
                                <EditableText
                                    value={location.postalCode}
                                    onChange={(v) => handleLocationChange('postalCode', v)}
                                    placeholder="Postal Code"
                                    style={{ fontSize: '10pt' }}
                                />
                            </>
                        )}
                        {location.region && (
                            <>
                                {', '}
                                <EditableText
                                    value={location.region}
                                    onChange={(v) => handleLocationChange('region', v)}
                                    placeholder="Region"
                                    style={{ fontSize: '10pt' }}
                                />
                            </>
                        )}
                    </span>
                    <span style={{ margin: '0 4px' }}>|</span>
                    <span>
                        <EditableText
                            value={basics.phone || ''}
                            onChange={(v) => handleBasicsChange('phone', v)}
                            placeholder="Phone"
                            style={{ fontSize: '10pt' }}
                        />
                    </span>
                    <span style={{ margin: '0 4px' }}>|</span>
                    <span>
                        <EditableText
                            value={basics.email || ''}
                            onChange={(v) => handleBasicsChange('email', v)}
                            placeholder="Email"
                            style={{ fontSize: '10pt' }}
                        />
                    </span>
                    <span style={{ margin: '0 4px' }}>|</span>
                    <span>
                        <EditableText
                            value={basics.url || ''}
                            onChange={(v) => handleBasicsChange('url', v)}
                            placeholder="Website"
                            style={{ fontSize: '10pt' }}
                        />
                    </span>
                </div>
            </div>

            {/* Summary Section */}
            <div className="section summary" style={{ marginBottom: '20px' }}>
                <h2 style={{
                    fontSize: '14pt',
                    color: '#111',
                    marginTop: '20px',
                    marginBottom: '10px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                }}
                className="group"
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#111';
                }}
                >
                    Summary
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </h2>
                <p style={{ fontSize: '11pt', color: '#333', marginBottom: '0.8em' }}>
                    <EditableTextarea
                        value={basics.summary || ''}
                        onChange={(v) => handleBasicsChange('summary', v)}
                        placeholder="Click to add professional summary"
                        style={{ fontSize: '11pt' }}
                    />
                </p>
            </div>

            {/* Work Experience Section */}
            <div className="section work" style={{ marginBottom: '20px' }}>
                <h2 style={{
                    fontSize: '14pt',
                    color: '#111',
                    marginTop: '20px',
                    marginBottom: '10px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                }}
                className="group"
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#111';
                }}
                >
                    Work Experience
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </h2>
                {(data.work || []).length === 0 && (
                    <p style={{ fontSize: '11pt', color: '#999', fontStyle: 'italic' }}>No work experience added yet. Click "Add Work Experience" to add one.</p>
                )}
                {(data.work || []).map((item, index) => (
                    <div key={index} className="item" style={{ marginBottom: '15px', paddingLeft: '5px' }}>
                        <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span className="item-title" style={{ fontSize: '12pt', fontWeight: 'bold', color: '#222' }}>
                                <EditableText
                                    value={item.position || ''}
                                    onChange={(v) => handleWorkChange(index, 'position', v)}
                                    placeholder="Job Title"
                                    style={{ fontSize: '12pt', fontWeight: 'bold' }}
                                />
                            </span>
                            <span className="item-dates" style={{ fontSize: '10pt', color: '#666', whiteSpace: 'nowrap', paddingLeft: '15px' }}>
                                <EditableText
                                    value={item.startDate || ''}
                                    onChange={(v) => handleWorkChange(index, 'startDate', v)}
                                    placeholder="Start Date"
                                    style={{ fontSize: '10pt' }}
                                />
                                {' - '}
                                <EditableText
                                    value={item.endDate || 'Present'}
                                    onChange={(v) => handleWorkChange(index, 'endDate', v)}
                                    placeholder="End Date"
                                    style={{ fontSize: '10pt' }}
                                />
                            </span>
                        </div>
                        <div className="item-subtitle" style={{ fontSize: '11pt', fontStyle: 'italic', color: '#555', marginBottom: '5px' }}>
                            <EditableText
                                value={item.name || item.company || ''}
                                onChange={(v) => handleWorkChange(index, 'name', v)}
                                placeholder="Company Name"
                                style={{ fontSize: '11pt', fontStyle: 'italic' }}
                            />
                        </div>
                        <p className="item-summary" style={{ fontSize: '11pt', marginTop: '5px', marginBottom: '5px' }}>
                            <EditableTextarea
                                value={item.summary || ''}
                                onChange={(v) => handleWorkChange(index, 'summary', v)}
                                placeholder="Click to add job summary"
                                style={{ fontSize: '11pt' }}
                                rows={2}
                            />
                        </p>
                        <div className="item-highlights" style={{ marginTop: '5px' }}>
                            <EditableList
                                items={item.highlights || []}
                                onChange={(items) => handleWorkChange(index, 'highlights', items)}
                                placeholder="Add highlights (one per line)"
                            />
                        </div>
                        <button
                            onClick={() => deleteWorkItem(index)}
                            className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="Delete this work experience"
                        >
                            Delete
                        </button>
                    </div>
                ))}
                <SectionManager sectionName="Work Experience" onAdd={addWorkItem} />
            </div>

            {/* Projects Section */}
            <div className="section projects" style={{ marginBottom: '20px' }}>
                <h2 style={{
                    fontSize: '14pt',
                    color: '#111',
                    marginTop: '20px',
                    marginBottom: '10px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                }}
                className="group"
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#111';
                }}
                >
                    Projects
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </h2>
                    {(data.projects || []).length === 0 && (
                    <p style={{ fontSize: '11pt', color: '#999', fontStyle: 'italic' }}>No projects added yet. Click "Add Project" to add one.</p>
                )}
                {(data.projects || []).map((item, index) => (
                        <div key={index} className="item" style={{ marginBottom: '15px', paddingLeft: '5px' }}>
                            <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span className="item-title" style={{ fontSize: '12pt', fontWeight: 'bold', color: '#222' }}>
                                    <EditableText
                                        value={item.name || ''}
                                        onChange={(v) => handleProjectsChange(index, 'name', v)}
                                        placeholder="Project Name"
                                        style={{ fontSize: '12pt', fontWeight: 'bold' }}
                                    />
                                </span>
                                {(item.startDate || item.endDate) && (
                                    <span className="item-dates" style={{ fontSize: '10pt', color: '#666', whiteSpace: 'nowrap', paddingLeft: '15px' }}>
                                        <EditableText
                                            value={item.startDate || ''}
                                            onChange={(v) => handleProjectsChange(index, 'startDate', v)}
                                            placeholder="Start"
                                            style={{ fontSize: '10pt' }}
                                        />
                                        {item.endDate && (
                                            <>
                                                {' - '}
                                                <EditableText
                                                    value={item.endDate}
                                                    onChange={(v) => handleProjectsChange(index, 'endDate', v)}
                                                    placeholder="End"
                                                    style={{ fontSize: '10pt' }}
                                                />
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>
                            <p className="item-description" style={{ fontSize: '11pt', marginTop: '5px', marginBottom: '5px' }}>
                                <EditableTextarea
                                    value={item.description || ''}
                                    onChange={(v) => handleProjectsChange(index, 'description', v)}
                                    placeholder="Click to add project description"
                                    style={{ fontSize: '11pt' }}
                                    rows={2}
                                />
                            </p>
                            <div className="item-highlights" style={{ marginTop: '5px' }}>
                                <EditableList
                                    items={item.highlights || []}
                                    onChange={(items) => handleProjectsChange(index, 'highlights', items)}
                                    placeholder="Add highlights (one per line)"
                                />
                            </div>
                            <button
                                onClick={() => deleteProjectItem(index)}
                                className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                title="Delete this project"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                <SectionManager sectionName="Project" onAdd={addProjectItem} />
            </div>

            {/* Education Section */}
            <div className="section education" style={{ marginBottom: '20px' }}>
                <h2 style={{
                    fontSize: '14pt',
                    color: '#111',
                    marginTop: '20px',
                    marginBottom: '10px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                }}
                className="group"
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#111';
                }}
                >
                    Education
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </h2>
                {(data.education || []).length === 0 && (
                    <p style={{ fontSize: '11pt', color: '#999', fontStyle: 'italic' }}>No education added yet. Click "Add Education" to add one.</p>
                )}
                {(data.education || []).map((item, index) => (
                    <div key={index} className="item" style={{ marginBottom: '15px', paddingLeft: '5px' }}>
                        <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span className="item-title" style={{ fontSize: '12pt', fontWeight: 'bold', color: '#222' }}>
                                <EditableText
                                    value={item.institution || ''}
                                    onChange={(v) => handleEducationChange(index, 'institution', v)}
                                    placeholder="Institution"
                                    style={{ fontSize: '12pt', fontWeight: 'bold' }}
                                />
                            </span>
                            {(item.startDate || item.endDate) && (
                                <span className="item-dates" style={{ fontSize: '10pt', color: '#666', whiteSpace: 'nowrap', paddingLeft: '15px' }}>
                                    <EditableText
                                        value={item.startDate || ''}
                                        onChange={(v) => handleEducationChange(index, 'startDate', v)}
                                        placeholder="Start"
                                        style={{ fontSize: '10pt' }}
                                    />
                                    {item.endDate && (
                                        <>
                                            {' - '}
                                            <EditableText
                                                value={item.endDate}
                                                onChange={(v) => handleEducationChange(index, 'endDate', v)}
                                                placeholder="End"
                                                style={{ fontSize: '10pt' }}
                                            />
                                        </>
                                    )}
                                </span>
                            )}
                        </div>
                        <div className="item-subtitle" style={{ fontSize: '11pt', fontStyle: 'italic', color: '#555', marginBottom: '5px' }}>
                            <EditableText
                                value={item.studyType || ''}
                                onChange={(v) => handleEducationChange(index, 'studyType', v)}
                                placeholder="Degree"
                                style={{ fontSize: '11pt', fontStyle: 'italic' }}
                            />
                            {item.studyType && item.area && ' in '}
                            {!item.studyType && item.area && ' in '}
                            <EditableText
                                value={item.area || ''}
                                onChange={(v) => handleEducationChange(index, 'area', v)}
                                placeholder="Field"
                                style={{ fontSize: '11pt', fontStyle: 'italic' }}
                            />
                            {item.score && ' (Score: '}
                            {item.score ? (
                                <>
                                    <EditableText
                                        value={item.score}
                                        onChange={(v) => handleEducationChange(index, 'score', v)}
                                        placeholder="Score"
                                        style={{ fontSize: '11pt', fontStyle: 'italic' }}
                                    />
                                    {')'}
                                </>
                            ) : (
                                <span style={{ fontSize: '11pt', color: '#999' }}>
                                    {' '}
                                    <EditableText
                                        value=""
                                        onChange={(v) => handleEducationChange(index, 'score', v)}
                                        placeholder="(optional score)"
                                        style={{ fontSize: '11pt', fontStyle: 'italic' }}
                                    />
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => deleteEducationItem(index)}
                            className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="Delete this education"
                        >
                            Delete
                        </button>
                    </div>
                ))}
                <SectionManager sectionName="Education" onAdd={addEducationItem} />
            </div>

            {/* Skills Section */}
            <div className="section skills" style={{ marginBottom: '20px' }}>
                <h2 style={{
                    fontSize: '14pt',
                    color: '#111',
                    marginTop: '20px',
                    marginBottom: '10px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                }}
                className="group"
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#111';
                }}
                >
                    Skills
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </h2>
                {(data.skills || []).length === 0 && (
                    <p style={{ fontSize: '11pt', color: '#999', fontStyle: 'italic' }}>No skills added yet. Click "Add Skill Category" to add one.</p>
                )}
                {(data.skills || []).map((skillCat, index) => (
                    <div key={index} className="skills-category" style={{ marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '5px', marginTop: '8px', color: '#444' }}>
                                <EditableText
                                    value={skillCat.name || ''}
                                    onChange={(v) => handleSkillsChange(index, 'name', v)}
                                    placeholder="Skill Category"
                                    style={{ fontSize: '11pt', fontWeight: 'bold' }}
                                />
                            </h4>
                        {skillCat.keywords && skillCat.keywords.length > 0 ? (
                            <ul className="skills-list" style={{ listStyle: 'none', paddingLeft: '0', marginTop: '5px' }}>
                                {skillCat.keywords.map((keyword, kIndex) => {
                                    if (!keyword || !keyword.trim()) return null;
                                    return (
                                        <li key={kIndex} style={{
                                            display: 'inline-block',
                                            backgroundColor: '#f0f0f0',
                                            padding: '4px 8px',
                                            marginRight: '6px',
                                            marginBottom: '6px',
                                            borderRadius: '4px',
                                            fontSize: '10pt',
                                            color: '#444'
                                        }}>
                                            <EditableText
                                                value={keyword}
                                                onChange={(v) => {
                                                    const keywords = [...(skillCat.keywords || [])];
                                                    if (v.trim()) {
                                                        keywords[kIndex] = v;
                                                    } else {
                                                        keywords.splice(kIndex, 1);
                                                    }
                                                    handleSkillsChange(index, 'keywords', keywords);
                                                }}
                                                placeholder="Skill"
                                                style={{ fontSize: '10pt' }}
                                            />
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : null}
                        <button
                            onClick={() => {
                                const keywords = [...(skillCat.keywords || []), ''];
                                handleSkillsChange(index, 'keywords', keywords);
                            }}
                            className="mt-1 mr-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="Add skill keyword"
                        >
                            + Add Skill
                        </button>
                        <button
                            onClick={() => deleteSkillItem(index)}
                            className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="Delete this skill category"
                        >
                            Delete
                        </button>
                    </div>
                ))}
                <SectionManager sectionName="Skill Category" onAdd={addSkillItem} />
            </div>

            {/* Languages Section */}
            <div className="section languages" style={{ marginBottom: '20px' }}>
                <h2 style={{
                    fontSize: '14pt',
                    color: '#111',
                    marginTop: '20px',
                    marginBottom: '10px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                }}
                className="group"
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#111';
                }}
                >
                    Languages
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </h2>
                    <ul style={{ listStyle: 'none', padding: '0' }}>
                        {(data.languages || []).map((lang, index) => (
                            <li key={index} style={{ fontSize: '11pt', marginBottom: '5px' }}>
                                <strong>
                                    <EditableText
                                        value={lang.language || ''}
                                        onChange={(v) => handleLanguagesChange(index, 'language', v)}
                                        placeholder="Language"
                                        style={{ fontSize: '11pt', fontWeight: 'bold' }}
                                    />
                                </strong>
                                {lang.fluency && (
                                    <>
                                        {': '}
                                        <EditableText
                                            value={lang.fluency}
                                            onChange={(v) => handleLanguagesChange(index, 'fluency', v)}
                                            placeholder="Fluency"
                                            style={{ fontSize: '11pt' }}
                                        />
                                    </>
                                )}
                                <button
                                    onClick={() => deleteLanguageItem(index)}
                                    className="ml-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                    title="Delete this language"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                {(data.languages || []).length === 0 && (
                    <p style={{ fontSize: '11pt', color: '#999', fontStyle: 'italic' }}>No languages added yet. Click "Add Language" to add one.</p>
                )}
                <SectionManager sectionName="Language" onAdd={addLanguageItem} />
            </div>

            {/* Certificates Section */}
            <div className="section certificates" style={{ marginBottom: '20px' }}>
                <h2 style={{
                    fontSize: '14pt',
                    color: '#111',
                    marginTop: '20px',
                    marginBottom: '10px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                }}
                className="group"
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#111';
                }}
                >
                    Certificates
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </h2>
                    {(data.certificates || []).length === 0 && (
                    <p style={{ fontSize: '11pt', color: '#999', fontStyle: 'italic' }}>No certificates added yet. Click "Add Certificate" to add one.</p>
                )}
                {(data.certificates || []).map((cert, index) => (
                        <div key={index} className="item" style={{ marginBottom: '15px', paddingLeft: '5px' }}>
                            <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span className="item-title" style={{ fontSize: '12pt', fontWeight: 'bold', color: '#222' }}>
                                    <EditableText
                                        value={cert.name || ''}
                                        onChange={(v) => handleCertificatesChange(index, 'name', v)}
                                        placeholder="Certificate Name"
                                        style={{ fontSize: '12pt', fontWeight: 'bold' }}
                                    />
                                </span>
                                {cert.date && (
                                    <span className="item-dates" style={{ fontSize: '10pt', color: '#666', whiteSpace: 'nowrap', paddingLeft: '15px' }}>
                                        <EditableText
                                            value={cert.date}
                                            onChange={(v) => handleCertificatesChange(index, 'date', v)}
                                            placeholder="Date"
                                            style={{ fontSize: '10pt' }}
                                        />
                                    </span>
                                )}
                            </div>
                            <div className="item-subtitle" style={{ fontSize: '11pt', fontStyle: 'italic', color: '#555', marginBottom: '5px' }}>
                                <EditableText
                                    value={cert.issuer || ''}
                                    onChange={(v) => handleCertificatesChange(index, 'issuer', v)}
                                    placeholder="Issuer"
                                    style={{ fontSize: '11pt', fontStyle: 'italic' }}
                                />
                            </div>
                            <button
                                onClick={() => deleteCertificateItem(index)}
                                className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                title="Delete this certificate"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                {(data.certificates || []).length === 0 && (
                    <p style={{ fontSize: '11pt', color: '#999', fontStyle: 'italic' }}>No certificates added yet. Click "Add Certificate" to add one.</p>
                )}
                <SectionManager sectionName="Certificate" onAdd={addCertificateItem} />
            </div>
        </div>
    );
};

export default CvDocumentRenderer;

