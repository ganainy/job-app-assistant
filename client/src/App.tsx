// client/src/App.tsx
import React, { useState, useEffect } from 'react'; // Import React
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom'; // Ensure all necessary imports from react-router-dom
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

// Import Pages
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CVManagementPage from './pages/CVManagementPage';
import ReviewFinalizePage from './pages/ReviewFinalizePage';
import AnalysisPage from './pages/AnalysisPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Example: Placeholder for ProfilePage if you were to use the commented route
// import ProfilePage from './pages/ProfilePage';

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
    setIsMobileMenuOpen(false); // Close mobile menu on logout
  };

  // Helper function to check if route is active
  const isActiveRoute = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Get shortened email (first part before @)
  const getShortEmail = (email: string | undefined) => {
    if (!email) return '';
    const parts = email.split('@');
    return parts[0];
  };

  // Close mobile menu when clicking outside or on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    // Main container div
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 dark:bg-gray-950 text-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand Link */}
            <Link 
              to={isAuthenticated ? "/dashboard" : "/"} 
              className="text-xl font-bold hover:text-gray-300 dark:hover:text-gray-400 transition-colors"
            >
              Job App Assistant
            </Link>

            {/* Desktop Navigation */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-1">
                {/* Dashboard Link */}
                <Link 
                  to="/dashboard" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActiveRoute('/dashboard')
                      ? 'bg-gray-700 dark:bg-gray-800 text-white'
                      : 'hover:bg-gray-700 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>

                {/* Manage CV Link */}
                <Link 
                  to="/manage-cv" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActiveRoute('/manage-cv')
                      ? 'bg-gray-700 dark:bg-gray-800 text-white'
                      : 'hover:bg-gray-700 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Manage CV
                </Link>

                {/* Analyze CV Link */}
                <Link 
                  to="/analyze-cv" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActiveRoute('/analyze-cv') || isActiveRoute('/analysis')
                      ? 'bg-gray-700 dark:bg-gray-800 text-white'
                      : 'hover:bg-gray-700 dark:hover:bg-gray-800 text-gray-300 dark:text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analyze CV
                </Link>
              </div>
            )}

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {isAuthenticated ? (
                // Desktop User Section
                <>
                  <div className="hidden md:flex items-center gap-3">
                    {/* User Avatar/Icon */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 dark:bg-gray-600 text-sm font-medium">
                      {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    {/* Shortened Email */}
                    <span className="text-sm text-gray-300 dark:text-gray-400">
                      {getShortEmail(user?.email)}
                    </span>
                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-md text-sm font-medium bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                    >
                      Logout
                    </button>
                  </div>

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden p-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Toggle menu"
                  >
                    {isMobileMenuOpen ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </>
              ) : (
                // Links shown when logged out
                <div className="hidden md:flex items-center gap-3">
                  <Link 
                    to="/login" 
                    className="px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="px-4 py-2 rounded-md text-sm font-medium bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {isAuthenticated && isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-700 dark:border-gray-800">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {/* Mobile Dashboard Link */}
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-all ${
                    isActiveRoute('/dashboard')
                      ? 'bg-gray-700 dark:bg-gray-800 text-white'
                      : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>

                {/* Mobile Manage CV Link */}
                <Link
                  to="/manage-cv"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-all ${
                    isActiveRoute('/manage-cv')
                      ? 'bg-gray-700 dark:bg-gray-800 text-white'
                      : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Manage CV
                </Link>

                {/* Mobile Analyze CV Link */}
                <Link
                  to="/analyze-cv"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-all ${
                    isActiveRoute('/analyze-cv') || isActiveRoute('/analysis')
                      ? 'bg-gray-700 dark:bg-gray-800 text-white'
                      : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analyze CV
                </Link>

                {/* Mobile User Info */}
                <div className="flex items-center gap-3 px-3 py-2 border-t border-gray-700 dark:border-gray-800 mt-2 pt-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 dark:bg-gray-600 text-sm font-medium">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm text-gray-300 dark:text-gray-400 flex-1">
                    {getShortEmail(user?.email)}
                  </span>
                </div>

                {/* Mobile Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors mt-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Mobile Auth Links (when not authenticated) */}
          {!isAuthenticated && (
            <div className="md:hidden border-t border-gray-700 dark:border-gray-800">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="mt-4 text-gray-900 dark:text-gray-100"> {/* Add some margin for content below nav */}
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Root Path Logic: Redirect to dashboard if logged in, else show Login */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/manage-cv" element={<ProtectedRoute><CVManagementPage /></ProtectedRoute>} />

          {/* --- NEW Route for Review/Finalize Page --- */}
          <Route
            path="/jobs/:jobId/review" // Use :jobId as a URL parameter
            element={
              <ProtectedRoute>
                <ReviewFinalizePage />
              </ProtectedRoute>
            }
          />
          {/* --- End of New Route --- */}

          <Route path="/analyze-cv" element={
            <ProtectedRoute>
              <AnalysisPage />
            </ProtectedRoute>
          } />

          {/* --- NEW Route for Viewing Analysis Results by ID --- */}
          <Route path="/analysis/:id" element={
            <ProtectedRoute>
              <AnalysisPage />
            </ProtectedRoute>
          } />
          {/* --- End of New Route --- */}

          {/* Optional: Catch-all route for 404 Not Found */}
          <Route path="*" element={<div className="text-center p-10 dark:text-gray-300">404 - Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;