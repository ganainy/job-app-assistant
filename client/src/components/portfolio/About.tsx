// client/src/components/portfolio/About.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AggregatedProfile } from '../../services/portfolioApi';

interface AboutProps {
  profile: AggregatedProfile;
  username: string;
}

const About: React.FC<AboutProps> = ({ profile }) => {
  const { skills, name, title, bio, profileImageUrl } = profile;

  return (
    <section id="about" className="py-12 md:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/5 to-transparent dark:from-blue-800/20 dark:via-purple-800/10"></div>

      <div className="max-w-7xl mx-auto relative">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-8 md:p-12 mb-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {profileImageUrl ? (
              <div className="flex-shrink-0 relative">
                <div
                  className="w-32 h-32 md:w-48 md:h-48 bg-center bg-no-repeat bg-cover rounded-full border-4 border-slate-200 dark:border-slate-700 shadow-xl"
                  style={{
                    backgroundImage: `url("${profileImageUrl}")`,
                    backgroundColor: '#e2e8f0',
                  }}
                  aria-label={`Portrait of ${name || 'the portfolio owner'}`}
                ></div>
              </div>
            ) : null}
            <div className="flex flex-col gap-6 text-center lg:text-left flex-1">
              <div>
                <h1 className="text-slate-900 dark:text-white text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tighter mb-4">
                  {name || 'Name not available'}
                </h1>
                <h2 className="text-indigo-600 dark:text-indigo-400 text-xl lg:text-2xl font-medium leading-normal mb-6">
                  {title || 'Title not available'}
                </h2>
              </div>
              <div className="text-slate-700 dark:text-slate-300 text-base md:text-lg font-normal leading-relaxed max-w-2xl">
                {bio ? (
                  <div className="markdown-bio">
                    <ReactMarkdown>{typeof bio === 'string' ? bio : 'No bio available'}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-amber-400 bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-bold">Bio Data Not Available</span>
                    </div>
                    <p>
                      Unable to load bio information. Please check your LinkedIn API connection or add a bio in
                      profile settings.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold">Programming Languages</h3>
          </div>
          <div className="flex gap-3 flex-wrap">
            {skills && skills.programmingLanguages && skills.programmingLanguages.length > 0 ? (
              skills.programmingLanguages.map((lang: string, index: number) => (
                <div
                  key={`lang-${index}`}
                  className="flex items-center justify-center gap-x-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-4 py-2 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-indigo-700 dark:text-indigo-300 text-sm font-medium leading-normal">{lang}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm">No programming languages detected from GitHub repositories.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold">Skills & Technologies</h3>
          </div>
          <div className="flex gap-3 flex-wrap">
            {skills && skills.otherSkills && skills.otherSkills.length > 0 ? (
              skills.otherSkills.map((skill: string, index: number) => (
                <div
                  key={`skill-${index}`}
                  className="flex items-center justify-center gap-x-2 rounded-full bg-purple-100 dark:bg-purple-900/30 px-4 py-2 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-purple-700 dark:text-purple-300 text-sm font-medium leading-normal">{skill}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm">No additional skills detected.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

