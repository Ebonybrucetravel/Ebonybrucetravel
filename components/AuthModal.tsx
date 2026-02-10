'use client';

import React, { useState, useEffect } from 'react';
import api, { ApiError } from '../lib/api'; // FIXED: Import ApiError as value, not just type

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string; token?: string; expiresIn?: number }) => void;
  onSocialLogin?: (provider: 'google' | 'facebook') => void;
  initialMode?: 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email';
  resetToken?: string;
}

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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetPasswordToken, setResetPasswordToken] = useState(resetToken || '');

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

  const handleLoginRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (mode === 'login') {
        console.log('📤 Sending login request...');
        response = await api.authApi.login({ email, password });
        console.log('📥 Login response:', JSON.stringify(response, null, 2));
      } else {
        console.log('📤 Sending register request...');
        response = await api.authApi.register({ name, email, password });
        console.log('📥 Register response:', JSON.stringify(response, null, 2));
      }
      
      // FIXED: Better token extraction with debugging
      console.log('Full API Response:', response);
      
      const apiData = response?.data || response;
      const token = apiData?.token || apiData?.accessToken || apiData?.data?.token || (response as any)?.token;
      
      if (!token || typeof token !== 'string' || token.trim() === '') {
        console.error('Invalid or empty token received:', token);
        setError('Authentication failed: No valid token received from server');
        return;
      }
      
      console.log('Token received (first 20 chars):', token.substring(0, 20) + '...');
      
      // FIXED: Set auth token - only pass the token string
      api.setAuthToken(token);
      
      // Get user data
      const userData = apiData?.user || apiData?.data?.user || {
        name: apiData?.name || name || email,
        email: apiData?.email || email,
        token: token
      };
      
      // FIXED: Wait a bit to ensure token is saved
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Call onLoginSuccess with user data
      onLoginSuccess({ 
        name: userData.name || name || email, 
        email: userData.email || email, 
        token 
      });
      
      onClose();
    } catch (err: any) {
      // FIXED: Handle ApiError specifically
      console.error('Auth error:', err);
      
      if (err instanceof ApiError) { // This now works because ApiError is imported as a value
        if (err.status === 401) {
          setError('Session expired. Please sign in again.');
          // Clear any existing invalid token
          api.setAuthToken('');
          return;
        }
        setError(err.message || `API Error: ${err.status}`);
      } else {
        setError(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    setPassword('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white md:rounded-[32px] shadow-2xl overflow-hidden flex min-h-screen md:min-h-[600px] animate-in zoom-in-95 duration-500">
        <div className="hidden lg:block w-[45%] relative overflow-hidden">
          {images.map((img, idx) => (
            <div key={idx} className={`absolute inset-0 transition-opacity duration-1000 ${activeImageIndex === idx ? 'opacity-100' : 'opacity-0'}`}>
              <img src={img.url} className="w-full h-full object-cover scale-105" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>
          ))}
        </div>
        <div className="w-full lg:w-[55%] flex flex-col p-8 md:p-12 relative bg-white">
          <button onClick={handleClose} className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Join Ebony Bruce'}
            </h1>
            {error && <div className="mb-4 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl">{error}</div>}
            <form onSubmit={handleLoginRegister} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition-all text-sm font-medium text-gray-900 placeholder-gray-400" placeholder="John Doe" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition-all text-sm font-medium text-gray-900 placeholder-gray-400" placeholder="name@example.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition-all text-sm font-medium text-gray-900 placeholder-gray-400" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-[#33a8da] text-white font-bold py-4 rounded-xl hover:bg-[#2c98c7] transition shadow-lg disabled:opacity-50">
                {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            <p className="mt-6 text-center text-xs font-medium text-gray-600">
              {mode === 'login' ? "Don't have an account?" : "Already a member?"}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="ml-1.5 text-[#33a8da] hover:underline font-bold uppercase">{mode === 'login' ? 'Sign up' : 'Log in'}</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;