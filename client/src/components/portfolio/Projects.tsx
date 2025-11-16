// client/src/components/portfolio/Projects.tsx
import React, { useState, useMemo } from 'react';
import { Project } from '../../services/portfolioApi';

interface ProjectsProps {
  projects: Project[];
  username: string;
  isDarkMode?: boolean;
}

// Generate a professional placeholder image URL based on project title
const getPlaceholderImage = (title: string, index: number): string => {
  // Use Unsplash Source API for professional placeholder images
  // Different categories for variety
  const categories = ['technology', 'code', 'business', 'design', 'development', 'startup'];
  const category = categories[index % categories.length];
  const seed = title.toLowerCase().replace(/\s+/g, '-');
  return `https://source.unsplash.com/800x450/?${category},${seed}&sig=${index}`;
};

// Generate gradient placeholder based on project index
const getGradientPlaceholder = (index: number): string => {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  ];
  return gradients[index % gradients.length];
};

// Get the main programming language from project technologies
const getMainLanguage = (technologies: string[] | undefined): string | null => {
  if (!technologies || technologies.length === 0) return null;

  // Priority list of programming languages (most common first)
  const languagePriority = [
    'javascript', 'typescript', 'python', 'java', 'kotlin', 'swift', 'go', 'rust',
    'c++', 'c#', 'php', 'ruby', 'dart', 'scala', 'r', 'matlab', 'html', 'css',
    'sql', 'shell', 'powershell', 'c', 'cpp', 'objective-c', 'vue', 'react',
    'angular', 'node', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel',
    'rails', 'flutter', 'react-native', 'next', 'nextjs', 'nuxt', 'svelte'
  ];

  // Normalize and find the first matching language
  const normalizedTechs = technologies.map(t => t.toLowerCase().trim());
  
  for (const lang of languagePriority) {
    const found = normalizedTechs.find(tech => 
      tech === lang || 
      tech.includes(lang) || 
      lang.includes(tech)
    );
    if (found) {
      return lang;
    }
  }

  // If no match, return the first technology
  return normalizedTechs[0];
};

// Get language logo URL from Simple Icons CDN
const getLanguageLogoUrl = (language: string | null): string | null => {
  if (!language) return null;

  // Map language names to Simple Icons names
  const languageMap: { [key: string]: string } = {
    'javascript': 'javascript',
    'typescript': 'typescript',
    'python': 'python',
    'java': 'java',
    'kotlin': 'kotlin',
    'swift': 'swift',
    'go': 'go',
    'rust': 'rust',
    'c++': 'cplusplus',
    'cpp': 'cplusplus',
    'c#': 'csharp',
    'php': 'php',
    'ruby': 'ruby',
    'dart': 'dart',
    'scala': 'scala',
    'r': 'r',
    'matlab': 'matlab',
    'html': 'html5',
    'css': 'css3',
    'sql': 'mysql',
    'shell': 'bash',
    'powershell': 'powershell',
    'c': 'c',
    'objective-c': 'objectivec',
    'vue': 'vuedotjs',
    'react': 'react',
    'angular': 'angular',
    'node': 'nodedotjs',
    'nodejs': 'nodedotjs',
    'express': 'express',
    'django': 'django',
    'flask': 'flask',
    'spring': 'spring',
    'laravel': 'laravel',
    'rails': 'rubyonrails',
    'flutter': 'flutter',
    'react-native': 'react',
    'next': 'nextdotjs',
    'nextjs': 'nextdotjs',
    'nuxt': 'nuxtdotjs',
    'svelte': 'svelte'
  };

  const iconName = languageMap[language.toLowerCase()];
  if (!iconName) return null;

  // Use Simple Icons CDN
  return `https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${iconName}.svg`;
};

const Projects: React.FC<ProjectsProps> = ({ projects, isDarkMode = false }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  // Extract all unique technologies/tags for filtering
  const allTechnologies = useMemo(() => {
    const techSet = new Set<string>();
    projects.forEach((project) => {
      if (project.technologies) {
        project.technologies.forEach((tech) => techSet.add(tech.toLowerCase()));
      }
      if (project.tags) {
        project.tags.forEach((tag) => techSet.add(tag.toLowerCase()));
      }
    });
    return Array.from(techSet).sort();
  }, [projects]);

  // Separate featured and regular projects
  const featuredProjects = useMemo(() => {
    return projects.filter((p) => p.featured === true).slice(0, 3);
  }, [projects]);

  const regularProjects = useMemo(() => {
    return projects.filter((p) => !p.featured || featuredProjects.includes(p));
  }, [projects, featuredProjects]);

  // Filter projects based on selected technology
  const filteredProjects = useMemo(() => {
    if (selectedFilter === 'all') {
      return regularProjects;
    }
    return regularProjects.filter((project) => {
      const techs = [
        ...(project.technologies || []).map((t) => t.toLowerCase()),
        ...(project.tags || []).map((t) => t.toLowerCase()),
      ];
      return techs.includes(selectedFilter.toLowerCase());
    });
  }, [regularProjects, selectedFilter]);

  // Determine which projects to display
  const displayedProjects = showAll ? filteredProjects : filteredProjects.slice(0, 6);

  if (!projects || projects.length === 0) {
    return (
      <section id="work" className="scroll-mt-20 py-16 md:py-20">
        <div className="text-center">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Selected Work</h2>
          <p className={`mx-auto mt-4 text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>No projects available yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="work" className="scroll-mt-20 py-16 md:py-20">
      <div className="text-center mb-16">
        <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Selected Work</h2>
        <p className={`mx-auto mt-4 text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Here are some projects I've worked on. Each one represents a unique challenge and learning experience.
        </p>
      </div>

      {/* Featured Projects Section */}
      {featuredProjects.length > 0 && (
        <div className="mb-12">
          <h3 className={`text-2xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Featured Projects</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {featuredProjects.map((project, index) => (
              <ProjectCard key={project._id} project={project} index={index} featured isDarkMode={isDarkMode} />
            ))}
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      {allTechnologies.length > 0 && (
        <div className="mb-12">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedFilter === 'all'
                  ? 'bg-primary text-white shadow-md'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 border-[0.5px] border-slate-700 hover:border-primary hover:text-primary'
                  : 'bg-white text-slate-700 border-[0.5px] border-slate-200 hover:border-primary hover:text-primary'
              }`}
            >
              All
            </button>
            {allTechnologies.slice(0, 10).map((tech) => (
              <button
                key={tech}
                onClick={() => setSelectedFilter(tech)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                  selectedFilter === tech
                    ? 'bg-primary text-white shadow-md'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 border-[0.5px] border-slate-700 hover:border-primary hover:text-primary'
                    : 'bg-white text-slate-700 border-[0.5px] border-slate-200 hover:border-primary hover:text-primary'
                }`}
              >
                {tech}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {displayedProjects.map((project, index) => (
          <ProjectCard key={project._id} project={project} index={index + featuredProjects.length} isDarkMode={isDarkMode} />
        ))}
      </div>

      {/* Load More Button */}
      {filteredProjects.length > 6 && !showAll && (
        <div className="text-center mt-16">
          <button
            onClick={() => setShowAll(true)}
            className="px-8 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
          >
            Load More Projects ({filteredProjects.length - 6} more)
          </button>
        </div>
      )}

      {showAll && filteredProjects.length > 6 && (
        <div className="text-center mt-16">
          <button
            onClick={() => {
              setShowAll(false);
              window.scrollTo({ top: document.getElementById('work')?.offsetTop || 0, behavior: 'smooth' });
            }}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              isDarkMode 
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Show Less
          </button>
        </div>
      )}
    </section>
  );
};

interface ProjectCardProps {
  project: Project;
  index: number;
  featured?: boolean;
  isDarkMode?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, index, featured = false, isDarkMode = false }) => {
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const gradientStyle = getGradientPlaceholder(index);
  const mainLanguage = getMainLanguage(project.technologies);
  const languageLogoUrl = getLanguageLogoUrl(mainLanguage);

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-xl border-[0.5px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        isDarkMode 
          ? 'border-slate-800 bg-slate-900/50' 
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Project Image */}
      <div className={`relative w-full aspect-video overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
        {project.imageUrl && !imageError ? (
          <img
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            src={project.imageUrl}
            alt={project.title}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center relative"
            style={{ background: gradientStyle }}
          >
            {/* Try to load Unsplash placeholder, fallback to gradient */}
            <img
              className="w-full h-full object-cover opacity-0 absolute inset-0"
              src={getPlaceholderImage(project.title, index)}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              onLoad={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {languageLogoUrl && !logoError ? (
                <img
                  src={languageLogoUrl}
                  alt={mainLanguage || 'Language logo'}
                  className="w-20 h-20 object-contain filter brightness-0 invert opacity-90"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="text-white/80 text-4xl font-bold">
                  {project.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}
        {featured && (
          <div className={`absolute top-3 right-3 text-xs font-medium ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Featured
          </div>
        )}
      </div>

      {/* Project Content */}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex-1">
          <h3 className={`text-xl font-bold mb-3 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {project.title}
          </h3>
          <p className={`text-sm leading-relaxed line-clamp-3 mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {project.description}
          </p>
          {project.technologies && project.technologies.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {project.technologies.slice(0, 4).map((tech, techIndex) => (
                <span
                  key={techIndex}
                  className={`px-2 py-1 text-xs ${
                    isDarkMode 
                      ? 'text-slate-400' 
                      : 'text-slate-500'
                  }`}
                >
                  {tech}
                </span>
              ))}
              {project.technologies.length > 4 && (
                <span className={`px-2 py-1 text-xs ${
                  isDarkMode 
                    ? 'text-slate-500' 
                    : 'text-slate-400'
                }`}>
                  +{project.technologies.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex flex-wrap gap-2">
          {project.projectUrl && project.projectUrl !== '#' && (
            <a
              className={`flex h-9 flex-1 min-w-[100px] cursor-pointer items-center justify-center overflow-hidden rounded-lg px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isDarkMode
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
              href={project.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="truncate">Live Site</span>
              <svg className="ml-1.5 size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {project.githubUrl && (
            <a
              className={`flex h-9 flex-1 min-w-[100px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-[0.5px] bg-transparent px-3 text-sm font-medium transition-all hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isDarkMode 
                  ? 'border-slate-700 text-slate-300 hover:border-primary' 
                  : 'border-slate-300 text-slate-600 hover:border-primary'
              }`}
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="truncate">View Code</span>
              <svg className="ml-1.5 size-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.799 24 17.301 24 12c0-6.627-5.373-12-12-12z"></path>
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;

