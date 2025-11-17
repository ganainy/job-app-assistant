// client/src/components/portfolio/About.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AggregatedProfile } from '../../services/portfolioApi';

interface AboutProps {
  profile: AggregatedProfile;
  username: string;
  isDarkMode?: boolean;
}

// Helper function to get country code from language name
const getCountryCode = (language: string): string => {
  const languageMap: { [key: string]: string } = {
    'english': 'GB',
    'german': 'DE',
    'french': 'FR',
    'spanish': 'ES',
    'italian': 'IT',
    'portuguese': 'PT',
    'dutch': 'NL',
    'russian': 'RU',
    'chinese': 'CN',
    'japanese': 'JP',
    'korean': 'KR',
    'arabic': 'SA',
    'hindi': 'IN',
    'polish': 'PL',
    'turkish': 'TR',
    'swedish': 'SE',
    'norwegian': 'NO',
    'danish': 'DK',
    'finnish': 'FI',
    'greek': 'GR',
    'czech': 'CZ',
    'hungarian': 'HU',
    'romanian': 'RO',
    'ukrainian': 'UA',
    'vietnamese': 'VN',
    'thai': 'TH',
    'indonesian': 'ID',
    'malay': 'MY',
    'hebrew': 'IL',
    'persian': 'IR',
    'urdu': 'PK',
  };

  const normalized = language.toLowerCase().trim();
  return languageMap[normalized] || '';
};

// Helper function to get flag emoji from country code
const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Helper function to get language flag
const getLanguageFlag = (language: string): string => {
  const countryCode = getCountryCode(language);
  return countryCode ? getFlagEmoji(countryCode) : '';
};

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
    <>
      {/* About Me Section */}
      <section className="py-16 md:py-24" id="about">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-3xl font-bold mb-4 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            About Me
          </h2>
          {displayBio && (
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              {typeof displayBio === 'string' 
                ? displayBio.replace(/[#*_`]/g, '')
                : displayBio}
            </p>
          )}
        </div>
      </section>

      {/* Skills Section */}
      {skills && (skills.programmingLanguages?.length > 0 || skills.otherSkills?.length > 0) && (
        <section className={`py-16 md:py-24 rounded-2xl ${
          isDarkMode ? 'bg-slate-900' : 'bg-white'
        }`} id="skills">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className={`text-3xl font-bold text-center mb-12 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Technical Skills
            </h2>
            <div className="space-y-8">
              {skills.programmingLanguages && skills.programmingLanguages.length > 0 && (
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    Programming Languages
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {skills.programmingLanguages.map((lang: string, index: number) => (
                      <span
                        key={`lang-${index}`}
                        className="bg-primary/10 text-primary font-medium px-4 py-1.5 rounded-full text-sm transition-all duration-300 hover:scale-110 hover:bg-primary/20 hover:shadow-md cursor-default"
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
                        <h3 className={`text-lg font-semibold mb-4 ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          Frameworks & Libraries
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {frameworks.map((skill: string, index: number) => (
                            <span
                              key={`framework-${index}`}
                              className={`font-medium px-4 py-1.5 rounded-full text-sm transition-all duration-300 hover:scale-110 hover:shadow-md cursor-default ${
                                isDarkMode
                                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
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
                        <h3 className={`text-lg font-semibold mb-4 ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          Tools & Technologies
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {tools.map((skill: string, index: number) => (
                            <span
                              key={`tool-${index}`}
                              className={`font-medium px-4 py-1.5 rounded-full text-sm transition-all duration-300 hover:scale-110 hover:shadow-md cursor-default ${
                                isDarkMode
                                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
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
        </section>
      )}

      {/* LinkedIn Experience Section */}
      {linkedInExperience && linkedInExperience.length > 0 && (
        <section className="py-16 md:py-24" id="experience">
          <div className="max-w-3xl mx-auto">
            <h2 className={`text-3xl font-bold text-center mb-12 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Work Experience
            </h2>
            <div className={`relative pl-8 border-l-2 space-y-12 ${
              isDarkMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              {linkedInExperience.map((exp: any, index: number) => (
                <div key={`exp-${index}`} className="relative transition-all duration-300 hover:translate-x-2 group">
                  <div className={`absolute -left-[34px] top-1 h-4 w-4 rounded-full bg-primary ring-8 transition-all duration-300 group-hover:scale-125 group-hover:ring-primary/50 ${
                    isDarkMode ? 'ring-background-dark' : 'ring-background-light'
                  }`}></div>
                  <p className={`text-sm font-medium ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {exp.startDate?.month && exp.startDate?.year ? `${exp.startDate.month} ${exp.startDate.year}` : ''}
                    {exp.startDate && (exp.endDate || exp.isCurrent) ? ' - ' : ''}
                    {exp.isCurrent ? 'Present' : exp.endDate?.month && exp.endDate?.year ? `${exp.endDate.month} ${exp.endDate.year}` : ''}
                  </p>
                  <h3 className={`text-xl font-semibold mt-1 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {exp.title || 'Position'}
                  </h3>
                  <p className={`text-md font-medium text-primary mb-2`}>
                    {exp.company || 'Company'}
                  </p>
                  {exp.location && (
                    <p className={`text-sm mb-2 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {exp.location}
                    </p>
                  )}
                  {exp.description && (
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LinkedIn Skills Section */}
      {linkedInSkills && linkedInSkills.length > 0 && (
        <section className={`py-16 md:py-24 rounded-2xl ${
          isDarkMode ? 'bg-slate-900' : 'bg-white'
        }`}>
          <div className="max-w-4xl mx-auto px-6">
            <h2 className={`text-3xl font-bold text-center mb-12 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              LinkedIn Skills
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {linkedInSkills.map((skill: string, index: number) => (
                <span
                  key={`linkedin-skill-${index}`}
                  className={`font-medium px-4 py-1.5 rounded-full text-sm transition-all duration-300 hover:scale-110 hover:shadow-md cursor-default ${
                    isDarkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LinkedIn Languages Section */}
      {linkedInLanguages && linkedInLanguages.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className={`text-3xl font-bold text-center mb-12 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Languages
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {linkedInLanguages.map((lang: any, index: number) => {
                const languageName = lang.language || lang;
                const flagEmoji = getLanguageFlag(languageName);
                const countryCode = getCountryCode(languageName);
                return (
                  <span
                    key={`linkedin-lang-${index}`}
                    className={`font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all duration-300 hover:scale-110 hover:shadow-md cursor-default ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {countryCode && (
                      <span className={`text-xs font-bold flex items-center justify-center rounded-full w-6 h-6 ${
                        isDarkMode
                          ? 'bg-slate-700 text-slate-200'
                          : 'bg-white text-slate-700'
                      }`}>
                        {countryCode}
                      </span>
                    )}
                    <span>
                      {languageName}
                      {lang.proficiency && ` (${lang.proficiency})`}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default About;
