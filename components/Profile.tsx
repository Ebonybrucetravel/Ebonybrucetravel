
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../app/page';
import ManageBookingModal from './ManageBookingModal';

interface ProfileProps {
  user: User;
  onUpdateUser: (data: Partial<User>) => void;
  onBack: () => void;
  onSignOut: () => void;
  onBookItem: (item: any) => void;
  onCancelRequest?: (booking: any) => void;
}

interface Booking {
  id: string;
  type: 'flight' | 'hotel' | 'car';
  title: string;
  provider: string;
  subtitle: string;
  date: string;
  duration?: string;
  status: 'Confirmed' | 'Completed' | 'Cancel' | 'Active';
  price: string;
  currency: string;
  iconBg: string;
  imageUrl?: string;
}

interface OtherTraveler {
  id: string;
  name: string;
  relationship: string;
  dob: string;
  gender: string;
}

interface PaymentCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  icon: string;
  isDefault?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onBack, onSignOut, onBookItem, onCancelRequest }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'travelers' | 'bookings' | 'saved' | 'rewards' | 'security' | 'preferences' | 'payment'>('details');
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [bookingFilter, setBookingFilter] = useState<'All' | 'Flight' | 'Hotel' | 'Car'>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Security State
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // 2FA Modal State
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [faStep, setFaStep] = useState<'otp' | 'success'>('otp');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Preferences State
  const [prefs, setPrefs] = useState({
    seat: 'Window',
    meal: 'None',
    bed: 'King',
    marketing: true,
    notifications: true
  });

  // Travelers State
  const [travelers, setTravelers] = useState<OtherTraveler[]>([
    { id: 't1', name: 'Amara Bruce', relationship: 'Spouse', dob: '1994-08-22', gender: 'Female' },
    { id: 't2', name: 'Leo Bruce', relationship: 'Child', dob: '2018-11-12', gender: 'Male' }
  ]);
  const [showAddTravelerForm, setShowAddTravelerForm] = useState(false);
  const [newTraveler, setNewTraveler] = useState<Omit<OtherTraveler, 'id'>>({ name: '', relationship: 'Spouse', dob: '', gender: 'Male' });

  // Payment Methods State
  const [savedCards, setSavedCards] = useState<PaymentCard[]>([
    { id: 'c1', brand: 'Visa', last4: '4324', expiry: '12/26', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg', isDefault: true },
    { id: 'c2', brand: 'Mastercard', last4: '8821', expiry: '08/25', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' }
  ]);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [newCardData, setNewCardData] = useState({ holderName: '', number: '', expiry: '', cvv: '' });

  // Manage Booking Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormData({ ...user });
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdateUser(formData);
      setIsSaving(false);
    }, 600);
  };

  const handleAddTraveler = () => {
    if (newTraveler.name && newTraveler.dob) {
      setTravelers([...travelers, { ...newTraveler, id: Date.now().toString() }]);
      setNewTraveler({ name: '', relationship: 'Spouse', dob: '', gender: 'Male' });
      setShowAddTravelerForm(false);
    }
  };

  const handleRemoveTraveler = (id: string) => {
    setTravelers(travelers.filter(t => t.id !== id));
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNumber = newCardData.number.replace(/\s/g, '');
    
    if (rawNumber.length >= 15 && newCardData.expiry && newCardData.cvv && newCardData.holderName) {
      setIsSavingCard(true);
      
      // Simulate API call
      setTimeout(() => {
        const isVisa = rawNumber.startsWith('4');
        const brand = isVisa ? 'Visa' : 'Mastercard';
        const icon = isVisa 
          ? 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg' 
          : 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg';
        
        const newCard: PaymentCard = {
          id: Date.now().toString(),
          brand,
          last4: rawNumber.slice(-4),
          expiry: newCardData.expiry,
          icon,
          isDefault: savedCards.length === 0
        };

        setSavedCards([newCard, ...savedCards]);
        setNewCardData({ holderName: '', number: '', expiry: '', cvv: '' });
        setIsSavingCard(false);
        setShowAddPaymentForm(false);
      }, 1000);
    }
  };

  const handleRemoveCard = (id: string) => {
    setSavedCards(savedCards.filter(c => c.id !== id));
  };

  const handleManageBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsManageModalOpen(true);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setFaStep('success');
      setTwoFactorEnabled(true);
    }, 1200);
  };

  const open2FAModal = () => {
    setOtp(['', '', '', '', '', '']);
    setFaStep('otp');
    setIs2FAModalOpen(true);
  };

  const close2FAModal = () => {
    setIs2FAModalOpen(false);
  };

  const menuItems = [
    { id: 'details', label: 'Personal Details', icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { id: 'bookings', label: 'My Bookings', icon: <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745V20a2 2 0 002 2h14a2 2 0 002-2v-6.745zM16 8V5a3 3 0 00-6 0v3h6z" /> },
    { id: 'payment', label: 'Payment Methods', icon: <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
    { id: 'saved', label: 'Saved Items', icon: <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /> },
    { id: 'rewards', label: 'Rewards', icon: <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /> },
    { id: 'travelers', label: 'Other Travelers', icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m16 0h2a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4h-2m-1-10a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" /> },
    { id: 'security', label: 'Security', icon: <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
    { id: 'preferences', label: 'Preferences', icon: <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /> },
  ];

  const mockBookings: Booking[] = [
    { id: '1', type: 'flight', title: 'Lagos(LOS) to Abuja(ABJ)', provider: 'Air Peace', subtitle: 'Flight BA117 . Economy', date: 'Dec 26-Dec 28, 2025', duration: '1h 15m Non-Stop', status: 'Confirmed', price: '75,000.00', currency: 'NGN', iconBg: 'bg-blue-50', imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600' },
    { id: '2', type: 'hotel', title: 'Hyatt Tokyo', provider: 'Hyatt', subtitle: 'Standard King Room . 2 Guests, 5 Nights', date: 'Dec 26-Dec 28, 2025', duration: '1h 15m Non-Stop', status: 'Completed', price: '1,500.00', currency: '$', iconBg: 'bg-yellow-50', imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600' },
    { id: '3', type: 'car', title: 'Tesla Model', provider: 'Hertz', subtitle: 'San Francisco Int. Airport . Hertz', date: 'Dec 26-Dec 28, 2025', duration: '1h 15m Non-Stop', status: 'Cancel', price: '1,500.00', currency: '$', iconBg: 'bg-purple-50', imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800' }
  ];

  const filteredBookings = mockBookings.filter(b => {
    if (bookingFilter === 'All') return true;
    return b.type === b.type;
  });

  // Helper to render hotel cards for the Saved tab
  const renderHotelCard = () => {
    return (
      <div className="bg-white rounded-[24px] p-6 border border-gray-100 flex flex-col md:flex-row items-center gap-6 group hover:shadow-md transition-shadow">
        <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden shrink-0">
          <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-lg font-black text-gray-900 tracking-tight">Luxury Suite Colosseum</h4>
          <p className="text-[11px] font-bold text-gray-400">Rome, Italy . 5 Star Hotel</p>
          <div className="flex items-center justify-center md:justify-start gap-1 mt-2 text-yellow-400">
            {[...Array(5)].map((_, i) => <svg key={i} className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
          </div>
        </div>
        <div className="text-center md:text-right">
          <p className="text-xl font-black text-[#33a8da]">$150.00</p>
          <button className="text-[10px] font-black text-[#33a8da] uppercase tracking-widest hover:underline mt-2">View Details</button>
        </div>
      </div>
    );
  };

  const renderBookingCard = (booking: Booking) => {
    const statusColors = { Confirmed: 'bg-green-100 text-green-600', Completed: 'bg-gray-100 text-gray-500', Cancel: 'bg-red-50 text-red-500', Active: 'bg-green-100 text-green-600' };
    return (
      <div key={booking.id} className="bg-white rounded-[24px] p-5 md:p-6 border border-gray-100 flex flex-col md:flex-row items-center gap-6 group hover:shadow-md transition-shadow">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${booking.iconBg}`}>
          {booking.type === 'flight' && <svg className="w-8 h-8 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>}
          {booking.type === 'hotel' && <div className="w-10 h-10 bg-[#fef3c7] rounded-full" />}
          {booking.type === 'car' && <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" /></svg>}
        </div>
        <div className="flex-1 text-center md:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
            <h4 className="text-lg font-black text-gray-900 truncate tracking-tight">{booking.title}</h4>
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${statusColors[booking.status]}`}>{booking.status}</span>
          </div>
          <p className="text-[11px] font-bold text-gray-400 mb-3">{booking.provider} <span className="opacity-60">{booking.subtitle}</span></p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] font-black text-gray-400 uppercase tracking-tight">
            <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{booking.date}</div>
            {booking.duration && <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{booking.duration}</div>}
          </div>
        </div>
        <div className="text-center md:text-right shrink-0">
          <p className="text-xs font-black text-[#33a8da] mb-4">{booking.currency} <span className="text-lg">{booking.price}</span></p>
          <div className="flex items-center justify-center md:justify-end gap-5">
            <button 
              onClick={() => handleManageBooking(booking)}
              className="text-[11px] font-black uppercase text-gray-600 hover:text-[#33a8da] transition"
            >
              {booking.status === 'Cancel' ? 'Receipt' : 'Details'}
            </button>
            <button 
              onClick={() => handleManageBooking(booking)}
              className="px-8 py-3 bg-[#33a8da] text-white rounded-xl text-[11px] font-black uppercase hover:bg-[#2c98c7] transition shadow-lg shadow-blue-500/10 active:scale-95"
            >
              {booking.status === 'Completed' ? 'Book Again' : 'Manage'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleUpdatePassword = () => {
    if (!passwords.new || passwords.new !== passwords.confirm) return;
    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setPasswords({ current: '', new: '', confirm: '' });
      alert('Password updated successfully!');
    }, 1500);
  };

  return (
    <div className="bg-[#f8fbfe] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-[320px] space-y-6">
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#f4d9c6] rounded-full flex items-center justify-center text-[#9a7d6a] border-2 border-white shadow-sm overflow-hidden shrink-0">
                  {user.profilePicture ? <img src={user.profilePicture} className="w-full h-full object-cover" alt="Profile" /> : <img src="https://ui-avatars.com/api/?name=EB&background=f4d9c6&color=9a7d6a" className="w-full h-full object-cover" alt="Profile" />}
                </div>
                <div className="min-w-0"><h2 className="text-xl font-black text-gray-900 tracking-tight truncate">{user.name || 'Ebony Bruce'}</h2><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Member</p></div>
              </div>
            </div>
            <nav className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100/50">
              {menuItems.map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-5 px-8 py-5 transition-all text-[15px] font-bold ${activeTab === item.id ? 'bg-[#f0f9ff] text-[#33a8da]' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-[#33a8da]' : 'text-gray-400 opacity-60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>{item.icon}</svg>{item.label}
                </button>
              ))}
            </nav>
            <div className="bg-[#f0f9ff] rounded-[24px] p-8 shadow-sm border border-blue-50">
              <div className="flex items-center gap-3 mb-5"><div className="w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center text-white"><svg className="w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></div><h3 className="text-xs font-black text-gray-900 uppercase tracking-tighter">Gold Level</h3></div>
              <div className="w-full bg-white h-1.5 rounded-full overflow-hidden mb-3"><div className="h-full bg-orange-400 w-3/4 rounded-full" /></div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">1,200 points Platinum</p>
            </div>
          </aside>
          <main className="flex-1 space-y-8">
            {activeTab === 'details' && (
              <div className="animate-in fade-in duration-500">
                <div className="bg-white rounded-[32px] p-10 border border-gray-100 flex items-center gap-8 mb-8">
                  <div className="relative group cursor-pointer"><div className="w-24 h-24 bg-[#f4d9c6] rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden shrink-0">{user.profilePicture ? <img src={user.profilePicture} className="w-full h-full object-cover" alt="Profile" /> : <img src="https://ui-avatars.com/api/?name=EB&background=f4d9c6&color=9a7d6a" className="w-full h-full object-cover" alt="Profile" />}</div><div className="absolute bottom-1 right-1 w-6 h-6 bg-[#33a8da] border-4 border-white rounded-full flex items-center justify-center shadow-md"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></div></div>
                  <div><h1 className="text-3xl font-black text-gray-900 tracking-tight">Personal Information</h1><p className="text-gray-400 font-bold text-sm mt-1">Manage your personal information.</p></div>
                </div>
                <div className="bg-white rounded-[32px] p-10 border border-gray-100 mb-8">
                  <h3 className="text-xl font-black text-gray-900 mb-8">Identity Details</h3>
                  <div className="space-y-8">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Full Name</label><input type="text" value={formData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Ebony Bruce" className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] focus:ring-4 focus:ring-[#33a8da]/10 transition-all outline-none" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Date of Birth</label><div className="relative"><input type="date" value={formData.dob || '1992-05-15'} onChange={(e) => handleInputChange('dob', e.target.value)} className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] focus:ring-4 focus:ring-[#33a8da]/10 transition-all outline-none" /></div></div>
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Gender</label><div className="relative"><select value={formData.gender || 'Male'} onChange={(e) => handleInputChange('gender', e.target.value)} className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] focus:ring-4 focus:ring-[#33a8da]/10 transition-all outline-none appearance-none"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select><svg className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></div></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-[32px] p-10 border border-gray-100 mb-10">
                  <h3 className="text-xl font-black text-gray-900 mb-8">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:border-[#33a8da]/30">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#33a8da]"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                      <div className="flex-1 w-full"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email Address</p><input type="email" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full bg-transparent font-bold text-gray-900 border-none outline-none p-0 focus:ring-0" /></div>
                      <div className="flex items-center gap-3"><span className="text-[10px] font-black uppercase text-green-500 bg-green-50 px-2 py-0.5 rounded">Verified</span><button className="text-[10px] font-black uppercase text-gray-400 hover:text-[#33a8da] transition">Update</button></div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:border-[#33a8da]/30">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#33a8da]"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></div>
                      <div className="flex-1 w-full"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Phone Number</p><input type="tel" value={formData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} className="w-full bg-transparent font-bold text-gray-900 border-none outline-none p-0 focus:ring-0" /></div>
                      <div className="flex items-center gap-3"><span className="text-[10px] font-black uppercase text-green-500 bg-green-50 px-2 py-0.5 rounded">Verified</span><button className="text-[10px] font-black uppercase text-gray-400 hover:text-[#33a8da] transition">Update</button></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-4 pb-12"><button onClick={onSignOut} className="px-10 py-3.5 border border-blue-100 rounded-xl text-[#33a8da] font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition">Sign Out</button><button onClick={handleSave} disabled={isSaving} className="px-10 py-3.5 bg-[#33a8da] text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-xl shadow-blue-100 hover:bg-[#2c98c7] transition transform active:scale-95 flex items-center gap-2">{isSaving ? (<><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</>) : 'Save Changes'}</button></div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div><h1 className="text-3xl font-black text-gray-900 tracking-tight">Booking History</h1><p className="text-gray-400 font-bold text-sm mt-1">Manage your past and upcoming booking</p></div>
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={filterRef}><button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-500 flex items-center gap-2 hover:border-[#33a8da] transition shadow-sm">{bookingFilter === 'All' ? 'All Bookings' : `${bookingFilter}s`}<svg className={`w-3.5 h-3.5 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></button>
                      {showFilterDropdown && <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">{['All', 'Flight', 'Hotel', 'Car'].map((f) => (<button key={f} onClick={() => { setBookingFilter(f as any); setShowFilterDropdown(false); }} className={`w-full text-left px-5 py-3 text-xs font-black ${bookingFilter === f ? 'text-[#33a8da] bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>{f === 'All' ? 'All Bookings' : `${f}s`}</button>))}</div>}
                    </div>
                    <div className="relative" ref={sortRef}><button onClick={() => setShowSortDropdown(!showSortDropdown)} className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-500 flex items-center gap-2 hover:border-[#33a8da] transition shadow-sm">Sorted by Date<svg className={`w-3.5 h-3.5 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></button>
                      {showSortDropdown && <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">{['Date (Latest)', 'Date (Oldest)', 'Price (Highest)', 'Price (Lowest)'].map((s) => (<button key={s} onClick={() => setShowSortDropdown(false)} className="w-full text-left px-5 py-3 text-xs font-black text-gray-500 hover:bg-gray-50 transition">{s}</button>))}</div>}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">{filteredBookings.map(renderBookingCard)}</div>
                <button className="w-full bg-[#33a8da] text-white font-black py-5 rounded-[24px] shadow-xl shadow-blue-500/10 hover:bg-[#2c98c7] transition active:scale-[0.98] text-lg tracking-tight">View All Booking</button>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50">
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">Payment Methods</h1>
                  <p className="text-gray-400 font-bold text-sm mt-1">Manage your saved cards for a faster checkout experience.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div 
                    onClick={() => {
                      if (!isSavingCard) setShowAddPaymentForm(!showAddPaymentForm);
                    }}
                    className={`bg-white rounded-[32px] p-8 border-2 ${showAddPaymentForm ? 'border-[#33a8da]' : 'border-dashed border-gray-100'} flex flex-col items-center justify-center text-center group hover:border-[#33a8da]/50 transition cursor-pointer h-[220px]`}
                  >
                    <div className={`w-14 h-14 ${showAddPaymentForm ? 'bg-blue-50 text-[#33a8da]' : 'bg-gray-50 text-gray-300'} rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-50 group-hover:text-[#33a8da] transition`}>
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d={showAddPaymentForm ? "M18 12H6" : "M12 4v16m8-8H4"} /></svg>
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{showAddPaymentForm ? 'Cancel Form' : 'Add New Payment Method'}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">Visa, Mastercard, or Bank Account</p>
                  </div>

                  {showAddPaymentForm && (
                    <div className="bg-white rounded-[32px] p-8 border border-[#33a8da] shadow-sm animate-in slide-in-from-right duration-300">
                      <form onSubmit={handleAddPayment} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cardholder Name</label>
                          <input required type="text" value={newCardData.holderName} onChange={(e) => setNewCardData({...newCardData, holderName: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl font-bold text-gray-900 focus:bg-white transition-colors" placeholder="EBONY BRUCE" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Card Number</label>
                          <input required type="text" maxLength={19} value={newCardData.number} onChange={(e) => setNewCardData({...newCardData, number: formatCardNumber(e.target.value)})} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl font-bold text-gray-900 focus:bg-white transition-colors" placeholder="•••• •••• •••• ••••" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Expiry</label>
                            <input required type="text" maxLength={5} value={newCardData.expiry} onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                setNewCardData({...newCardData, expiry: val});
                            }} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl font-bold text-gray-900 focus:bg-white transition-colors" placeholder="MM/YY" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">CVV</label>
                            <input required type="password" maxLength={4} value={newCardData.cvv} onChange={(e) => setNewCardData({...newCardData, cvv: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl font-bold text-gray-900 focus:bg-white transition-colors" placeholder="•••" />
                          </div>
                        </div>
                        <button type="submit" disabled={isSavingCard} className="w-full bg-[#33a8da] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest mt-2 hover:bg-[#2c98c7] transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                          {isSavingCard ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              Saving...
                            </>
                          ) : 'Confirm & Save'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-[32px] p-10 border border-gray-100">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-gray-900">Saved Cards</h3>
                    <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1 rounded-full border border-green-100">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      <span className="text-[9px] font-black uppercase">Securely stored</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {savedCards.length > 0 ? savedCards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:border-[#33a8da]/30 transition-all animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-2 shadow-sm shrink-0">
                            <img src={card.icon} className="h-full w-auto object-contain" alt={card.brand} />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 tracking-tight">•••• •••• •••• {card.last4}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Expiry: {card.expiry} {card.isDefault && '. Default Method'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button className="text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition">Edit</button>
                          <button onClick={() => handleRemoveCard(card.id)} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition">Remove</button>
                        </div>
                      </div>
                    )) : (
                      <div className="py-12 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No cards saved yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50">
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">Security Settings</h1>
                  <p className="text-gray-400 font-bold text-sm mt-1">Manage your password, two-factor authentication, and track your account activity to keep your booking safe.</p>
                </div>

                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#33a8da]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Password Management</h3>
                  </div>
                  
                  <div className="p-10 flex flex-col lg:flex-row gap-12">
                    <div className="flex-1 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Password</label>
                          <input 
                            type="password" 
                            value={passwords.current}
                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da]/30 transition-all outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">New Password</label>
                          <input 
                            type="password" 
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da]/30 transition-all outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confirm Password</label>
                          <input 
                            type="password" 
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da]/30 transition-all outline-none" 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleUpdatePassword}
                        disabled={isUpdatingPassword || !passwords.new}
                        className="bg-[#33a8da] text-white px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/10 hover:bg-[#2c98c7] transition transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isUpdatingPassword ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Updating...
                          </>
                        ) : 'Update Password'}
                      </button>
                    </div>

                    <div className="w-full lg:w-72 bg-gray-50/50 rounded-2xl p-6 border border-gray-100 flex flex-col">
                      <div className="flex items-center gap-2 mb-6">
                        <svg className="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Password Requirement</h4>
                      </div>
                      <ul className="space-y-4">
                        {[
                          { label: 'Minimum of 8 characters', met: passwords.new.length >= 8 },
                          { label: 'At least one upper case letter', met: /[A-Z]/.test(passwords.new) },
                          { label: 'At least one number', met: /[0-9]/.test(passwords.new) }
                        ].map((req, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${req.met ? 'bg-green-500 border-green-500' : 'border-gray-200'}`}>
                              {req.met && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className={`text-[11px] font-bold ${req.met ? 'text-green-600' : 'text-gray-400'}`}>{req.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-[#33a8da]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.954 0 0112 2.944a11.955 11.954 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Need Help?</h3>
                    </div>
                    {twoFactorEnabled && <span className="bg-green-50 text-green-500 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-green-100 tracking-widest">ENABLED</span>}
                  </div>
                  <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-lg">
                      Add an extra layer of security to your account. We will send 6 digit OTP to your email.
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                      <button className="px-8 py-2.5 border border-gray-100 rounded-xl text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition">Edit</button>
                      <button 
                        onClick={() => {
                          if (!twoFactorEnabled) open2FAModal();
                          else setTwoFactorEnabled(false);
                        }}
                        className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition ${twoFactorEnabled ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      >
                        {twoFactorEnabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'saved' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="flex justify-between items-center"><div><h1 className="text-3xl font-black text-gray-900 tracking-tight">Saved Item</h1><p className="text-gray-400 font-bold text-sm mt-1">View and manage your wishlist</p></div><button className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-[#33a8da] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>Share List</button></div>
                <div className="flex gap-4">{['All items', 'Hotels', 'Car Rentals'].map((t, i) => (<button key={t} className={`px-5 py-2 rounded-full text-xs font-black ${i === 0 ? 'bg-[#33a8da] text-white' : 'text-[#33a8da] bg-blue-50 hover:bg-blue-100'} transition`}>{t}</button>))}</div>
                <div className="space-y-4">{renderHotelCard()}{renderHotelCard()}{renderHotelCard()}</div>
              </div>
            )}
            
            {activeTab === 'rewards' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">Rewards</h1>
                  <p className="text-gray-400 font-bold text-sm mt-1">Track your loyalty points and member status in one place.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[24px] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-10">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                      </div>
                      <h3 className="font-black text-gray-900 uppercase text-sm tracking-tighter">Points Summary</h3>
                    </div>
                    
                    <div className="mb-10">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Current Balance</p>
                      <p className="text-5xl font-black text-gray-900">45.000 <span className="text-sm font-bold text-gray-400">pts</span></p>
                    </div>

                    <div className="flex gap-12 pt-8 border-t border-gray-50">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Spent</p>
                        <p className="text-lg font-black text-green-500">35,000</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Pending Approval</p>
                        <p className="text-lg font-black text-orange-400">10,000</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[24px] p-10 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#33a8da]">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23 1.12 4.82z"/></svg>
                      </div>
                      <h3 className="font-black text-gray-900 uppercase text-sm tracking-tighter">Your Perks</h3>
                    </div>
                    
                    <ul className="space-y-4">
                      {[
                        'Priority Check-in at Ebony Bruce Hubs',
                        'Complimentary Airport Shuttle Access',
                        '15% Exclusive Discount on Partner Hotels',
                        '24/7 Priority Support Desk Access',
                        'Early Access to Holiday Sales'
                      ].map((perk, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs font-bold text-gray-600">
                          <div className="w-2 h-2 rounded-full bg-[#33a8da] mt-1 shrink-0"></div>
                          {perk}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-10 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Current Tier</p>
                      <p className="text-sm font-black text-gray-900">Gold Member</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50">
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">Travel Preferences</h1>
                  <p className="text-gray-400 font-bold text-sm mt-1">Set your defaults for a faster, more personalized experience.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                      Flight Preferences
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Preferred Seat</label>
                        <div className="flex gap-2">
                          {['Window', 'Aisle', 'No Preference'].map(seat => (
                            <button 
                              key={seat}
                              onClick={() => setPrefs({...prefs, seat})}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition ${prefs.seat === seat ? 'bg-[#33a8da] text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                            >
                              {seat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dietary Requirements</label>
                        <select 
                          value={prefs.meal}
                          onChange={(e) => setPrefs({...prefs, meal: e.target.value})}
                          className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-900"
                        >
                          <option value="None">No preference</option>
                          <option value="Vegetarian">Vegetarian</option>
                          <option value="Halal">Halal</option>
                          <option value="Kosher">Kosher</option>
                          <option value="Gluten-Free">Gluten-Free</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2zm3-8h4c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM3 21h18v-2H3v2zM3 8c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10H3V8z"/></svg>
                      Hotel Preferences
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Bed Type</label>
                        <div className="flex gap-2">
                          {['King', 'Twin', 'Queen'].map(bed => (
                            <button 
                              key={bed}
                              onClick={() => setPrefs({...prefs, bed})}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition ${prefs.bed === bed ? 'bg-[#33a8da] text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                            >
                              {bed}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-50 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">Receive marketing emails</span>
                          <button 
                            onClick={() => setPrefs({...prefs, marketing: !prefs.marketing})}
                            className={`w-10 h-6 rounded-full transition-colors relative ${prefs.marketing ? 'bg-[#33a8da]' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${prefs.marketing ? 'right-1' : 'left-1'}`}></div>
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">Push notifications</span>
                          <button 
                            onClick={() => setPrefs({...prefs, notifications: !prefs.notifications})}
                            className={`w-10 h-6 rounded-full transition-colors relative ${prefs.notifications ? 'bg-[#33a8da]' : 'bg-gray-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${prefs.notifications ? 'right-1' : 'left-1'}`}></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="bg-[#33a8da] text-white px-10 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-[#2c98c7] transition transform active:scale-95">
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'travelers' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="flex justify-between items-center bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50">
                  <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Other Travelers</h1>
                    <p className="text-gray-400 font-bold text-sm mt-1">Manage family and friends for quicker booking.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddTravelerForm(!showAddTravelerForm)}
                    className="bg-[#33a8da] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition active:scale-95"
                  >
                    {showAddTravelerForm ? 'Cancel' : 'Add New Traveler'}
                  </button>
                </div>

                {showAddTravelerForm && (
                  <div className="bg-white rounded-[32px] p-8 border-2 border-[#33a8da] shadow-sm animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-lg font-black text-gray-900 mb-6">New Traveler Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                        <input 
                          type="text" 
                          value={newTraveler.name} 
                          onChange={(e) => setNewTraveler({...newTraveler, name: e.target.value})}
                          className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-900" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Relationship</label>
                        <select 
                          value={newTraveler.relationship} 
                          onChange={(e) => setNewTraveler({...newTraveler, relationship: e.target.value})}
                          className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-900" 
                        >
                          <option>Spouse</option>
                          <option>Child</option>
                          <option>Friend</option>
                          <option>Colleague</option>
                          <option>Parent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date of Birth</label>
                        <input 
                          type="date" 
                          value={newTraveler.dob} 
                          onChange={(e) => setNewTraveler({...newTraveler, dob: e.target.value})}
                          className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-900" 
                        />
                      </div>
                      <div className="flex items-end">
                        <button 
                          onClick={handleAddTraveler}
                          className="w-full bg-[#33a8da] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest"
                        >
                          Confirm Addition
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {travelers.length > 0 ? travelers.map((t) => (
                    <div key={t.id} className="bg-white rounded-[24px] p-6 border border-gray-100 flex items-center justify-between group hover:border-[#33a8da] transition shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#33a8da]">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900 tracking-tight">{t.name}</h4>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{t.relationship} • {t.dob}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveTraveler(t.id)}
                        className="text-gray-300 hover:text-red-500 transition p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )) : (
                    <div className="col-span-2 py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-100 text-center">
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No travelers added yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      
      {/* Manage Booking Modal */}
      <ManageBookingModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        booking={selectedBooking} 
        onCancelClick={() => {
          setIsManageModalOpen(false);
          if (onCancelRequest) onCancelRequest(selectedBooking);
        }}
      />

      {/* 2FA Verification Modal */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[440px] rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            {/* Close Button Matching Screenshot style */}
            <button onClick={close2FAModal} className="absolute top-6 right-6 p-1 text-gray-400 hover:text-gray-600 transition border border-gray-100 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {faStep === 'otp' ? (
              <div className="p-10 text-center">
                <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">Two-Step Verification</h2>
                
                {/* Custom Illustration from Screenshot */}
                <div className="flex justify-center mb-8">
                  <div className="relative w-16 h-24 border-2 border-[#33a8da] rounded-xl flex flex-col items-center justify-center bg-white shadow-sm overflow-hidden">
                    <div className="absolute top-1.5 w-6 h-0.5 bg-[#33a8da] rounded-full opacity-30"></div>
                    <div className="flex gap-1 items-center bg-[#f0f9ff] px-2 py-1.5 rounded-md border border-[#33a8da]/30 mt-2 z-10">
                      {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 bg-[#33a8da] rounded-full" />)}
                    </div>
                    <div className="absolute bottom-2 w-2 h-2 rounded-full border border-[#33a8da]/50"></div>
                  </div>
                </div>

                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10 px-4">
                  Please enter the OTP (one time password) to verify your account. A code has been sent to <br />
                  <span className="text-gray-900 font-black">top*********@gmail.com</span>
                </p>

                {/* Underlined Inputs matching Screenshot */}
                <div className="flex gap-4 justify-center mb-12">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { otpRefs.current[idx] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      className="w-10 h-14 bg-white border-b-2 border-gray-100 focus:border-[#33a8da] text-center text-2xl font-black text-gray-900 transition-all outline-none"
                    />
                  ))}
                </div>

                <button 
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otp.some(d => !d)}
                  className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/10 hover:bg-[#2c98c7] transition active:scale-95 disabled:opacity-50 text-sm uppercase tracking-widest"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>

                <p className="mt-8 text-xs font-bold text-gray-400">
                  Not receive your code? <button className="text-[#33a8da] font-black hover:underline ml-1">Resend code</button>
                </p>
              </div>
            ) : (
              <div className="p-10 text-center animate-in fade-in duration-500">
                <div className="flex justify-center mb-8">
                  <div className="w-16 h-16 bg-[#108910] rounded-full flex items-center justify-center text-white shadow-xl shadow-green-100">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>

                <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">2FA Setup successful!</h2>

                {/* Specific Layout from Screenshot: Light green box with centered text */}
                <div className="bg-[#e7f6ed] rounded-xl p-10 mb-10 border border-[#d4edda]/50">
                  <p className="text-[11px] text-[#1e4620] font-black leading-relaxed">
                    You have successfully setup Two-Factor Authentication for your account. Your account is now more secure.
                  </p>
                </div>

                <button onClick={close2FAModal} className="w-full bg-gray-900 text-white font-black py-4 rounded-xl hover:bg-black transition active:scale-95 text-sm uppercase tracking-widest">
                  Back to Security
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
