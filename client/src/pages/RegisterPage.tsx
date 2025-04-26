// client/src/pages/RegisterPage.tsx
import React, { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext'; // Import the hook
import { Link, useNavigate } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null); // For password mismatch
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false); // For success message
  const { register, error: authError, isLoading } = useAuth(); // Use context
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null); // Clear local errors
    setRegistrationSuccess(false);

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    // Add password strength validation if needed

    await register({ email, password });

    // Check if there was NO authError after attempting registration
    // Note: The register function in context currently doesn't return success state directly
    // We infer success if isLoading finishes and authError is still null.
    // A more robust way is to modify the register function in context to return success/failure.
    if (!authError && !isLoading) { // Check context error *after* await
        setRegistrationSuccess(true);
        // Optionally redirect after a delay
        setTimeout(() => {
            navigate('/login');
        }, 2000); // Redirect after 2 seconds
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Create Your Account</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Display registration errors (from context or local) */}
          {(localError || authError) && !registrationSuccess && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded border border-red-300">
                {localError || authError}
            </div>
          )}

          {/* Display success message */}
          {registrationSuccess && (
            <div className="p-3 bg-green-100 text-green-700 text-sm rounded border border-green-300">
                Registration successful! Redirecting to login...
            </div>
          )}

          {/* Hide form fields on success */}
          {!registrationSuccess && (
            <>
              <div>
                <label htmlFor="email-register" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email-register" name="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="password-register" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password-register" name="password" type="password" autoComplete="new-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <button
                  type="submit" disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </>
          )}
        </form>
        <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;