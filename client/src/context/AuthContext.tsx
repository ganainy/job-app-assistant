// client/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { loginUser, registerUser } from '../services/authApi'; // Import API calls
import axios from 'axios'; // Import axios to set default header

// Define the shape of the user object
interface User {
  id: string;
  email: string;
  cvJson?: any;
  preferredTheme?: string; // Add this line
}

// Define the shape of the context value
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean; // Track initial auth state loading
  error: string | null; // Store login/register errors
  login: (credentials: {email: string, password: string}) => Promise<void>;
  register: (credentials: {email: string, password: string}) => Promise<void>;
  logout: () => void;
}

// Create the context with a default undefined value initially
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially
  const [error, setError] = useState<string | null>(null);

  // Effect to check for existing token in localStorage on initial load
  useEffect(() => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        // Set Axios default Authorization header for subsequent requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch (e) {
         console.error("Failed to parse stored user data", e);
         localStorage.removeItem('authToken');
         localStorage.removeItem('authUser');
      }
    }
    setIsLoading(false); // Finished loading initial state
  }, []);

  // Login function
  const login = async (credentials: {email: string, password: string}) => {
    setError(null); // Clear previous errors
    setIsLoading(true);
    try {
      const response = await loginUser(credentials);
      setUser(response.user);
      setToken(response.token);
      // Store token and user info in localStorage
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('authUser', JSON.stringify(response.user));
      // Set Axios default Authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
      setIsLoading(false);
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || 'Login failed. Please check credentials.');
      setIsLoading(false);
      // Ensure cleanup if login fails
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

   // Register function (doesn't log in automatically)
  const register = async (credentials: {email: string, password: string}) => {
    setError(null);
    setIsLoading(true); // Use isLoading maybe? Or a separate registerLoading state
    try {
        await registerUser(credentials);
        // Optionally set a success message state here instead of error
        setIsLoading(false);
        // Maybe redirect to login or show success message
    } catch (err: any) {
        console.error("Registration failed:", err);
        setError(err.message || 'Registration failed.');
        setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    // Remove Axios default Authorization header
    delete axios.defaults.headers.common['Authorization'];
  };

  // Value provided by the context
  const value = {
    isAuthenticated: !!token, // True if token exists
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily consume the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};