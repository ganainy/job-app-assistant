// client/src/App.tsx
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'; // Import useNavigate and Navigate here
import { useAuth } from './context/AuthContext';

// Import Pages
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute'; 

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate(); // Now this should work

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

 return (
    // Use a container that doesn't center everything for non-auth pages
    // Apply different layouts if needed based on auth state or route
    <div>
      {/* Basic Navigation */}
      <nav className="bg-gray-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-bold hover:text-gray-300">
             Job App Assistant
          </Link>
          <div>
            {isAuthenticated ? (
              <>
                <span className="mr-4">Welcome, {user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-gray-300 mr-4">Login</Link>
                <Link to="/register" className="hover:text-gray-300">Register</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <main className="mt-4"> {/* Add some margin */}
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* If logged in, "/" redirects to dashboard, otherwise shows landing/login */}
          {/* You might want a dedicated Landing Page component later */}
           <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} /> {/* Also ensure Navigate is imported */}


          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Add other protected routes here later */}
          {/* Example:
           <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          /> */}

          {/* Optional: Catch-all route for 404 Not Found */}
          <Route path="*" element={<div className="text-center p-10">404 - Page Not Found</div>} />

        </Routes>
      </main>
    </div>
  );
}

export default App;