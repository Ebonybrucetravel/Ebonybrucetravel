'use client';
import React, { useState, useEffect, useCallback } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string }) => void;
  onSocialLogin: (provider: 'google' | 'facebook') => void;
  initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  onSocialLogin, 
  initialMode = 'login' 
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const images = [
    {
      url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800',
      alt: 'Airplane in flight',
      icon: '✈️'
    },
    {
      url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
      alt: 'Luxury hotel room',
      icon: '🏨'
    },
    {
      url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      alt: 'Premium car rental',
      icon: '🚗'
    }
  ];
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Image carousel effect
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setActiveImageIndex(prev => (prev + 1) % images.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setShowPassword(false);
    }
    setMode(initialMode);
  }, [isOpen, initialMode]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.trim()) {
      alert('Please enter your email');
      return;
    }
    
    if (!password.trim()) {
      alert('Please enter your password');
      return;
    }
    
    if (mode === 'register' && !name.trim()) {
      alert('Please enter your name');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onLoginSuccess({ 
        name: name.trim() || email.split('@')[0] || 'Traveler', 
        email: email.trim() 
      });
      onClose();
    } catch (error) {
      console.error('Login error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, name, mode, onLoginSuccess, onClose]);

  const handleSocialLogin = useCallback((provider: 'google' | 'facebook') => {
    setIsLoading(true);
    // Simulate social login
    setTimeout(() => {
      onSocialLogin(provider);
      setIsLoading(false);
      onClose();
    }, 1500);
  }, [onSocialLogin, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-4xl bg-white md:rounded-[32px] shadow-2xl overflow-hidden flex min-h-screen md:min-h-[600px] animate-in zoom-in-95 duration-300">
        {/* Left side - Image Carousel */}
        <div className="hidden lg:block w-[45%] relative overflow-hidden">
          {images.map((img, idx) => (
            <div 
              key={idx} 
              className={`absolute inset-0 transition-opacity duration-1000 ${activeImageIndex === idx ? 'opacity-100' : 'opacity-0'}`}
            >
              <img 
                src={img.url} 
                className="w-full h-full object-cover scale-105" 
                alt={img.alt}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-10 left-10">
                <div className="bg-[#33a8da] p-2.5 rounded-lg text-white shadow-lg text-xl">
                  {img.icon}
                </div>
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
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`h-1 rounded-full transition-all duration-300 ${activeImageIndex === i ? 'w-8 bg-[#33a8da]' : 'w-8 bg-white/20 hover:bg-white/40'}`}
                      aria-label={`View image ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right side - Form */}
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
              <div className="bg-[#33a8da] w-10 h-10 rounded-lg flex items-center justify-center text-white mb-4 text-xl">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input 
                    id="name"
                    type="text" 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/5 focus:border-[#33a8da] transition-all text-sm font-medium" 
                    placeholder="e.g. Ebony Bruce" 
                    disabled={isLoading}
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input 
                  id="email"
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/5 focus:border-[#33a8da] transition-all text-sm font-medium" 
                  placeholder="name@example.com" 
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input 
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/5 focus:border-[#33a8da] transition-all text-sm font-medium pr-10" 
                    placeholder="Enter password" 
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-[#33a8da] text-white font-bold py-3.5 rounded-xl hover:bg-[#2c98c7] transition shadow-lg shadow-blue-500/10 active:scale-[0.98] text-base disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                Or continue with
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="flex gap-3 mb-6">
              <button 
                onClick={() => handleSocialLogin('facebook')}
                className="flex-1 py-3 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading}
                aria-label="Sign in with Facebook"
              >
                <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
              
              <button 
                onClick={() => handleSocialLogin('google')}
                className="flex-1 py-3 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading}
                aria-label="Sign in with Google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </button>
            </div>
            
            <p className="text-center text-xs font-bold text-gray-500">
              {mode === 'login' ? "Not a member?" : "Already a member?"}
              <button 
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="ml-1.5 text-[#33a8da] hover:underline disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {mode === 'login' ? 'Create account' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;