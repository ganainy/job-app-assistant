// client/src/App.tsx
import React from 'react'; // Import React
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'; // Ensure all necessary imports from react-router-dom
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

// Import Pages
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CVManagementPage from './pages/CVManagementPage';
import ReviewFinalizePage from './pages/ReviewFinalizePage';
import AnalysisPage from './pages/AnalysisPage';
import ProtectedRoute from './components/ProtectedRoute'; // Assuming you have this

// Example: Placeholder for ProfilePage if you were to use the commented route
// import ProfilePage from './pages/ProfilePage';

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    // Main container div
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 dark:bg-gray-950 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo/Brand Link */}
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-bold hover:text-gray-300 dark:hover:text-gray-400">
            Job App Assistant
          </Link>
          {/* Auth Links / User Info */}
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
              // Links shown when logged in
              <>
                <Link to="/dashboard" className="hover:text-gray-300 dark:hover:text-gray-400 mr-4 text-sm sm:text-base">Dashboard</Link>
                <Link to="/manage-cv" className="hover:text-gray-300 dark:hover:text-gray-400 mr-4 text-sm sm:text-base">Manage CV</Link>
                {/* --- Add Analyze CV Link --- */}
                <Link to="/analyze-cv" className="hover:text-gray-300 dark:hover:text-gray-400 mr-4 text-sm sm:text-base">Analyze CV</Link>
                {/* --- End Analyze CV Link --- */}
                <span className="mr-4 text-sm hidden sm:inline">Welcome, {user?.email}</span> {/* Hide email on small screens if needed */}
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              // Links shown when logged out
              <>
                <Link to="/login" className="hover:text-gray-300 dark:hover:text-gray-400 mr-4">Login</Link>
                <Link to="/register" className="hover:text-gray-300 dark:hover:text-gray-400">Register</Link>
              </>
            )}
          </div>
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