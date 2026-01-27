'use client';

import React, { useState, useEffect } from 'react';
import { authApi, setAuthToken } from '../lib/api';
import type { ApiError } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string; token?: string }) => void;
  onSocialLogin?: (provider: 'google' | 'facebook') => void;
  initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSocialLogin,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const images = [
    {
      url: 'https://images.unsplash.com/photo-1580285198593-af9f402c676a?auto=format&fit=crop&q=80&w=1200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      ),
    },
    {
      url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2zm3-8h4c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM3 21h18v-2H3v2zM3 8c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10H3V8z" />
        </svg>
      ),
    },
    {
      url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % images.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, images.length]);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    if (isOpen) {
      setEmail('');
      setPassword('');
      setName('');
    }
  }, [initialMode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (mode === 'login') {
        response = await authApi.login({ email, password });
      } else {
        if (!name.trim()) {
          throw new Error('Full name is required');
        }
        response = await authApi.register({ name, email, password });
      }

      // Check if response has token and user data
      const token = response?.token || (response as any)?.data?.token;
      const userData = response?.user || (response as any)?.data?.user;

      if (!token || !userData) {
        throw new Error('Invalid response from server');
      }

      // Store the token
      setAuthToken(token);

      // Call success callback
      onLoginSuccess({
        name: userData.name || name || 'Traveler',
        email: userData.email || email,
        token,
      });

      onClose();
    } catch (err: any) {
      console.error('Authentication error:', err);
      
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (err instanceof Error && err.name === 'ApiError') {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (onSocialLogin) {
      onSocialLogin(provider);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Mock social login (replace with actual OAuth flow)
    setTimeout(() => {
      const mockToken = `mock_${provider}_token_${Date.now()}`;
      const mockUser = {
        name: provider === 'google' ? 'Google User' : 'Facebook User',
        email: provider === 'google' ? 'google.user@example.com' : 'facebook.user@example.com',
      };

      setAuthToken(mockToken);
      onLoginSuccess({
        name: mockUser.name,
        email: mockUser.email,
        token: mockToken,
      });
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white md:rounded-[32px] shadow-2xl overflow-hidden flex min-h-screen md:min-h-[600px] animate-in zoom-in-95 duration-500">
        {/* Left decorative panel - visible on large screens */}
        <div className="hidden lg:block w-[45%] relative overflow-hidden">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                activeImageIndex === idx ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img src={img.url} className="w-full h-full object-cover scale-105" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-10 left-10">
                <div className="bg-[#33a8da] p-2.5 rounded-lg text-white shadow-lg">{img.icon}</div>
              </div>
              <div className="absolute bottom-16 left-10 right-10 text-white">
                <h2 className="text-2xl font-bold leading-tight mb-3">
                  Your journey begins before you board.
                </h2>
                <p className="text-sm text-gray-200 opacity-90 font-medium">
                  Discover world-class destinations and find exclusive offers just for members.
                </p>
                <div className="flex gap-1.5 mt-6">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        activeImageIndex === i ? 'w-8 bg-[#33a8da]' : 'w-8 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form side */}
        <div className="w-full lg:w-[55%] flex flex-col p-8 md:p-12 relative bg-white">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-900 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center">
            <div className="mb-6">
              <div className="bg-[#33a8da] w-10 h-10 rounded-lg flex items-center justify-center text-white mb-4">
                {images[activeImageIndex].icon}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-gray-500 font-medium text-sm leading-relaxed">
                {mode === 'login'
                  ? 'Sign in to manage bookings and unlock travel deals.'
                  : 'Join Ebony Bruce Travels today and start exploring.'}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition-all text-sm font-medium placeholder-gray-500"
                    placeholder="e.g. Obafemi Awolowo"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition-all text-sm font-medium placeholder-gray-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition-all text-sm font-medium placeholder-gray-500 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#33a8da] text-white font-bold py-3.5 rounded-xl hover:bg-[#2c98c7] transition shadow-lg shadow-blue-500/10 active:scale-[0.98] text-base flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Or continue with</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => handleSocialLogin('facebook')}
                disabled={isLoading}
                className="flex-1 py-3 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>

              <button
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                className="flex-1 py-3 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </button>
            </div>

            <p className="text-center text-xs font-medium text-gray-600">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="ml-1.5 text-[#33a8da] hover:underline font-semibold"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;