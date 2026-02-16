'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api, { ApiError } from '../lib/api';
type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email';
interface AuthModalProps {
    initialMode?: AuthMode;
    resetToken?: string;
    onSuccess?: () => void;
    onClose?: () => void;
}
const AUTH_IMAGES: Record<string, {
    src: string;
    caption: string;
}> = {
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
const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', resetToken, onSuccess, onClose, }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [resetPasswordToken, setResetPasswordToken] = useState(resetToken || '');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    useEffect(() => {
        setMode(initialMode);
        setError(null);
        setSuccessMessage(null);
    }, [initialMode]);
    const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        setError(null);
        setSuccessMessage(null);
        const routeMap: Record<string, string> = {
            login: '/login',
            register: '/register',
            'forgot-password': '/forgot-password',
            'reset-password': '/reset-password',
            'verify-email': '/verify-email',
        };
        const target = routeMap[newMode];
        if (target && target !== pathname) {
            router.replace(target);
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
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
                response = await api.authApi.login({ email, password });
            }
            else {
                response = await api.authApi.register({ name, email, password });
            }
            const apiData = response?.data || response;
            const token = apiData?.token || apiData?.accessToken || apiData?.data?.token || (response as any)?.token;
            if (!token || typeof token !== 'string' || token.trim() === '') {
                setError('Authentication failed: No valid token received');
                return;
            }
            api.setAuthToken(token);
            onSuccess?.();
        }
        catch (err: any) {
            if (err instanceof ApiError) {
                setError(err.status === 401 ? 'Invalid credentials. Please try again.' : err.message);
            }
            else {
                setError(err?.message || 'Authentication failed. Please try again.');
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !isValidEmail(email)) {
            setError('Please enter a valid email');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await api.handleForgotPassword(email);
            setSuccessMessage('Password reset link sent! Check your email.');
        }
        catch (err: any) {
            setError(err?.message || 'Failed to send reset email.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim() || password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await api.handleResetPassword(resetPasswordToken, password);
            setSuccessMessage('Password reset successfully! You can now sign in.');
            setTimeout(() => switchMode('login'), 2000);
        }
        catch (err: any) {
            setError(err?.message || 'Failed to reset password.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const img = AUTH_IMAGES[mode] || AUTH_IMAGES.login;
    const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition text-sm font-medium text-gray-900 placeholder-gray-400';
    return (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget)
        onClose?.(); }}>
      <div className="w-full max-w-[780px] bg-white rounded-2xl shadow-2xl overflow-hidden flex animate-in zoom-in-95 duration-300 max-h-[90vh]">
        
        <div className="hidden md:flex w-[320px] shrink-0 relative overflow-hidden">
          <img src={img.src} alt="Travel" className="absolute inset-0 w-full h-full object-cover transition-all duration-700"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
          <div className="relative mt-auto p-8 text-white z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
              </div>
              <span className="text-xs font-bold tracking-wide opacity-90">Ebony Bruce Travels</span>
            </div>
            <p className="text-lg font-bold leading-snug">{img.caption}</p>
          </div>
        </div>

        
        <div className="flex-1 p-8 relative overflow-y-auto">
          {onClose && (<button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>)}

          
          <div className="flex md:hidden items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-[#33a8da] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
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

          
          {(mode === 'login' || mode === 'register') && (<form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (<div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="John Doe"/>
                </div>)}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@example.com"/>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
                  {mode === 'login' && <button type="button" onClick={() => switchMode('forgot-password')} className="text-[10px] font-bold text-[#33a8da] hover:underline">Forgot?</button>}
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••"/>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-lg hover:bg-[#2c98c7] transition text-sm disabled:opacity-50">
                {isLoading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>)}

          
          {mode === 'forgot-password' && (<form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@example.com"/>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-lg hover:bg-[#2c98c7] transition text-sm disabled:opacity-50"
              >
                {isLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>)}

          
          {mode === 'reset-password' && (<form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">New Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••"/>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-lg hover:bg-[#2c98c7] transition text-sm disabled:opacity-50"
              >
                {isLoading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>)}

          
          {mode === 'verify-email' && (<div className="text-center py-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <p className="text-sm text-gray-600">Check your inbox for the verification link.</p>
            </div>)}

          
          <div className="mt-5 text-center text-xs text-gray-500">
            {mode === 'login' && (<p>Don&apos;t have an account? <button onClick={() => switchMode('register')} className="text-[#33a8da] font-bold hover:underline">Sign Up</button></p>)}
            {mode === 'register' && (<p>Already have an account? <button onClick={() => switchMode('login')} className="text-[#33a8da] font-bold hover:underline">Sign In</button></p>)}
            {(mode === 'forgot-password' || mode === 'reset-password') && (<button onClick={() => switchMode('login')} className="text-[#33a8da] font-bold hover:underline">← Back to Sign In</button>)}
          </div>
        </div>
      </div>
    </div>);
};
export default AuthModal;
