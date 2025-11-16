// client/src/components/portfolio/PortfolioLayout.tsx
import React, { useState, useEffect } from 'react';
import { AggregatedProfile, Project } from '../../services/portfolioApi';
import About from './About';
import Projects from './Projects';

interface PortfolioLayoutProps {
  profile: AggregatedProfile;
  projects: Project[];
  username: string;
  sectionIdPrefix?: string; // For preview mode (e.g., 'preview-')
  onScrollToSection?: (sectionId: string) => void; // Custom scroll handler
  activeSection?: string; // For active section highlighting
}

const PortfolioLayout: React.FC<PortfolioLayoutProps> = ({
  profile,
  projects,
  username,
  sectionIdPrefix = '',
  onScrollToSection,
  activeSection,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('portfolio-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Default to light mode
    return false;
  });

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('portfolio-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const displayName = profile.linkedinData?.name || profile.name || username || 'Portfolio';
  const displayTitle = profile.linkedinData?.title || profile.title || '';
  const displayBio = profile.linkedinData?.bio || profile.bio || '';
  const email = profile.user?.email || '';

  // Helper functions to extract username/identifier from URLs
  const getGithubUsername = (url: string): string => {
    try {
      const match = url.match(/github\.com\/([^\/\?]+)/i);
      return match ? match[1] : url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
  };

  const getLinkedInUsername = (url: string): string => {
    try {
      const match = url.match(/linkedin\.com\/(?:in|company)\/([^\/\?]+)/i);
      return match ? match[1] : url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
  };

  const getTwitterUsername = (url: string): string => {
    try {
      const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
      return match ? match[1] : url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
  };

  const getWebsiteDomain = (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (onScrollToSection) {
      onScrollToSection(sectionId);
      return;
    }

    const fullSectionId = sectionIdPrefix + sectionId;
    
    if (sectionId === 'home') {
      const element = document.getElementById(fullSectionId);
      if (element) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
      return;
    }

    const element = document.getElementById(fullSectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const getSectionClassName = (section: string) => {
    const isActive = activeSection === section;
    return `text-sm font-medium transition-colors ${
      isActive
        ? 'text-primary dark:text-primary'
        : 'text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary'
    }`;
  };

  return (
    <div className={`relative flex min-h-screen w-full flex-col font-display antialiased ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200' 
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-800'
    }`}>
      {/* Sticky Navigation Bar */}
      <header className={`sticky top-0 z-50 flex items-center justify-center border-b-[0.5px] backdrop-blur-md shadow-sm ${
        isDarkMode
          ? 'border-slate-800/80 bg-slate-900/90'
          : 'border-slate-200/80 bg-white/90'
      }`} id={sectionIdPrefix + 'home'}>
        <nav className="flex w-full items-center justify-between px-6 py-4">
          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <button
              onClick={() => scrollToSection('home')}
              className={getSectionClassName('home')}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className={getSectionClassName('about')}
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('work')}
              className={getSectionClassName('work')}
            >
              Work
            </button>
            {(profile.socialLinks?.github || profile.socialLinks?.linkedin || profile.socialLinks?.twitter || profile.socialLinks?.website) && (
              <button
                onClick={() => scrollToSection('connect')}
                className={getSectionClassName('connect')}
              >
                Connect
              </button>
            )}
          </div>
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      <main className="flex w-full flex-1 flex-col items-center">
        <div className="w-full px-4 md:px-6">
          {/* Enhanced Hero Section */}
          <section className="relative flex min-h-[70vh] flex-col items-center justify-center gap-12 py-16 md:py-20 text-center overflow-hidden" id={sectionIdPrefix + 'home'}>
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-8 w-full">
              {/* Profile Image or Icon */}
              {profile.profileImageUrl ? (
                <div className="relative">
                  <img
                    className={`size-32 md:size-40 rounded-full object-cover shadow-2xl ring-4 ${isDarkMode ? 'ring-slate-800' : 'ring-white'}`}
                    src={profile.profileImageUrl}
                    alt={displayName}
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-purple-500/20"></div>
                </div>
              ) : (
                <div className={`size-32 md:size-40 rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-2xl ring-4 flex items-center justify-center ${isDarkMode ? 'ring-slate-800' : 'ring-white'}`}>
                  <span className="text-5xl md:text-6xl font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter bg-clip-text ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {displayName}
                </h1>
                {displayTitle && (
                  <h2 className={`text-lg md:text-xl lg:text-2xl font-semibold ${isDarkMode ? 'text-primary/90' : 'text-primary'}`}>
                    {displayTitle}
                  </h2>
                )}
              </div>
              
              {/* Contact Information */}
              {(email || profile.location) && (
                <div className={`flex flex-wrap items-center justify-center gap-4 text-base md:text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {email && (
                    <div className="flex items-center gap-2">
                      <svg className="size-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a href={`mailto:${email}`} className="hover:text-primary transition-colors font-medium">
                        {email}
                      </a>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-2">
                      <svg className="size-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">{profile.location}</span>
                    </div>
                  )}
                </div>
              )}
              
              {displayBio && (
                <p className={`text-lg md:text-xl leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {typeof displayBio === 'string' 
                    ? displayBio.replace(/[#*_`]/g, '').substring(0, 250) + (displayBio.length > 250 ? '...' : '')
                    : displayBio}
                </p>
              )}
            </div>
          </section>

          <div id={sectionIdPrefix + 'about'}>
            <About profile={profile} username={username} isDarkMode={isDarkMode} />
          </div>
          <div id={sectionIdPrefix + 'work'}>
            <Projects projects={projects} username={username} isDarkMode={isDarkMode} />
          </div>

          {/* Connect Section */}
          {(profile.socialLinks?.github || profile.socialLinks?.linkedin || profile.socialLinks?.twitter || profile.socialLinks?.website || email) && (
            <section id={sectionIdPrefix + 'connect'} className="scroll-mt-20 py-16 md:py-20">
              <div className="text-center mb-16">
                <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Connect</h2>
                <p className={`text-lg mx-auto ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Let's connect and stay in touch through these platforms.
                </p>
              </div>

              <div className="flex justify-center items-center w-full">
                <div className="flex flex-wrap justify-center gap-6 max-w-4xl">
                {profile.socialLinks?.github && (
                  <a
                    aria-label="GitHub Profile"
                    href={profile.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center gap-6 p-8 md:p-10 rounded-xl border-[0.5px] transition-all hover:shadow-lg group min-w-[140px] ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border-slate-600 hover:border-primary hover:bg-slate-700' 
                        : 'bg-slate-50 border-slate-200 hover:border-primary hover:bg-white'
                    }`}
                  >
                    <div className={`p-4 rounded-full transition-colors ${
                      isDarkMode 
                        ? 'bg-slate-600 group-hover:bg-primary/20' 
                        : 'bg-slate-100 group-hover:bg-primary/10'
                    }`}>
                      <svg className={`size-9 group-hover:text-primary transition-colors ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.799 24 17.301 24 12c0-6.627-5.373-12-12-12z"></path>
                      </svg>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {getGithubUsername(profile.socialLinks.github)}
                      </span>
                      <span className={`text-base font-semibold group-hover:text-primary transition-colors ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>GitHub</span>
                    </div>
                  </a>
                )}
                {profile.socialLinks?.linkedin && (
                  <a
                    aria-label="LinkedIn Profile"
                    href={profile.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center gap-6 p-8 md:p-10 rounded-xl border-[0.5px] transition-all hover:shadow-lg group min-w-[140px] ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border-slate-600 hover:border-primary hover:bg-slate-700' 
                        : 'bg-slate-50 border-slate-200 hover:border-primary hover:bg-white'
                    }`}
                  >
                    <div className={`p-4 rounded-full transition-colors ${
                      isDarkMode 
                        ? 'bg-blue-900/30 group-hover:bg-primary/20' 
                        : 'bg-blue-100 group-hover:bg-primary/10'
                    }`}>
                      <svg className={`size-9 group-hover:text-primary transition-colors ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"></path>
                      </svg>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {getLinkedInUsername(profile.socialLinks.linkedin)}
                      </span>
                      <span className={`text-base font-semibold group-hover:text-primary transition-colors ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>LinkedIn</span>
                    </div>
                  </a>
                )}
                {profile.socialLinks?.twitter && (
                  <a
                    aria-label="Twitter Profile"
                    href={profile.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center gap-6 p-8 md:p-10 rounded-xl border-[0.5px] transition-all hover:shadow-lg group min-w-[140px] ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border-slate-600 hover:border-primary hover:bg-slate-700' 
                        : 'bg-slate-50 border-slate-200 hover:border-primary hover:bg-white'
                    }`}
                  >
                    <div className={`p-4 rounded-full transition-colors ${
                      isDarkMode 
                        ? 'bg-sky-900/30 group-hover:bg-primary/20' 
                        : 'bg-sky-100 group-hover:bg-primary/10'
                    }`}>
                      <svg className={`size-9 group-hover:text-primary transition-colors ${
                        isDarkMode ? 'text-sky-400' : 'text-sky-600'
                      }`} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.223.085a4.93 4.93 0 004.6 3.42 9.86 9.86 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path>
                      </svg>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {getTwitterUsername(profile.socialLinks.twitter)}
                      </span>
                      <span className={`text-base font-semibold group-hover:text-primary transition-colors ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>Twitter</span>
                    </div>
                  </a>
                )}
                {profile.socialLinks?.website && (
                  <a
                    aria-label="Website"
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center gap-6 p-8 md:p-10 rounded-xl border-[0.5px] transition-all hover:shadow-lg group min-w-[140px] ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border-slate-600 hover:border-primary hover:bg-slate-700' 
                        : 'bg-slate-50 border-slate-200 hover:border-primary hover:bg-white'
                    }`}
                  >
                    <div className={`p-4 rounded-full transition-colors ${
                      isDarkMode 
                        ? 'bg-green-900/30 group-hover:bg-primary/20' 
                        : 'bg-green-100 group-hover:bg-primary/10'
                    }`}>
                      <svg className={`size-9 group-hover:text-primary transition-colors ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {getWebsiteDomain(profile.socialLinks.website)}
                      </span>
                      <span className={`text-base font-semibold group-hover:text-primary transition-colors ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>Website</span>
                    </div>
                  </a>
                )}
                {email && (
                  <a
                    aria-label="Email"
                    href={`mailto:${email}`}
                    className={`flex flex-col items-center gap-6 p-8 md:p-10 rounded-xl border-[0.5px] transition-all hover:shadow-lg group min-w-[140px] ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border-slate-600 hover:border-primary hover:bg-slate-700' 
                        : 'bg-slate-50 border-slate-200 hover:border-primary hover:bg-white'
                    }`}
                  >
                    <div className={`p-4 rounded-full transition-colors ${
                      isDarkMode 
                        ? 'bg-purple-900/30 group-hover:bg-primary/20' 
                        : 'bg-purple-100 group-hover:bg-primary/10'
                    }`}>
                      <svg className={`size-9 group-hover:text-primary transition-colors ${
                        isDarkMode ? 'text-purple-400' : 'text-purple-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {email}
                      </span>
                      <span className={`text-base font-semibold group-hover:text-primary transition-colors ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>Email</span>
                    </div>
                  </a>
                )}
              </div>
            </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`flex w-full justify-center border-t-[0.5px] backdrop-blur-sm ${
        isDarkMode 
          ? 'border-slate-800/80 bg-slate-900/50' 
          : 'border-slate-200/80 bg-white/50'
      }`}>
        <div className="flex w-full flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            © {new Date().getFullYear()} {displayName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {profile.socialLinks?.github && (
              <a
                aria-label="GitHub Profile"
                className={`hover:text-primary transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                href={profile.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.799 24 17.301 24 12c0-6.627-5.373-12-12-12z"></path>
                </svg>
              </a>
            )}
            {profile.socialLinks?.linkedin && (
              <a
                aria-label="LinkedIn Profile"
                className={`hover:text-primary transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                href={profile.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"></path>
                </svg>
              </a>
            )}
            {profile.socialLinks?.twitter && (
              <a
                aria-label="Twitter Profile"
                className={`hover:text-primary transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                href={profile.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.223.085a4.93 4.93 0 004.6 3.42 9.86 9.86 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path>
                </svg>
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PortfolioLayout;

