'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import api from '@/lib/api';
import type { User } from '@/lib/types';

const INACTIVITY_MS = 30 * 60 * 1000;
const INACTIVITY_CHECK_MS = 60 * 1000;

interface AuthState {
    user: User | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    isAuthModalOpen: boolean;
    authModalMode: 'login' | 'register';
}

interface AuthActions {
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>; // Changed to return Promise
    updateUser: (data: Partial<User>) => void;
    openAuthModal: (mode?: 'login' | 'register') => void;
    closeAuthModal: () => void;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
    const lastActivityRef = useRef<number>(Date.now());

    // Check session on mount
    useEffect(() => {
        const checkSession = async () => {
            const token = api.getStoredAuthToken();
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            try {
                const profile = await api.userApi.getProfile();
                if (profile) {
                    setUser(profile);
                    setIsLoggedIn(true);
                }
            } catch {
                api.clearAuthToken();
            } finally {
                setIsLoading(false);
            }
        };
        
        checkSession();
    }, []);

    // Listen for auth expired events
    useEffect(() => {
        const onAuthExpired = () => {
            console.log('Auth expired event received');
            api.clearAuthToken();
            setUser(null);
            setIsLoggedIn(false);
            
            // Force redirect to home
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        };
        
        window.addEventListener('auth-expired', onAuthExpired);
        window.addEventListener('auth-token-cleared', onAuthExpired);
        
        return () => {
            window.removeEventListener('auth-expired', onAuthExpired);
            window.removeEventListener('auth-token-cleared', onAuthExpired);
        };
    }, []);

    // Inactivity timeout
    useEffect(() => {
        if (!isLoggedIn) return;
        
        lastActivityRef.current = Date.now();
        
        const onActivity = () => { 
            lastActivityRef.current = Date.now(); 
        };
        
        window.addEventListener('mousedown', onActivity);
        window.addEventListener('keydown', onActivity);
        window.addEventListener('scroll', onActivity);
        
        const id = setInterval(async () => {
            if (Date.now() - lastActivityRef.current > INACTIVITY_MS) {
                console.log('Inactivity timeout - logging out');
                await logout(); // Now properly await
                
                // Force redirect to home
                if (typeof window !== 'undefined') {
                    window.location.href = '/';
                }
            }
        }, INACTIVITY_CHECK_MS);
        
        return () => {
            window.removeEventListener('mousedown', onActivity);
            window.removeEventListener('keydown', onActivity);
            window.removeEventListener('scroll', onActivity);
            clearInterval(id);
        };
    }, [isLoggedIn]); // Remove logout from deps to avoid loop

    const login = useCallback(async (email: string, password: string) => {
        try {
            const result = await api.authApi.login({ email, password });
            
            const token = result?.token ??
                result?.data?.token ??
                result?.accessToken ??
                result?.data?.accessToken ??
                result?.access_token ??
                result?.data?.access_token;
                
            const userData = result?.user ?? result?.data?.user ?? result;
            
            if (token) {
                api.setAuthToken(token, userData);
                setUser(userData);
                setIsLoggedIn(true);
                setIsAuthModalOpen(false);
            } else {
                throw new Error('No token received from login');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }, []);

    const register = useCallback(async (name: string, email: string, password: string) => {
        try {
            const result = await api.authApi.register({ name, email, password });
            
            const token = result?.token ??
                result?.data?.token ??
                result?.accessToken ??
                result?.data?.accessToken ??
                result?.access_token ??
                result?.data?.access_token;
                
            const userData = result?.user ?? result?.data?.user ?? result;
            
            if (token) {
                api.setAuthToken(token, userData);
                setUser(userData);
                setIsLoggedIn(true);
                setIsAuthModalOpen(false);
            } else {
                throw new Error('No token received from registration');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        console.log('Logout called');
        
        try {
            // Try to logout from server with timeout
            const logoutPromise = api.authApi.logout();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Logout timeout')), 3000)
            );
            
            await Promise.race([logoutPromise, timeoutPromise]).catch((error) => {
                console.log('Server logout issue:', error.message);
            });
            
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // ALWAYS clear local state regardless of server response
            api.clearAuthToken();
            
            // Clear ALL possible storage locations
            if (typeof window !== 'undefined') {
                localStorage.removeItem('travelToken');
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                localStorage.removeItem('travelUser');
                localStorage.removeItem('user');
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('travelUser');
                
                // Clear any cookies that might be set
                document.cookie.split(";").forEach((c) => {
                    document.cookie = c
                        .replace(/^ +/, "")
                        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
            }
            
            setUser(null);
            setIsLoggedIn(false);
            
            // Dispatch events to notify other tabs/components
            window.dispatchEvent(new CustomEvent('auth-token-cleared'));
            window.dispatchEvent(new CustomEvent('auth-expired'));
        }
    }, []);

    const updateUser = useCallback((data: Partial<User>) => {
        setUser((prev) => (prev ? { ...prev, ...data } : null));
    }, []);

    const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
    }, []);

    const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

    return (
        <AuthContext.Provider value={{
            user,
            isLoggedIn,
            isLoading,
            isAuthModalOpen,
            authModalMode,
            login,
            register,
            logout,
            updateUser,
            openAuthModal,
            closeAuthModal,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}