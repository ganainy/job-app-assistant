import { forwardRef } from "react";
import { ResumeData } from "../utils/cvDataTransform";

interface GermanLatexResumeProps {
    data: ResumeData;
    language?: 'en' | 'de';
}

const GermanLatexResume = forwardRef<HTMLDivElement, GermanLatexResumeProps>(
    ({ data, language = 'de' }, ref) => {
        const t = {
            en: {
                professionalProfile: 'Professional Profile',
                relevantExperience: 'Relevant IT Experience',
                education: 'Education',
                technicalSkills: 'Technical Skills',
                languages: 'Languages',
            },
            de: {
                professionalProfile: 'Berufliches Profil',
                relevantExperience: 'Relevante IT-Erfahrung',
                education: 'Ausbildung',
                technicalSkills: 'Technische Fähigkeiten',
                languages: 'Sprachen',
            },
        };

        const lang = t[language];

        return (
            <div
                ref={ref}
                style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '11pt',
                    lineHeight: '1.4',
                    color: '#000',
                    margin: '0',
                    padding: '40px',
                    background: 'white',
                    maxWidth: '210mm',
                    width: '100%',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                }}
                data-preserve="true"
            >
                {/* Header */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <h1 style={{
                                fontSize: '18pt',
                                fontWeight: 'bold',
                                margin: '0 0 2px 0',
                            }}>
                                {data.firstName} {data.lastName}
                            </h1>
                            <div style={{ fontSize: '10pt', marginBottom: '2px' }}>
                                {[data.city, data.state].filter(Boolean).join(', ')}
                            </div>
                            {data.education && data.education[0] && (
                                <div style={{ fontSize: '10pt', lineHeight: '1.3' }}>
                                    {data.education[0].degree} {data.education[0].field && `in ${data.education[0].field}`}
                                    {data.education[1] && ` und ${data.education[1].degree} ${data.education[1].field && `in ${data.education[1].field}`}`}
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '9pt', lineHeight: '1.4', color: '#000' }}>
                            {data.phone && <div>☎ {data.phone}</div>}
                            {data.email && <div>✉ {data.email}</div>}
                            {data.website && <div><a href={data.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>🔗 Portfolio</a></div>}
                            {data.linkedIn && <div><a href={data.linkedIn} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>LinkedIn</a></div>}
                            {data.github && <div><a href={data.github} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>GitHub</a></div>}
                        </div>
                    </div>
                </div>

                {/* Professional Profile */}
                {data.summary && (
                    <div style={{ marginBottom: '15px' }}>
                        <h2 style={{
                            fontSize: '11pt',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #000',
                            marginBottom: '8px',
                            paddingBottom: '2px',
                        }}>
                            {lang.professionalProfile}
                        </h2>
                        <p style={{ textAlign: 'justify', margin: '0', fontSize: '10pt' }}>
                            {data.summary}
                        </p>
                    </div>
                )}

                {/* Experience */}
                {data.experiences && data.experiences.length > 0 && data.experiences.some(exp => exp.company || exp.title) && (
                    <div style={{ marginBottom: '15px' }}>
                        <h2 style={{
                            fontSize: '11pt',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #000',
                            marginBottom: '8px',
                            paddingBottom: '2px',
                        }}>
                            {lang.relevantExperience}
                        </h2>
                        <ul style={{ margin: '0', paddingLeft: '20px', listStyleType: 'disc' }}>
                            {data.experiences.map((experience) => (
                                <li key={experience.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                        <div>
                                            <strong>{experience.title}</strong>
                                            <div style={{ fontStyle: 'italic', fontSize: '9pt' }}>
                                                {experience.company}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontStyle: 'italic', fontSize: '9pt' }}>
                                            <div>{experience.startDate} - {experience.current ? (language === 'de' ? 'heute' : 'present') : experience.endDate}</div>
                                            {experience.location && <div>{experience.location}</div>}
                                        </div>
                                    </div>
                                    {experience.description && (
                                        <div style={{ fontSize: '10pt', marginTop: '4px' }}>
                                            {experience.description.split('\n').filter(line => line.trim()).map((line, idx) => (
                                                <div key={idx} style={{ marginBottom: '2px' }}>
                                                    – {line.replace(/^[•-]\s*/, '')}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Education */}
                {data.education && data.education.length > 0 && data.education.some(edu => edu.school || edu.degree) && (
                    <div style={{ marginBottom: '15px' }}>
                        <h2 style={{
                            fontSize: '11pt',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #000',
                            marginBottom: '8px',
                            paddingBottom: '2px',
                        }}>
                            {lang.education}
                        </h2>
                        <ul style={{ margin: '0', paddingLeft: '20px', listStyleType: 'disc' }}>
                            {data.education.map((education) => (
                                <li key={education.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <strong>{education.school}</strong>
                                            <div style={{ fontStyle: 'italic', fontSize: '9pt' }}>
                                                {education.degree} {education.field && `in ${education.field}`}
                                                {education.gpa && ` (Note ${education.gpa})`}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontStyle: 'italic', fontSize: '9pt' }}>
                                            {education.startDate} - {education.endDate}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Projects - Structured */}
                {data.projects && data.projects.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                        <h2 style={{
                            fontSize: '11pt',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #000',
                            marginBottom: '8px',
                            paddingBottom: '2px',
                        }}>
                            {language === 'de' ? 'Projekte' : 'Projects'}
                        </h2>
                        <ul style={{ margin: '0', paddingLeft: '20px', listStyleType: 'disc' }}>
                            {data.projects.map((project) => (
                                <li key={project.id} style={{ marginBottom: '10px' }}>
                                    <div style={{ marginBottom: '2px' }}>
                                        <strong>{project.name}</strong>
                                        {project.url && <span style={{ fontSize: '9pt', marginLeft: '6px' }}><a href={project.url} style={{ color: 'inherit', textDecoration: 'none' }}>🔗</a></span>}
                                        {((project.startDate && project.endDate) || project.description) && (
                                            <div style={{ display: 'inline', marginLeft: '10px', fontSize: '9pt', fontStyle: 'italic' }}>
                                                {project.startDate && project.endDate && `${project.startDate} - ${project.endDate}`}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '10pt' }}>
                                        {project.description}
                                    </div>
                                    {project.highlights && project.highlights.length > 0 && (
                                        <ul style={{ marginTop: '2px', marginBottom: '0', paddingLeft: '15px' }}>
                                            {project.highlights.map((highlight, idx) => (
                                                <li key={idx} style={{ fontSize: '10pt' }}>{highlight}</li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Custom Sections - Filter out 'Projects' to avoid duplication */}
                {data.customSections && data.customSections.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                        {data.customSections
                            .filter(section => section.heading?.toLowerCase() !== 'projects' && section.heading?.toLowerCase() !== 'projekte')
                            .map((section) => (
                                <div key={section.id} style={{ marginBottom: '10px' }}>
                                    <h2 style={{
                                        fontSize: '11pt',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        borderBottom: '1px solid #000',
                                        marginBottom: '8px',
                                        paddingBottom: '2px',
                                    }}>
                                        {section.heading}
                                    </h2>
                                    <div style={{ fontSize: '10pt' }}>
                                        {section.content.split('\n').filter(line => line.trim()).map((line, lineIdx) => (
                                            <div key={lineIdx} style={{ marginBottom: '2px' }}>
                                                {line.replace(/^[•-]\s*/, '')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* Technical Skills */}
                {data.skills && data.skills.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                        <h2 style={{
                            fontSize: '11pt',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #000',
                            marginBottom: '8px',
                            paddingBottom: '2px',
                        }}>
                            {lang.technicalSkills}
                        </h2>
                        <ul style={{ margin: '0', paddingLeft: '20px', listStyleType: 'disc' }}>
                            {data.skills.map((skill, index) => (
                                <li key={index} style={{ marginBottom: '3px', fontSize: '10pt' }}>
                                    {skill}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Languages */}
                {data.languages && data.languages.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                        <h2 style={{
                            fontSize: '11pt',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #000',
                            marginBottom: '8px',
                            paddingBottom: '2px',
                        }}>
                            {lang.languages}
                        </h2>
                        <ul style={{ margin: '0', paddingLeft: '20px', listStyleType: 'disc' }}>
                            {data.languages.map((language) => (
                                <li key={language.id} style={{ marginBottom: '3px', fontSize: '10pt' }}>
                                    <strong>{language.name}:</strong> {language.proficiency}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }
);

GermanLatexResume.displayName = "GermanLatexResume";

export default GermanLatexResume;
