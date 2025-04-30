// client/src/App.tsx
import React from 'react'; // Import React
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'; // Ensure all necessary imports from react-router-dom
import { useAuth } from './context/AuthContext';

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
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    // Main container div
    <div>
      {/* Navigation Bar */}
      <nav className="bg-gray-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo/Brand Link */}
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-bold hover:text-gray-300">
            Job App Assistant
          </Link>
          {/* Auth Links / User Info */}
          <div>
            {isAuthenticated ? (
              // Links shown when logged in
              <>
                <Link to="/dashboard" className="hover:text-gray-300 mr-4 text-sm sm:text-base">Dashboard</Link>
                <Link to="/manage-cv" className="hover:text-gray-300 mr-4 text-sm sm:text-base">Manage CV</Link>
                {/* --- Add Analyze CV Link --- */}
                <Link to="/analyze-cv" className="hover:text-gray-300 mr-4 text-sm sm:text-base">Analyze CV</Link>
                {/* --- End Analyze CV Link --- */}
                <span className="mr-4 text-sm hidden sm:inline">Welcome, {user?.email}</span> {/* Hide email on small screens if needed */}
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              // Links shown when logged out
              <>
                <Link to="/login" className="hover:text-gray-300 mr-4">Login</Link>
                <Link to="/register" className="hover:text-gray-300">Register</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="mt-4"> {/* Add some margin for content below nav */}
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

          {/* Optional: Catch-all route for 404 Not Found */}
          <Route path="*" element={<div className="text-center p-10">404 - Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;