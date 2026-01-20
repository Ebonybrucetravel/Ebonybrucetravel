
'use client';
import React, { useState } from 'react';

interface AdminLoginProps {
  onLoginSuccess: (data: any) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Mock Admin Auth
    setTimeout(() => {
      if (email === 'admin@ebonybruce.com' && password === 'EBONY_SUPER_2025') {
        onLoginSuccess({ role: 'super-admin', name: 'Executive Admin' });
      } else {
        setError('Invalid administrative credentials. Access denied.');
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#000814] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Staff Portal</h1>
          <p className="text-blue-300/60 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Ebony Bruce Admin Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Admin Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-4 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none"
              placeholder="admin@ebonybruce.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Security Key</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:ring-4 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none"
              placeholder="••••••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
              <p className="text-red-400 text-xs font-bold">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-500 transition shadow-2xl shadow-blue-600/30 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : 'Authorize Access'}
          </button>
        </form>

        <button 
          onClick={onBack}
          className="w-full mt-6 py-4 text-white/30 hover:text-white/60 font-bold text-xs uppercase tracking-widest transition"
        >
          Return to Client Portal
        </button>
      </div>

      <div className="mt-12 text-center text-[10px] text-white/20 font-medium uppercase tracking-[0.3em]">
        Secured by Ebony Bruce Identity Management v4.0
      </div>
    </div>
  );
};

export default AdminLogin;
