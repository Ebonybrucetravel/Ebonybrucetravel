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
    logout: () => void;
    updateUser: (data: Partial<User>) => void;
    openAuthModal: (mode?: 'login' | 'register') => void;
    closeAuthModal: () => void;
}
type AuthContextType = AuthState & AuthActions;
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
    const lastActivityRef = useRef<number>(Date.now());
    useEffect(() => {
        const checkSession = async () => {
            const token = api.getStoredAuthToken();
            if (!token)
                return setIsLoading(false);
            try {
                const profile = await api.userApi.getProfile();
                if (profile) {
                    setUser(profile);
                    setIsLoggedIn(true);
                }
            }
            catch {
                api.clearAuthToken();
            }
            finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);
    useEffect(() => {
        const onAuthExpired = () => {
            setUser(null);
            setIsLoggedIn(false);
        };
        window.addEventListener('auth-expired', onAuthExpired);
        return () => window.removeEventListener('auth-expired', onAuthExpired);
    }, []);
    useEffect(() => {
        if (!isLoggedIn)
            return;
        lastActivityRef.current = Date.now();
        const onActivity = () => { lastActivityRef.current = Date.now(); };
        window.addEventListener('mousedown', onActivity);
        window.addEventListener('keydown', onActivity);
        window.addEventListener('scroll', onActivity);
        const id = setInterval(() => {
            if (Date.now() - lastActivityRef.current > INACTIVITY_MS) {
                api.authApi.logout().catch(() => { });
                api.clearAuthToken();
                setUser(null);
                setIsLoggedIn(false);
            }
        }, INACTIVITY_CHECK_MS);
        return () => {
            window.removeEventListener('mousedown', onActivity);
            window.removeEventListener('keydown', onActivity);
            window.removeEventListener('scroll', onActivity);
            clearInterval(id);
        };
    }, [isLoggedIn]);
    const login = useCallback(async (email: string, password: string) => {
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
        }
    }, []);
    const register = useCallback(async (name: string, email: string, password: string) => {
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
        }
    }, []);
    const logout = useCallback(() => {
        api.authApi.logout().catch(() => { });
        api.clearAuthToken();
        setUser(null);
        setIsLoggedIn(false);
    }, []);
    const updateUser = useCallback((data: Partial<User>) => {
        setUser((prev) => (prev ? { ...prev, ...data } : null));
    }, []);
    const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
    }, []);
    const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);
    return (<AuthContext.Provider value={{
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
    </AuthContext.Provider>);
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}