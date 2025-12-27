import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const BagFilledIcon = () => (
    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 6h-3V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9 4h6v2H9V4zm11 15H4V10h2v1h2v-1h6v1h2v-1h2v9z" />
    </svg>
);

const DashboardIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const WorkIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const LogoutIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const AnalyticsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const AutoJobsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const PortfolioIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActiveRoute = (path: string) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        return location.pathname.startsWith(path);
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { path: '/manage-cv', label: 'Manage CV', icon: WorkIcon },
        { path: '/auto-jobs', label: 'Auto Jobs', icon: AutoJobsIcon },
        { path: '/analytics', label: 'Analytics', icon: AnalyticsIcon },
        { path: '/portfolio-setup', label: 'Portfolio', icon: PortfolioIcon },
        { path: '/settings', label: 'Settings', icon: SettingsIcon },
    ];

    return (
        <div
            className={`flex flex-col h-screen ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 relative`}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 shadow-sm z-50 transition-colors"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Brand */}
            <Link
                to="/dashboard"
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-6'} h-20 border-b border-slate-100 dark:border-slate-800/50 transition-all duration-300 overflow-hidden whitespace-nowrap hover:bg-slate-50 dark:hover:bg-slate-800/50`}
            >
                <div className="text-purple-600 dark:text-purple-400 shrink-0">
                    <BagFilledIcon />
                </div>
                {!isCollapsed && (
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-200 duration-200">
                        VibeHired
                    </span>
                )}
            </Link>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const ActiveIcon = item.icon;
                    const isActive = isActiveRoute(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.label : ''}
                            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive
                                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400'
                                }`}
                        >
                            <ActiveIcon />
                            {!isCollapsed && <span>{item.label}</span>}
                            {isActive && !isCollapsed && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                {/* User Profile */}
                <div className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-4 py-3'} rounded-lg bg-slate-50 dark:bg-slate-800/50 transition-all duration-300`}>
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 text-xs shadow-sm border border-purple-200 dark:border-purple-700 shrink-0">
                        {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                {user?.email || 'User'}
                            </p>
                        </div>
                    )}
                </div>

                <div className={`flex ${isCollapsed ? 'flex-col' : ''} gap-2`}>
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700`}
                        aria-label="Toggle dark mode"
                    >
                        {theme === 'dark' ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                {!isCollapsed && <span>Light</span>}
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                {!isCollapsed && <span>Dark</span>}
                            </>
                        )}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-slate-200 dark:border-slate-700"
                        aria-label="Logout"
                    >
                        <LogoutIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
