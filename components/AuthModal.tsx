'use client';

import React, { useState, useEffect } from 'react';
import api from '../lib/api'; 

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string; token?: string; expiresIn?: number }) => void;
  onSocialLogin?: (provider: 'google' | 'facebook') => void;
  initialMode?: 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email';
  resetToken?: string;
}

// Travel images for the left panel (cycle on mode switch)
const AUTH_IMAGES: Record<string, { src: string; caption: string }> = {
  login: {
    src: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
    caption: 'Your next adventure starts here',
  },
  register: {
    src: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=80&w=800',
    caption: 'Join travelers worldwide',
  },
  'forgot-password': {
    src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800',
    caption: 'We\'ll get you back on track',
  },
  'reset-password': {
    src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800',
    caption: 'A fresh start awaits',
  },
  'verify-email': {
    src: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800',
    caption: 'Almost there!',
  },
};

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSocialLogin,
  initialMode = 'login',
  resetToken,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetPasswordToken, setResetPasswordToken] = useState(resetToken || '');

  // ✅ ADD THIS: Listen for auth success events from the callback page
  useEffect(() => {
    const handleAuthSuccess = (event: CustomEvent) => {
      const { token, user } = event.detail;
      
      console.log('Auth success event received:', { token, user });
      
      if (token) {
        // Set auth token
        api.setAuthToken(token);
        
        // Store user data if available
        if (user) {
          localStorage.setItem('travelUser', JSON.stringify(user));
        }
        
        // Call success callback
        onLoginSuccess({
          name: user?.name || user?.email?.split('@')[0] || 'User',
          email: user?.email || '',
          token
        });
        
        onClose();
      }
    };

    window.addEventListener('auth-success', handleAuthSuccess as EventListener);

    return () => {
      window.removeEventListener('auth-success', handleAuthSuccess as EventListener);
    };
  }, [onLoginSuccess, onClose]);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMessage(null);
    if (isOpen) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setResetPasswordToken(resetToken || '');
    }
  }, [initialMode, isOpen, resetToken]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Helper function to safely get error message
  const getErrorMessage = (err: any): string => {
    if (!err || Object.keys(err).length === 0) {
      return 'Network error. Please check your internet connection.';
    }
    
    if (err && typeof err === 'object') {
      if (err.status === 401) {
        return 'Invalid email or password. Please try again.';
      }
      if (err.code === 'INVALID_CREDENTIALS') {
        return 'Invalid email or password. Please try again.';
      }
      if (err.code === 'NETWORK_ERROR' || err.status === 0) {
        return 'Cannot connect to server. Please check your internet connection.';
      }
      if (err.code === 'TIMEOUT') {
        return 'Request timed out. Please try again.';
      }
      if (err.message) {
        return err.message;
      }
    }
    
    if (err?.response?.data?.message) {
      return err.response.data.message;
    }
    if (err?.response?.data?.error) {
      return err.response.data.error;
    }
    
    return err?.message || 'Authentication failed. Please try again.';
  };

  const handleLoginRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.trim() || !isValidEmail(email)) { 
      setError('Please enter a valid email'); 
      return; 
    }
    if (!password.trim() || password.length < 6) { 
      setError('Password must be at least 6 characters'); 
      return; 
    }
    if (mode === 'register' && !name.trim()) { 
      setError('Full name is required'); 
      return; 
    }
  
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      let fetchResponse;
      
      if (mode === 'login') {
        console.log('📤 Sending login request...');
        
        const loginData = {
          email: email,
          password: password
        };
        
        fetchResponse = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(loginData),
        });

        let data;
        try {
          data = await fetchResponse.json();
        } catch (e) {
          data = { message: await fetchResponse.text() };
        }
        
        console.log('📥 Login response:', { status: fetchResponse.status, data });

        if (!fetchResponse.ok) {
          throw {
            status: fetchResponse.status,
            message: data?.message || data?.error || `Server error: ${fetchResponse.status}`,
            code: fetchResponse.status === 401 ? 'INVALID_CREDENTIALS' : 'ERROR',
            data
          };
        }

        response = data;
        
      } else {
        console.log('📤 Sending register request...');
        
        const registerData = {
          name: name,
          email: email,
          password: password
        };
        
        fetchResponse = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(registerData),
        });

        let data;
        try {
          data = await fetchResponse.json();
        } catch (e) {
          data = { message: await fetchResponse.text() };
        }
        
        console.log('📥 Register response:', { status: fetchResponse.status, data });

        if (!fetchResponse.ok) {
          throw {
            status: fetchResponse.status,
            message: data?.message || data?.error || `Server error: ${fetchResponse.status}`,
            code: 'REGISTRATION_FAILED',
            data
          };
        }

        response = data;
      }
      
      // Extract token - check common response patterns
      const token = response?.token || 
                    response?.data?.token || 
                    response?.accessToken || 
                    response?.access_token;
      
      if (!token) {
        console.error('No token in response:', response);
        setError('Authentication failed: No valid token received');
        return;
      }
      
      // Set auth token
      api.setAuthToken(token);
      
      // Extract user data - adjust based on your actual response structure
      const userData = response?.user || 
                       response?.data?.user || 
                       response?.data || 
                       { name: name || email.split('@')[0], email };
      
      onLoginSuccess({ 
        name: userData.name || userData.fullName || name || email.split('@')[0], 
        email: userData.email || email, 
        token 
      });
      
      onClose();
      
    } catch (err: any) {
      console.error('❌ Auth error:', err);
      
      if (!err || Object.keys(err).length === 0) {
        setError('Network error. Please check your internet connection.');
      } else if (err.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.status === 422) {
        setError('Validation error. Please check your input.');
      } else if (err.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log('📤 Sending forgot password request...');
      
      const forgotPasswordData = {
        email: email
      };
      
      const fetchResponse = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(forgotPasswordData),
      });
      
      let data;
      try {
        data = await fetchResponse.json();
      } catch (e) {
        data = { message: await fetchResponse.text() };
      }
      
      console.log('📥 Forgot password response:', { status: fetchResponse.status, data });
      
      if (!fetchResponse.ok) {
        throw {
          status: fetchResponse.status,
          message: data?.message || data?.error || 'Failed to send reset email',
          data
        };
      }
      
      setSuccessMessage(data?.message || 'Password reset instructions sent to your email!');
      
      // Optional: Switch back to login after a delay
      setTimeout(() => {
        setMode('login');
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ Forgot password error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!resetPasswordToken) {
      setError('Invalid reset token');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log('📤 Sending reset password request...');
      
      const resetPasswordData = {
        token: resetPasswordToken,
        newPassword: password
      };
      
      const fetchResponse = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(resetPasswordData),
      });
      
      let data;
      try {
        data = await fetchResponse.json();
      } catch (e) {
        data = { message: await fetchResponse.text() };
      }
      
      console.log('📥 Reset password response:', { status: fetchResponse.status, data });
      
      if (!fetchResponse.ok) {
        throw {
          status: fetchResponse.status,
          message: data?.message || data?.error || 'Failed to reset password',
          data
        };
      }
      
      setSuccessMessage(data?.message || 'Password reset successfully! You can now login with your new password.');
      
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ Reset password error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetPasswordToken) {
      setError('Invalid verification token');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log('📤 Sending verify email request...');
      
      const verifyEmailData = {
        token: resetPasswordToken
      };
      
      const fetchResponse = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(verifyEmailData),
      });
      
      let data;
      try {
        data = await fetchResponse.json();
      } catch (e) {
        data = { message: await fetchResponse.text() };
      }
      
      console.log('📥 Verify email response:', { status: fetchResponse.status, data });
      
      if (!fetchResponse.ok) {
        throw {
          status: fetchResponse.status,
          message: data?.message || data?.error || 'Failed to verify email',
          data
        };
      }
      
      setSuccessMessage(data?.message || 'Email verified successfully! You can now login.');
      
      setTimeout(() => {
        setMode('login');
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ Verify email error:', err);
      setError(err.message || 'Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    if (onSocialLogin) {
      onSocialLogin(provider);
    } else {
      console.log(`Social login with ${provider}`);
      
      // Store the current URL to redirect back after OAuth
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      
      if (provider === 'google') {
        window.location.href = `https://ebony-bruce-production.up.railway.app/api/v1/auth/google?redirect_uri=${redirectUri}`;
      } else if (provider === 'facebook') {
        window.location.href = `https://ebony-bruce-production.up.railway.app/api/v1/auth/facebook?redirect_uri=${redirectUri}`;
      }
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    setPassword('');
    setConfirmPassword('');
    onClose();
  };

  // Common input class — darker text for better visibility
  const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition text-sm font-medium text-gray-900 placeholder-gray-400';

  const renderPasswordField = (
    id: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    placeholder: string,
    showPasswordState: boolean,
    setShowPasswordState: (value: boolean) => void,
    disabled?: boolean
  ) => {
    return (
      <div className="relative">
        <input
          type={showPasswordState ? 'text' : 'password'}
          id={id}
          required
          value={value}
          onChange={onChange}
          className={inputCls + " pr-12"}
          placeholder={placeholder}
          disabled={disabled || isLoading}
        />
        <button
          type="button"
          onClick={() => setShowPasswordState(!showPasswordState)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
          tabIndex={-1}
        >
          {showPasswordState ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
      </div>
    );
  };

  const img = AUTH_IMAGES[mode] || AUTH_IMAGES.login;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="w-full max-w-[780px] bg-white rounded-2xl shadow-2xl overflow-hidden flex animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* ── Left: Image Panel ── */}
        <div className="hidden md:flex w-[320px] shrink-0 relative overflow-hidden">
          <img
            src={img.src}
            alt="Travel"
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="relative mt-auto p-8 text-white z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </div>
              <span className="text-xs font-bold tracking-wide opacity-90">Ebony Bruce Travels</span>
            </div>
            <p className="text-lg font-bold leading-snug">{img.caption}</p>
          </div>
        </div>

        {/* ── Right: Form Panel ── */}
        <div className="flex-1 p-8 relative overflow-y-auto">
          <button 
            onClick={handleClose} 
            className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Logo (mobile only — desktop shows in image panel) */}
          <div className="flex md:hidden items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-[#33a8da] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">Ebony Bruce Travels</span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Create account'}
            {mode === 'forgot-password' && 'Reset password'}
            {mode === 'reset-password' && 'New password'}
            {mode === 'verify-email' && 'Verify email'}
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            {mode === 'login' && 'Sign in to continue your journey'}
            {mode === 'register' && 'Start exploring the world with us'}
            {mode === 'forgot-password' && "We'll send you a reset link"}
            {mode === 'reset-password' && 'Choose a new password'}
            {mode === 'verify-email' && 'Check your inbox for the verification link'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 text-xs font-semibold rounded-lg">
              {successMessage}
            </div>
          )}

          {/* ── Login / Register form ── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <form onSubmit={handleLoginRegister} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputCls}
                      placeholder="John Doe"
                      disabled={isLoading}
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="name@example.com"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-[10px] font-bold text-[#33a8da] hover:underline"
                        disabled={isLoading}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  {renderPasswordField(
                    'password',
                    password,
                    (e) => setPassword(e.target.value),
                    '••••••••',
                    showPassword,
                    setShowPassword,
                    isLoading
                  )}
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Confirm Password
                    </label>
                    {renderPasswordField(
                      'confirm-password',
                      confirmPassword,
                      (e) => setConfirmPassword(e.target.value),
                      '••••••••',
                      showConfirmPassword,
                      setShowConfirmPassword,
                      isLoading
                    )}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-lg hover:bg-[#2c98c7] transition text-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              {/* Social Login */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSocialLogin('google')}
                    disabled={isLoading}
                    className="flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-xs font-bold text-gray-700">Google</span>
                  </button>
                  
                  <button
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={isLoading}
                    className="flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 text-sm"
                  >
                    <svg className="w-4 h-4 mr-2 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="text-xs font-bold text-gray-700">Facebook</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Forgot password form ── */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="name@example.com"
                  disabled={isLoading}
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-lg hover:bg-[#2c98c7] transition text-sm disabled:opacity-50"
              >
                {isLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* ── Reset password form ── */}
          {mode === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                  New Password
                </label>
                {renderPasswordField(
                  'new-password',
                  password,
                  (e) => setPassword(e.target.value),
                  '••••••••',
                  showPassword,
                  setShowPassword,
                  isLoading
                )}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                  Confirm Password
                </label>
                {renderPasswordField(
                  'confirm-password',
                  confirmPassword,
                  (e) => setConfirmPassword(e.target.value),
                  '••••••••',
                  showConfirmPassword,
                  setShowConfirmPassword,
                  isLoading
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-lg hover:bg-[#2c98c7] transition text-sm disabled:opacity-50"
              >
                {isLoading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* ── Verify email ── */}
          {mode === 'verify-email' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Check your inbox for the verification link.</p>
              <form onSubmit={handleVerifyEmail} className="mt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-lg hover:bg-[#2c98c7] transition text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify Email'}
                </button>
              </form>
            </div>
          )}

          {/* ── Toggle / back links ── */}
          <div className="mt-5 text-center text-xs text-gray-500">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-[#33a8da] font-bold hover:underline"
                  disabled={isLoading}
                >
                  Sign Up
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-[#33a8da] font-bold hover:underline"
                  disabled={isLoading}
                >
                  Sign In
                </button>
              </p>
            )}
            {(mode === 'forgot-password' || mode === 'reset-password' || mode === 'verify-email') && (
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-[#33a8da] font-bold hover:underline"
                disabled={isLoading}
              >
                ← Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;