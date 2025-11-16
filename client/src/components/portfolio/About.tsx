// client/src/components/portfolio/About.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AggregatedProfile } from '../../services/portfolioApi';

interface AboutProps {
  profile: AggregatedProfile;
  username: string;
  isDarkMode?: boolean;
}

const About: React.FC<AboutProps> = ({ profile, isDarkMode = false }) => {
  const { skills, name, title, bio, linkedinData } = profile;
  
  // Use LinkedIn data if available, otherwise fall back to profile data
  const displayName = linkedinData?.name || name;
  const displayTitle = linkedinData?.title || title;
  const displayBio = linkedinData?.bio || bio;
  const linkedInExperience = linkedinData?.experience;
  const linkedInSkills = linkedinData?.skills;
  const linkedInLanguages = linkedinData?.languages;

  return (
    <section id="about" className="scroll-mt-20 py-16 md:py-20">
      <div className="text-center mb-16">
        <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>About Me</h2>
        <p className={`text-lg mx-auto ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Learn more about my background, skills, and professional experience.
        </p>
      </div>

      <div className="flex flex-col w-full mx-auto">
          {/* Skills Section */}
          {skills && (skills.programmingLanguages?.length > 0 || skills.otherSkills?.length > 0) && (
            <div className="pb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-primary/20' : 'bg-primary/10'}`}>
                  <svg className={`w-6 h-6 ${isDarkMode ? 'text-primary' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className={`text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Technical Skills</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {skills.programmingLanguages && skills.programmingLanguages.length > 0 && (
                  <div>
                    <h4 className={`font-semibold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Programming Languages
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.programmingLanguages.slice(0, 8).map((lang: string, index: number) => (
                        <span
                          key={`lang-${index}`}
                          className={`px-2 py-1 text-sm ${
                            isDarkMode 
                              ? 'text-slate-300' 
                              : 'text-slate-600'
                          }`}
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.otherSkills && skills.otherSkills.length > 0 && (() => {
                  const frameworks = skills.otherSkills.filter((skill: string) => 
                    /react|vue|angular|next|express|django|flask|spring|laravel|rails|flutter|react-native/i.test(skill)
                  );
                  const tools = skills.otherSkills.filter((skill: string) => 
                    !/react|vue|angular|next|express|django|flask|spring|laravel|rails|flutter|react-native/i.test(skill)
                  );
                  
                  return (
                  <>
                      {frameworks.length > 0 && (
                    <div>
                      <h4 className={`font-semibold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Frameworks & Libraries
                      </h4>
                      <div className="flex flex-wrap gap-2">
                            {frameworks.slice(0, 8).map((skill: string, index: number) => (
                          <span
                            key={`framework-${index}`}
                            className={`px-2 py-1 text-sm ${
                              isDarkMode 
                                ? 'text-slate-300' 
                                : 'text-slate-600'
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                      )}
                      {tools.length > 0 && (
                    <div>
                      <h4 className={`font-semibold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Tools & Technologies
                      </h4>
                      <div className="flex flex-wrap gap-2">
                            {tools.slice(0, 8).map((skill: string, index: number) => (
                          <span
                            key={`tool-${index}`}
                            className={`px-2 py-1 text-sm ${
                              isDarkMode 
                                ? 'text-slate-300' 
                                : 'text-slate-600'
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                      )}
                  </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* LinkedIn Experience Section */}
          {linkedInExperience && linkedInExperience.length > 0 && (
            <>
              <div className={`border-t-[0.5px] pt-12 pb-12 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <svg className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className={`text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Work Experience</h3>
            </div>
            <div className="space-y-8">
              {linkedInExperience.map((exp: any, index: number) => (
                <div key={`exp-${index}`} className={`border-l-2 pl-4 ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{exp.title || 'Position'}</h4>
                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {exp.startDate?.month && exp.startDate?.year ? `${exp.startDate.month} ${exp.startDate.year}` : ''}
                      {exp.startDate && (exp.endDate || exp.isCurrent) ? ' - ' : ''}
                      {exp.isCurrent ? 'Present' : exp.endDate?.month && exp.endDate?.year ? `${exp.endDate.month} ${exp.endDate.year}` : ''}
                    </span>
                  </div>
                  <p className={`font-medium mb-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{exp.company || 'Company'}</p>
                  {exp.location && (
                    <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{exp.location}</p>
                  )}
                  {exp.description && (
                    <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
              </div>
            </>
        )}

          {/* LinkedIn Skills Section */}
          {linkedInSkills && linkedInSkills.length > 0 && (
            <>
              <div className={`border-t-[0.5px] pt-12 pb-12 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <svg className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className={`text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>LinkedIn Skills</h3>
            </div>
            <div className="flex gap-4 flex-wrap">
              {linkedInSkills.map((skill: string, index: number) => (
                <span
                  key={`linkedin-skill-${index}`}
                  className={`px-2 py-1 text-sm ${
                    isDarkMode 
                      ? 'text-slate-300' 
                      : 'text-slate-600'
                  }`}
                >
                  {skill}
                </span>
              ))}
            </div>
              </div>
            </>
        )}

          {/* LinkedIn Languages Section */}
          {linkedInLanguages && linkedInLanguages.length > 0 && (
            <>
              <div className={`border-t-[0.5px] pt-12 pb-12 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                <svg className={`w-6 h-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className={`text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Languages</h3>
            </div>
            <div className="flex gap-4 flex-wrap">
              {linkedInLanguages.map((lang: any, index: number) => (
                <span
                  key={`linkedin-lang-${index}`}
                  className={`px-2 py-1 text-sm ${
                    isDarkMode 
                      ? 'text-slate-300' 
                      : 'text-slate-600'
                  }`}
                >
                  {lang.language || lang}
                  {lang.proficiency && ` (${lang.proficiency})`}
                </span>
              ))}
            </div>
              </div>
            </>
        )}
      </div>
    </section>
  );
};

export default About;

