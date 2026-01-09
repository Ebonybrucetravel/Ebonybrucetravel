
'use client';
import React, { useState, useEffect } from 'react';
import { User } from '../app/page';

interface ProfileProps {
  user: User;
  onUpdateUser: (data: Partial<User>) => void;
  onBack: () => void;
  onSignOut: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onBack, onSignOut }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'bookings' | 'saved' | 'wallet' | 'rewards' | 'security'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ ...user });

  // Sync formData if user prop changes (e.g., from social login)
  useEffect(() => {
    setFormData({ ...user });
  }, [user]);

  const handleInputChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdateUser(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({ ...user });
    setIsEditing(false);
  };

  const menuItems = [
    { id: 'details', label: 'Personal Details', icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { id: 'bookings', label: 'My Bookings', icon: <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745V20a2 2 0 002 2h14a2 2 0 002-2v-6.745zM16 8V5a3 3 0 00-6 0v3h6z" /> },
    { id: 'saved', label: 'Saved Items', icon: <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /> },
    { id: 'wallet', label: 'Wallet', icon: <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
    { id: 'rewards', label: 'Rewards & Loyalty', icon: <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /> },
    { id: 'security', label: 'Security', icon: <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
  ];

  return (
    <div className="bg-[#f8fbfe] min-h-screen font-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[12px] font-bold text-[#33a8da] mb-8">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">Home</button>
          <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
          <span className="text-gray-500">Account Settings</span>
          <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-[320px] space-y-8">
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#f4d9c6] rounded-full flex items-center justify-center text-[#9a7d6a] shadow-inner overflow-hidden border-2 border-white">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 leading-tight truncate">{user.name}</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Member</p>
                </div>
              </div>
            </div>

            <nav className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100/50">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-5 px-8 py-5 transition-all text-[15px] font-bold ${
                    activeTab === item.id 
                      ? 'bg-[#f0f9ff] text-[#33a8da]' 
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-[#33a8da]' : 'text-gray-400 opacity-60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {item.icon}
                  </svg>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="bg-[#f0f9ff] rounded-[24px] p-8 shadow-sm border border-blue-50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center text-white shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-tighter">Gold Status</h3>
              </div>
              <div className="w-full bg-white/60 h-2 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 w-3/4 rounded-full" />
              </div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">1,200 points Platinum</p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 space-y-8">
            
            {/* Main Title Card */}
            <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100/50 flex items-center gap-10">
              <div className="w-24 h-24 bg-[#f4d9c6] rounded-full flex items-center justify-center text-[#9a7d6a] border-8 border-[#fff7f0] shadow-inner overflow-hidden relative group">
                {user.profilePicture ? (
                  <img src={user.profilePicture} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Personal Information</h1>
                <p className="text-gray-400 font-bold text-sm mt-1">Manage your personal information.</p>
              </div>
            </div>

            {/* Identity Details Section */}
            <section className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100/50">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[15px] font-black text-gray-900 uppercase tracking-tighter">Identity Details</h3>
                {isEditing && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded uppercase animate-pulse">Editing...</span>}
              </div>
              <div className="space-y-8">
                <div>
                  <label className="block text-[13px] font-black text-gray-900 mb-3 uppercase tracking-tight">Full Name</label>
                  <input 
                    type="text" 
                    readOnly={!isEditing}
                    value={isEditing ? formData.name : user.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-6 py-4.5 rounded-[18px] font-bold transition-all focus:outline-none ${isEditing ? 'bg-white ring-2 ring-[#33a8da]/10 border border-[#33a8da] text-gray-900' : 'bg-[#f3f7fa] border-none text-gray-500'}`} 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[13px] font-black text-gray-900 mb-3 uppercase tracking-tight">Date of Birth</label>
                    <div className="relative">
                      <input 
                        type={isEditing ? "date" : "text"}
                        readOnly={!isEditing}
                        value={isEditing ? formData.dob : user.dob || '05/15/1992'} 
                        onChange={(e) => handleInputChange('dob', e.target.value)}
                        className={`w-full pl-6 pr-14 py-4.5 rounded-[18px] font-bold transition-all focus:outline-none ${isEditing ? 'bg-white ring-2 ring-[#33a8da]/10 border border-[#33a8da] text-gray-900' : 'bg-[#f3f7fa] border-none text-gray-500'}`} 
                      />
                      <svg className={`w-5 h-5 absolute right-6 top-1/2 -translate-y-1/2 ${isEditing ? 'text-[#33a8da]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-black text-gray-900 mb-3 uppercase tracking-tight">Gender</label>
                    <div className="relative">
                      {isEditing ? (
                        <select 
                          value={formData.gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="w-full pl-6 pr-14 py-4.5 bg-white ring-2 ring-[#33a8da]/10 border border-[#33a8da] rounded-[18px] font-bold text-gray-900 focus:outline-none appearance-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          readOnly 
                          value={user.gender || 'Male'} 
                          className="w-full pl-6 pr-14 py-4.5 bg-[#f3f7fa] border-none rounded-[18px] font-bold text-gray-500 focus:outline-none" 
                        />
                      )}
                      <svg className={`w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none ${isEditing ? 'text-[#33a8da]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Information Section */}
            <section className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100/50">
              <h3 className="text-[15px] font-black text-gray-900 mb-8 uppercase tracking-tighter">Contact Information</h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between p-6 bg-[#f8fbfe] rounded-[24px]">
                  <div className="flex items-center gap-5">
                    <div className="bg-[#33a8da] p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/10">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Email Address</p>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input 
                            type="email" 
                            value={formData.email} 
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="bg-transparent border-b border-[#33a8da] text-[15px] font-bold text-gray-700 focus:outline-none py-0.5"
                          />
                        ) : (
                          <p className="text-[15px] font-bold text-gray-400 mt-0.5">{user.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black text-green-500 bg-green-50 px-3 py-1.5 rounded-lg uppercase tracking-widest">Verified</span>
                    {!isEditing && <button className="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#33a8da] transition">Update</button>}
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-[#f8fbfe] rounded-[24px]">
                  <div className="flex items-center gap-5">
                    <div className="bg-[#f0f9ff] p-2.5 rounded-xl text-[#33a8da] border border-[#33a8da]/10">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Phone Number</p>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={formData.phone} 
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="bg-transparent border-b border-[#33a8da] text-[15px] font-bold text-gray-700 focus:outline-none py-0.5"
                          />
                        ) : (
                          <p className="text-[15px] font-bold text-gray-400 mt-0.5">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black text-green-500 bg-green-50 px-3 py-1.5 rounded-lg uppercase tracking-widest">Verified</span>
                    {!isEditing && <button className="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#33a8da] transition">Update</button>}
                  </div>
                </div>
              </div>
            </section>

            {/* Actions Footer */}
            <div className="flex justify-end gap-5 pt-6">
              {!isEditing ? (
                <>
                  <button 
                    onClick={onSignOut} 
                    className="px-12 py-4 border-2 border-[#33a8da] text-[#33a8da] font-black text-sm rounded-[18px] hover:bg-blue-50 transition active:scale-95 uppercase tracking-tight"
                  >
                    Sign Out
                  </button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-12 py-4 bg-[#33a8da] text-white font-black text-sm rounded-[18px] hover:bg-[#2c98c7] shadow-xl shadow-blue-500/20 transition active:scale-95 uppercase tracking-tight"
                  >
                    Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleCancel}
                    className="px-12 py-4 border-2 border-gray-200 text-gray-400 font-black text-sm rounded-[18px] hover:bg-gray-50 transition active:scale-95 uppercase tracking-tight"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="px-12 py-4 bg-[#33a8da] text-white font-black text-sm rounded-[18px] hover:bg-[#2c98c7] shadow-xl shadow-blue-500/20 transition active:scale-95 uppercase tracking-tight"
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Profile;
