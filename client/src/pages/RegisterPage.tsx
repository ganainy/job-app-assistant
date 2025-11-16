// client/src/pages/RegisterPage.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Spinner from '../components/common/Spinner';

// Icon components
const EmailIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const SuccessIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

// Password strength types
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

// Calculate password strength
const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (password.length === 0) return 'weak';
  
  let strength = 0;
  
  // Length checks
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
  
  if (strength <= 2) return 'weak';
  if (strength === 3) return 'fair';
  if (strength === 4) return 'good';
  return 'strong';
};

// Get password strength color
const getStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'fair':
      return 'bg-orange-500';
    case 'good':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
    default:
      return 'bg-slate-300';
  }
};

// Get password strength text
const getStrengthText = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
    default:
      return '';
  }
};

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  const { register, error: authError, isLoading } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = calculatePasswordStrength(password);

  // Email validation
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  // Password validation
  const validatePassword = (passwordValue: string): string | null => {
    if (passwordValue.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  // Handle email change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      if (value && !validateEmail(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError(null);
      }
    }
  };

  // Handle password change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setLocalError(null);
    
    if (touched.password) {
      const error = validatePassword(value);
      setPasswordError(error);
    }
    
    // Check if passwords match when confirm password is filled
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else if (confirmPassword && value === confirmPassword) {
      setConfirmPasswordError(null);
    }
  };

  // Handle confirm password change
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setLocalError(null);
    
    if (touched.confirmPassword) {
      if (value && value !== password) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError(null);
      }
    }
  };

  // Handle blur events
  const handleBlur = (field: 'email' | 'password' | 'confirmPassword') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'email' && email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else if (field === 'email') {
      setEmailError(null);
    } else if (field === 'password' && password) {
      const error = validatePassword(password);
      setPasswordError(error);
    } else if (field === 'confirmPassword' && confirmPassword) {
      if (confirmPassword !== password) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError(null);
      }
    }
  };

  // Redirect to Settings after successful registration
  useEffect(() => {
    if (registrationSuccess) {
      const timer = setTimeout(() => {
        // Redirect to Settings page with onboarding flag
        navigate('/settings', { state: { fromRegistration: true } });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [registrationSuccess, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true });
    setLocalError(null);
    setRegistrationSuccess(false);

    // Validate email
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate password
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      setLocalError('Passwords do not match.');
      return;
    }

    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    await register({ email, password });

    // Check if registration was successful
    if (!authError && !isLoading) {
      setRegistrationSuccess(true);
    }
  };

  const isEmailValid = email && touched.email && !emailError;
  const isEmailInvalid = touched.email && emailError;
  const isPasswordValid = password && touched.password && !passwordError;
  const isPasswordInvalid = touched.password && passwordError;
  const isConfirmPasswordValid = confirmPassword && touched.confirmPassword && !confirmPasswordError;
  const isConfirmPasswordInvalid = touched.confirmPassword && confirmPasswordError;

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-300">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Create Your Account</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Sign up to get started</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {/* Display registration errors */}
          {(localError || authError) && !registrationSuccess && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-2 animate-slide-in">
              <ErrorIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* Display success message */}
          {registrationSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded-lg border border-green-200 dark:border-green-800 flex items-start gap-2 animate-slide-in">
              <SuccessIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Registration successful! Redirecting to settings to configure API keys...</span>
            </div>
          )}

          {/* Hide form fields on success */}
          {!registrationSuccess && (
            <>
              {/* Email field */}
              <div>
                <label htmlFor="email-register" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EmailIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="email-register"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => handleBlur('email')}
                    aria-invalid={isEmailInvalid ? 'true' : 'false'}
                    aria-describedby={isEmailInvalid ? 'email-error' : undefined}
                    className={`mt-1 block w-full pl-10 pr-3 py-2.5 border rounded-lg shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm transition-all duration-200 ${
                      isEmailInvalid
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                        : isEmailValid
                        ? 'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {isEmailInvalid && (
                  <p id="email-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ErrorIcon className="w-4 h-4" />
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password-register" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="password-register"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={() => handleBlur('password')}
                    aria-invalid={isPasswordInvalid ? 'true' : 'false'}
                    aria-describedby={isPasswordInvalid ? 'password-error' : undefined}
                    className={`mt-1 block w-full pl-10 pr-10 py-2.5 border rounded-lg shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm transition-all duration-200 ${
                      isPasswordInvalid
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                        : isPasswordValid
                        ? 'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {isPasswordInvalid && (
                  <p id="password-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ErrorIcon className="w-4 h-4" />
                    {passwordError}
                  </p>
                )}
                {/* Password strength indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Password strength:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength === 'weak' ? 'text-red-600 dark:text-red-400' :
                        passwordStrength === 'fair' ? 'text-orange-600 dark:text-orange-400' :
                        passwordStrength === 'good' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {getStrengthText(passwordStrength)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength === 'weak' ? 'w-1/4' :
                          passwordStrength === 'fair' ? 'w-2/4' :
                          passwordStrength === 'good' ? 'w-3/4' :
                          'w-full'
                        } ${getStrengthColor(passwordStrength)}`}
                      />
                    </div>
                    <ul className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <li className={password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                        {password.length >= 8 ? '✓' : '○'} At least 8 characters
                      </li>
                      <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                        {/[a-z]/.test(password) && /[A-Z]/.test(password) ? '✓' : '○'} Upper and lowercase letters
                      </li>
                      <li className={/[0-9]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                        {/[0-9]/.test(password) ? '✓' : '○'} At least one number
                      </li>
                      <li className={/[^a-zA-Z0-9]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                        {/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} At least one special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    aria-invalid={isConfirmPasswordInvalid ? 'true' : 'false'}
                    aria-describedby={isConfirmPasswordInvalid ? 'confirm-password-error' : undefined}
                    className={`mt-1 block w-full pl-10 pr-10 py-2.5 border rounded-lg shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm transition-all duration-200 ${
                      isConfirmPasswordInvalid
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                        : isConfirmPasswordValid
                        ? 'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {isConfirmPasswordInvalid && (
                  <p id="confirm-password-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ErrorIcon className="w-4 h-4" />
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="text-sm text-center text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;