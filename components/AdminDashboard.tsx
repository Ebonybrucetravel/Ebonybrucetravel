'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminView = 'Analytics' | 'Bookings' | 'UserManagement' | 'Coupons' | 'PersonalDetails' | 'Security' | 'PaymentMethods' | 'AddUser' | 'CreateBooking' | 'BookingDetails' | 'UserProfile';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { currency } = useLanguage();
  const [activeView, setActiveView] = useState<AdminView>('Analytics');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [faStep, setFaStep] = useState<'otp' | 'success'>('otp');

  // Filter States
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All');
  const [userStatusFilter, setUserStatusFilter] = useState('All users');
  const [couponStatusFilter, setCouponStatusFilter] = useState('All');

  // Booking Form State
  const [serviceType, setServiceType] = useState<'Flight' | 'Car Rental' | 'Hotel'>('Flight');
  const [tripType, setTripType] = useState('Round Trip');
  const [cabinClass, setCabinClass] = useState('Economy');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT CARD' | 'BANK TRANSFER'>('CREDIT CARD');
  const [customerType, setCustomerType] = useState<'Existing User' | 'New Guest'>('Existing User');
  
  // Create Booking Form Data
  const [createBookingData, setCreateBookingData] = useState({
    customerSearch: '',
    customerName: '',
    customerEmail: '',
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    returnDate: '',
    provider: '',
    baseFare: '75000',
    taxesFees: 'included',
    baggage: 'Free'
  });

  // Profile Data State
  const [profileData, setProfileData] = useState({
    displayName: 'Miracle Chiamaka',
    adminEmail: 'miracle.c@ebonybruce.com',
    primaryTerminal: 'Lagos Main Hub (LOS)',
    authorizationLevel: 'Executive Access (Tier 1)',
    profileImage: 'https://ui-avatars.com/api/?name=Miracle+Chiamaka&background=f4d9c6&color=9a7d6a'
  });

  // Data States
  const [bookings, setBookings] = useState([
    { id: '#LND-8824', type: 'Flight', source: 'Air Peace', customer: 'John Dane', price: '$450.00', status: 'Confirmed', date: 'Jan 15, 2026' },
    { id: '#LND-8830', type: 'Hotel', source: 'Marriott', customer: 'Michael Smith', price: '$550.00', status: 'Confirmed', date: 'Jan 10, 2026' },
    { id: '#LND-8844', type: 'Car Rental', source: 'Hertz', customer: 'Robert Brown', price: '$350.00', status: 'Cancelled', date: 'Jan 27, 2026' },
    { id: '#LND-9012', type: 'Flight', source: 'Qatar Airways', customer: 'Sarah Jenkins', price: '$1,200.00', status: 'Confirmed', date: 'Feb 02, 2026' },
  ]);

  const [users, setUsers] = useState([
    { id: 'u1', name: 'John Dane', email: 'johndane@example.com', registered: 'Jan 12, 2024', booking: 12, points: '15,200', status: 'Active' },
    { id: 'u2', name: 'Michael Smith', email: 'michael@smith.io', registered: 'Feb 05, 2024', booking: 3, points: '2,400', status: 'Active' },
    { id: 'u3', name: 'Sarah Jenkins', email: 'sarah.j@outlook.com', registered: 'Mar 10, 2024', booking: 15, points: '22,100', status: 'Suspended' },
  ]);

  const [coupons, setCoupons] = useState([
    { id: 'c1', customer: 'John Dane', code: 'WINTER20', expiry: '2026-12-30', minSpend: '$50.00', type: 'Flight', status: 'Active' },
    { id: 'c2', customer: 'Anna Lee', code: 'SAVE50', expiry: '2024-01-12', minSpend: '$100.00', type: 'Hotel', status: 'Expired' },
  ]);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Analytics Data
  const stats = [
    { label: 'Total Revenue', value: '$1,284,500.00', change: '+12.5%', color: 'text-green-500' },
    { label: 'Total Booking', value: '42,890', change: '+8.25%', color: 'text-blue-400' },
    { label: 'Active Users', value: '12,405', change: '+8.4%', color: 'text-purple-400' },
  ];

  const bookingCategories = [
    { type: 'Flight', percentage: 45, color: 'bg-[#33a8da]' },
    { type: 'Hotels', percentage: 40, color: 'bg-[#2ecc71]' },
    { type: 'Car Rentals', percentage: 15, color: 'bg-[#9b59b6]' },
  ];

  const topLocations = [
    { name: 'London, UK', bookings: 1200 },
    { name: 'New York, USA', bookings: 850 },
    { name: 'Other Countries', bookings: 650 },
  ];

  const recentActivities = [
    { time: '2 MINUTE AGO', type: 'New Booking', bookingId: '#BK-94212', customer: 'Joe', provider: 'Airpeace', amount: '$450.00', from: 'London', to: 'Paris', change: '+8.4%' },
    { time: '11 MINUTE AGO', type: 'Cancellation', bookingId: '#BK-94205', customer: 'Anna Lee', provider: '', amount: '$450.00', from: 'London', to: 'Paris', change: '+8.4%' },
    { time: '1 HOUR AGO', type: 'New Booking', bookingId: '#BK-94212', customer: 'Joe', provider: 'Airpeace', amount: '$450.00', from: 'London', to: 'Paris', change: '+8.4%' },
  ];

  const revenueData = [
    { month: 'Jan 10', value: 45000 },
    { month: 'Jan 15', value: 52000 },
    { month: 'Jan 20', value: 38000 },
    { month: 'Jan 25', value: 61000 },
    { month: 'Feb 01', value: 48000 },
    { month: 'Feb 05', value: 55000 },
    { month: 'Feb 10', value: 42000 },
    { month: 'Feb 15', value: 58000 },
    { month: 'Feb 20', value: 52000 },
    { month: 'Feb 25', value: 63000 },
    { month: 'Feb 30', value: 49000 },
    { month: 'Mar 05', value: 56000 },
    { month: 'Mar 10', value: 44000 },
    { month: 'Mar 15', value: 59000 },
    { month: 'Mar 20', value: 51000 },
  ];

  // Logic: Search & Filter Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = b.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = bookingStatusFilter === 'All' || b.status === bookingStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, bookingStatusFilter]);

  // Logic: Search & Filter Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = userStatusFilter === 'All users' || 
                            (userStatusFilter === 'Active Only' && u.status === 'Active') ||
                            (userStatusFilter === 'Suspended' && u.status === 'Suspended');
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, userStatusFilter]);

  // Logic: Search & Filter Coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = couponStatusFilter === 'All' || c.status === couponStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchTerm, couponStatusFilter]);

  // CSV Export Utility
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(fieldName => {
          const value = String(row[fieldName] || '');
          // Escape quotes and wrap in quotes if contains comma
          const escaped = value.replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handlers
  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUser = {
      id: `u${Date.now()}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      registered: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      booking: 0,
      points: '0',
      status: 'Active'
    };
    setUsers([newUser, ...users]);
    setActiveView('UserManagement');
  };

  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine customer name based on search or new guest
    let customerName = 'Guest User';
    if (customerType === 'Existing User' && createBookingData.customerSearch) {
      const foundUser = users.find(u => 
        u.name.toLowerCase().includes(createBookingData.customerSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(createBookingData.customerSearch.toLowerCase())
      );
      customerName = foundUser?.name || createBookingData.customerSearch;
    } else if (customerType === 'New Guest' && createBookingData.customerName) {
      customerName = createBookingData.customerName;
    }

    // Generate price with currency symbol
    const price = currency.symbol === '$' 
      ? `$${parseInt(createBookingData.baseFare).toLocaleString()}.00`
      : `NGN ${parseInt(createBookingData.baseFare).toLocaleString()}`;

    const newBooking = {
      id: `#EB-${Math.floor(1000 + Math.random() * 9000)}`,
      type: serviceType,
      source: createBookingData.provider || 'Manual Entry',
      customer: customerName,
      price: price,
      status: 'Confirmed',
      date: createBookingData.departureDate 
        ? new Date(createBookingData.departureDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };
    
    setBookings([newBooking, ...bookings]);
    
    // Reset form
    setCreateBookingData({
      customerSearch: '',
      customerName: '',
      customerEmail: '',
      fromLocation: '',
      toLocation: '',
      departureDate: '',
      returnDate: '',
      provider: '',
      baseFare: '75000',
      taxesFees: 'included',
      baggage: 'Free'
    });
    
    setActiveView('Bookings');
    
    // Show success message
    alert(`Booking created successfully!\nBooking ID: ${newBooking.id}\nCustomer: ${newBooking.customer}`);
  };

  const handleCreateCoupon = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCoupon = {
      id: `c${Date.now()}`,
      customer: formData.get('customer') as string,
      code: formData.get('code') as string,
      expiry: formData.get('expiry') as string,
      minSpend: `$${formData.get('minSpend')}`,
      type: 'All',
      status: 'Active'
    };
    setCoupons([newCoupon, ...coupons]);
    setShowCouponModal(false);
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setActiveView('UserProfile');
  };

  const handleViewBooking = (booking: any) => {
    setSelectedBooking(booking);
    setActiveView('BookingDetails');
  };

  const handleRefreshCreateBooking = () => {
    setCreateBookingData({
      customerSearch: '',
      customerName: '',
      customerEmail: '',
      fromLocation: '',
      toLocation: '',
      departureDate: '',
      returnDate: '',
      provider: '',
      baseFare: '75000',
      taxesFees: 'included',
      baggage: 'Free'
    });
    setServiceType('Flight');
    setTripType('Round Trip');
    setCabinClass('Economy');
    setPaymentMethod('CREDIT CARD');
    setCustomerType('Existing User');
    
    // Show refresh message
    alert('Form has been refreshed. All fields have been reset.');
  };

  const handleCustomerSearchSelect = (user: any) => {
    setCreateBookingData(prev => ({
      ...prev,
      customerSearch: user.name,
      customerName: user.name,
      customerEmail: user.email
    }));
  };

  const handleProfileEdit = (field: keyof typeof profileData) => {
    const currentValue = profileData[field];
    const fieldLabels: Record<keyof typeof profileData, string> = {
      displayName: 'Display Name',
      adminEmail: 'Admin Email',
      primaryTerminal: 'Primary Terminal',
      authorizationLevel: 'Authorization Level',
      profileImage: 'Profile Image URL'
    };

    const newValue = prompt(`Enter new ${fieldLabels[field]}:`, currentValue);
    if (newValue && newValue.trim() !== '') {
      setProfileData(prev => ({ ...prev, [field]: newValue.trim() }));
      alert(`${fieldLabels[field]} updated successfully!`);
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you would upload to a server
      // For demo, we'll create a local URL
      const imageUrl = URL.createObjectURL(file);
      setProfileData(prev => ({ ...prev, profileImage: imageUrl }));
      alert('Profile image updated successfully!');
    }
  };

  const handleSaveProfile = () => {
    // In a real app, you would save to a server
    alert('Profile saved successfully!');
  };

  const renderSidebar = () => (
    <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 z-50">
      <div className="p-8 flex items-center gap-2">
        <div className="bg-[#001f3f] p-2 rounded shadow-lg">
          <span className="text-white font-bold italic text-sm">EB</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-gray-900 leading-none uppercase tracking-tighter">EBONY BRUCE</span>
          <span className="text-[8px] text-gray-400 uppercase tracking-widest font-black">Travels Limited</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {[
          { id: 'Analytics', label: 'Analytics Dashboard', icon: '📊' },
          { id: 'Bookings', label: 'Bookings', icon: '📅' },
          { id: 'UserManagement', label: 'User Management', icon: '👥' },
          { id: 'Coupons', label: 'Coupons', icon: '🏷️' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveView(item.id as AdminView); setSearchTerm(''); }}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl font-bold text-sm transition-all ${
              activeView === item.id || (activeView === 'CreateBooking' && item.id === 'Bookings') ? 'bg-[#33a8da] text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <div className="pt-8 pb-4 px-6">
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Admin Account</span>
        </div>
        {[
          { id: 'PersonalDetails', label: 'Profile', icon: '👤' },
          { id: 'Security', label: 'Security', icon: '🛡️' },
          { id: 'PaymentMethods', label: 'Payment', icon: '💳' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as AdminView)}
            className={`w-full flex items-center gap-4 px-6 py-3 rounded-xl font-bold text-xs transition-all ${
              activeView === item.id ? 'text-[#33a8da] bg-blue-50' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-8 mt-auto border-t border-gray-100">
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-red-100 text-red-500 font-bold text-sm rounded-xl hover:bg-red-50 transition">
          Sign Out
        </button>
      </div>
    </aside>
  );

  const renderTopBar = () => (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-40">
      <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 w-96 group focus-within:border-[#33a8da] transition-all">
        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${activeView === 'UserManagement' ? 'users' : activeView === 'Bookings' ? 'bookings' : 'dashboard'}...`} 
          className="bg-transparent border-none focus:ring-0 text-sm font-medium ml-2 w-full" 
        />
      </div>

      <div className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition" onClick={() => setActiveView('PersonalDetails')}>
        <div className="text-right">
          <p className="text-sm font-black text-gray-900 leading-none">{profileData.displayName}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Super Admin</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#f4d9c6] border-2 border-white shadow-sm overflow-hidden">
          <img src={profileData.profileImage} className="w-full h-full object-cover" alt="Profile" />
        </div>
      </div>
    </header>
  );

  // View: Analytics (Updated with trending line)
  const renderAnalytics = () => {
    // Calculate points for trending line
    const maxValue = Math.max(...revenueData.map(d => d.value));
    const points = revenueData.map((data, i) => {
      const x = (i / (revenueData.length - 1)) * 100;
      const y = 100 - (data.value / maxValue) * 100;
      return `${x}% ${y}%`;
    }).join(', ');

    return (
      <div className="animate-in fade-in duration-500 p-10 bg-[#f8fbfe]">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Global Analytics</h2>
            <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Aggregated performance and booking overview</p>
          </div>
          <button 
            onClick={() => downloadCSV(stats, 'ebony-bruce-analytics-summary')}
            className="bg-[#33a8da] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#2c98c7] transition flex items-center gap-2"
          >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Download Report
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2">{s.label}</p>
              <div className="flex items-end justify-between">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{s.value}</h3>
                <span className={`text-[13px] font-black px-3 py-1 rounded-lg ${s.color} bg-opacity-10`}>{s.change}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Revenue Chart and Categories */}
          <div className="lg:col-span-8 space-y-8">
            {/* Revenue Over Time Chart */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Revenue Over Time</h3>
                  <p className="text-sm text-gray-400 font-medium mt-1">Gross transaction value across all channels</p>
                </div>
              </div>
              
              {/* Chart with trending line */}
              <div className="h-64 relative mb-6">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 25, 50, 75, 100].map((percent) => (
                    <div key={percent} className="border-t border-gray-100"></div>
                  ))}
                </div>
                
                {/* Bars */}
                <div className="absolute inset-0 flex items-end justify-between px-2">
                  {revenueData.map((data, i) => {
                    const height = (data.value / maxValue) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3">
                        <div className="w-full max-w-[6px] relative group">
                          <div 
                            className="w-full bg-[#33a8da] rounded-t-md transition-all duration-500 hover:bg-[#2c98c7] group-hover:shadow-lg" 
                            style={{ height: `${height}%` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            ${data.value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Trending Line */}
                <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#ff6b6b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5,5"
                  />
                  {/* Line dots */}
                  {revenueData.map((data, i) => {
                    const x = (i / (revenueData.length - 1)) * 100;
                    const y = 100 - (data.value / maxValue) * 100;
                    return (
                      <circle
                        key={i}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="3"
                        fill="#ff6b6b"
                        stroke="white"
                        strokeWidth="1"
                      />
                    );
                  })}
                </svg>
              </div>
              
              {/* Month labels */}
              <div className="flex justify-between items-center border-t border-gray-100 pt-6 overflow-x-auto">
                <div className="flex space-x-4 min-w-max">
                  {revenueData.map((data, i) => (
                    <span key={i} className="text-[11px] font-bold text-gray-400 whitespace-nowrap">
                      {data.month}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Categories */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Booking Category</h3>
              <div className="space-y-6">
                {bookingCategories.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-900">{category.type}</span>
                      <span className="text-sm font-black text-gray-900">{category.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className={`h-full rounded-full ${category.color} transition-all duration-500`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Top Locations and Recent Activity */}
          <div className="lg:col-span-4 space-y-8">
            {/* Top Locations */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Top Location</h3>
              <div className="space-y-4">
                {topLocations.map((location, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        index === 0 ? 'bg-[#33a8da]' : 
                        index === 1 ? 'bg-[#2ecc71]' : 
                        'bg-[#9b59b6]'
                      }`}>
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{location.name}</p>
                        <p className="text-xs text-gray-400">{location.bookings.toLocaleString()} bookings</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Recent Activity</h3>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-50 animate-pulse" /> Live
                </span>
              </div>
              
              <div className="space-y-6">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="relative pl-6 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-[#33a8da]" />
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activity.time}</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        activity.type === 'New Booking' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
                      }`}>
                        {activity.type}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-gray-900">
                        {activity.type === 'New Booking' 
                          ? `${activity.bookingId} by ${activity.customer} via ${activity.provider}`
                          : `${activity.bookingId} by ${activity.customer}`
                        }
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded ${activity.change.includes('+') ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                            {activity.change}
                          </span>
                          <span className="text-sm font-bold text-gray-900">{activity.amount}</span>
                        </div>
                        
                        {activity.type === 'New Booking' && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <span className="font-bold">{activity.from}</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span className="font-bold">{activity.to}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // View: Personal Details (Profile) - Fixed
  const renderPersonalDetails = () => (
    <div className="animate-in fade-in duration-500 p-10 bg-[#f8fbfe]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Profile Account</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Ebony Bruce Admin Identity Settings</p>
        </div>

        <div className="bg-white rounded-[32px] p-12 shadow-sm border border-gray-100">
          <div className="flex items-center gap-10 mb-16 pb-12 border-b border-gray-50">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[40px] bg-[#f4d9c6] overflow-hidden border-4 border-white shadow-xl">
                <img src={profileData.profileImage} className="w-full h-full object-cover" alt="Profile" />
              </div>
              <label className="absolute bottom-[-10px] right-[-10px] w-10 h-10 bg-[#33a8da] text-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white hover:scale-105 transition-transform cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                />
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </label>
            </div>
            <div>
              <h3 className="text-3xl font-black text-gray-900 leading-none mb-3">{profileData.displayName}</h3>
              <div className="flex items-center gap-3">
                 <span className="bg-blue-50 text-[#33a8da] text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest border border-blue-100">Super Admin</span>
                 <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">ID: #ADM-4421-XB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12">
            {[
              { label: 'Display Name', field: 'displayName' as keyof typeof profileData },
              { label: 'Admin Email', field: 'adminEmail' as keyof typeof profileData },
              { label: 'Primary Terminal', field: 'primaryTerminal' as keyof typeof profileData },
              { label: 'Authorization Level', field: 'authorizationLevel' as keyof typeof profileData },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">{label}</label>
                <div className="p-5 bg-gray-50 border-2 border-transparent rounded-2xl flex justify-between items-center group hover:bg-white hover:border-[#33a8da]/10 transition-all">
                  <span className="text-base font-bold text-gray-900">{profileData[field]}</span>
                  <button 
                    onClick={() => handleProfileEdit(field)}
                    className="text-[10px] font-black text-[#33a8da] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 pt-12 border-t border-gray-50 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Multi-Factor Authentication Active</p>
                  <p className="text-xs text-gray-400 font-medium">Enhanced encryption is enabled for this admin account.</p>
                </div>
             </div>
             <button 
               onClick={handleSaveProfile}
               className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition transform active:scale-95"
             >
               Save Profile
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  // View: Bookings Table (unchanged)
  const renderBookings = () => (
    <div className="animate-in fade-in duration-500 p-10">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Bookings Management</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Global platform activity</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => downloadCSV(filteredBookings, 'ebony-bruce-bookings')}
            className="flex items-center gap-2 px-6 py-3 border border-gray-100 bg-white rounded-xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <button onClick={() => setActiveView('CreateBooking')} className="bg-[#33a8da] text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#2c98c7] transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M12 4v16m8-8H4" /></svg>
            Create Booking
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 flex items-center justify-between border-b border-gray-50">
          <div className="flex gap-2">
            {['All', 'Confirmed', 'Cancelled'].map(status => (
              <button 
                key={status} 
                onClick={() => setBookingStatusFilter(status)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  bookingStatusFilter === status ? 'bg-[#33a8da] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{filteredBookings.length} entries found</p>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#f8fbfe] border-b border-gray-100">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Booking ID</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredBookings.map((b, i) => (
              <tr key={i} className="hover:bg-blue-50/10 transition cursor-pointer group" onClick={() => handleViewBooking(b)}>
                <td className="px-8 py-6 text-sm font-black text-[#33a8da]">{b.id}</td>
                <td className="px-8 py-6 text-sm font-black text-gray-900">{b.customer}</td>
                <td className="px-8 py-6 text-sm font-black text-gray-900">{b.price}</td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    b.status === 'Confirmed' ? 'bg-[#e7f6ed] text-[#5cb85c] border-[#d4edda]' : 'bg-red-50 text-red-500 border-red-100'
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-tight">{b.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // View: Create Booking Form (unchanged)
  const renderCreateBooking = () => {
    // Filter users based on search
    const filteredSearchUsers = users.filter(user =>
      user.name.toLowerCase().includes(createBookingData.customerSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(createBookingData.customerSearch.toLowerCase())
    );

    return (
      <div className="animate-in fade-in duration-500 p-10 bg-[#f8fbfe] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => setActiveView('Bookings')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition font-bold text-sm mb-10 uppercase tracking-widest">
             ← Back to Bookings
          </button>
          <div className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Create Manual Booking</h1>
              <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest opacity-60">Fill in the details below to create a new reservation for a customer.</p>
            </div>
            <button 
              onClick={handleRefreshCreateBooking}
              className="bg-[#33a8da] text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#2c98c7] transition"
            >
              Refresh Form
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">
                 <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-10">1. Service Type</h3>
                 <div className="grid grid-cols-3 gap-6">
                   {['Flight', 'Car Rental', 'Hotel'].map(t => (
                     <button 
                      key={t}
                      type="button"
                      onClick={() => setServiceType(t as any)}
                      className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all ${serviceType === t ? 'border-[#33a8da] bg-blue-50 text-[#33a8da]' : 'border-gray-50 bg-gray-50/50 text-gray-400 hover:border-gray-200 hover:text-gray-600'}`}
                     >
                       <span className="text-2xl mb-2">{t === 'Flight' ? '✈️' : t === 'Hotel' ? '🏨' : '🚗'}</span>
                       <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
                     </button>
                   ))}
                 </div>
              </div>

              <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">
                 <div className="flex justify-between items-center mb-8">
                   <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">2. Customer Information</h3>
                   <div className="flex bg-gray-50 p-1 rounded-xl">
                     <button 
                       type="button"
                       onClick={() => setCustomerType('Existing User')}
                       className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerType === 'Existing User' ? 'bg-white text-[#33a8da] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                       Existing User
                     </button>
                     <button 
                       type="button"
                       onClick={() => setCustomerType('New Guest')}
                       className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerType === 'New Guest' ? 'bg-white text-[#33a8da] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                       New Guest
                     </button>
                   </div>
                 </div>
                 
                 {customerType === 'Existing User' ? (
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search for User</label>
                     <div className="relative">
                       <svg className="w-5 h-5 text-gray-300 absolute left-5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                       <input 
                         type="text" 
                         value={createBookingData.customerSearch}
                         onChange={(e) => setCreateBookingData(prev => ({...prev, customerSearch: e.target.value}))}
                         placeholder="Full name or email address..." 
                         className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#33a8da] outline-none font-bold text-sm transition-all" 
                       />
                     </div>
                     
                     {createBookingData.customerSearch && filteredSearchUsers.length > 0 && (
                       <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                         <div className="max-h-48 overflow-y-auto p-2">
                           {filteredSearchUsers.map(user => (
                             <button
                               key={user.id}
                               type="button"
                               onClick={() => handleCustomerSearchSelect(user)}
                               className="w-full flex items-center gap-3 p-3 hover:bg-white rounded-xl transition text-left"
                             >
                               <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-black text-[#33a8da]">
                                 {user.name.split(' ').map(n => n[0]).join('')}
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                 <p className="text-xs text-gray-400">{user.email}</p>
                               </div>
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {createBookingData.customerSearch && filteredSearchUsers.length === 0 && (
                       <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                         <p className="text-sm text-yellow-700">No users found. Try a different search or switch to "New Guest".</p>
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="space-y-6">
                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                       <input 
                         type="text" 
                         value={createBookingData.customerName}
                         onChange={(e) => setCreateBookingData(prev => ({...prev, customerName: e.target.value}))}
                         placeholder="Enter customer's full name" 
                         className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] outline-none transition-all" 
                       />
                     </div>
                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                       <input 
                         type="email" 
                         value={createBookingData.customerEmail}
                         onChange={(e) => setCreateBookingData(prev => ({...prev, customerEmail: e.target.value}))}
                         placeholder="customer@example.com" 
                         className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] outline-none transition-all" 
                       />
                     </div>
                   </div>
                 )}
              </div>

              <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100 space-y-12">
                 <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">3. {serviceType.toUpperCase()} Details</h3>
                 <div className="grid grid-cols-2 gap-10">
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
                       {serviceType === 'Flight' ? 'From / Airport' : serviceType === 'Hotel' ? 'Check-in Location' : 'Pick-up Location'}
                     </label>
                     <input 
                       type="text" 
                       value={createBookingData.fromLocation}
                       onChange={(e) => setCreateBookingData(prev => ({...prev, fromLocation: e.target.value}))}
                       placeholder={serviceType === 'Flight' ? 'e.g. Lagos (LOS)' : serviceType === 'Hotel' ? 'e.g. Lagos, Nigeria' : 'e.g. Lagos Airport'} 
                       className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] outline-none transition-all" 
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
                       {serviceType === 'Flight' ? 'To / Airport' : serviceType === 'Hotel' ? 'Hotel Name' : 'Drop-off Location'}
                     </label>
                     <input 
                       type="text" 
                       value={createBookingData.toLocation}
                       onChange={(e) => setCreateBookingData(prev => ({...prev, toLocation: e.target.value}))}
                       placeholder={serviceType === 'Flight' ? 'e.g. London (LHR)' : serviceType === 'Hotel' ? 'e.g. Hilton Hotel' : 'e.g. City Center'} 
                       className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] outline-none transition-all" 
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
                       {serviceType === 'Flight' ? 'Departure Date' : serviceType === 'Hotel' ? 'Check-in Date' : 'Rental Start Date'}
                     </label>
                     <input 
                       type="date" 
                       value={createBookingData.departureDate}
                       onChange={(e) => setCreateBookingData(prev => ({...prev, departureDate: e.target.value}))}
                       className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] outline-none transition-all" 
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Provider</label>
                     <select 
                       value={createBookingData.provider}
                       onChange={(e) => setCreateBookingData(prev => ({...prev, provider: e.target.value}))}
                       className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-500 focus:bg-white focus:border-[#33a8da] outline-none appearance-none transition-all"
                     >
                       <option value="">Select Provider</option>
                       <option>Air Peace</option>
                       <option>Hilton</option>
                       <option>Hertz</option>
                     </select>
                   </div>
                 </div>
                 
                 {serviceType === 'Flight' && (
                   <div className="grid grid-cols-2 gap-10">
                     <div className="space-y-4">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trip Type</label>
                       <div className="space-y-4">
                         {['Round Trip', 'One way', 'Multi City'].map(t => (
                           <label key={t} className="flex items-center gap-3 cursor-pointer group">
                             <div onClick={() => setTripType(t)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${tripType === t ? 'border-[#33a8da] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                               {tripType === t && <div className="w-2.5 h-2.5 bg-[#33a8da] rounded-full" />}
                             </div>
                             <span className={`text-xs font-bold ${tripType === t ? 'text-gray-900' : 'text-gray-400'}`}>{t}</span>
                           </label>
                         ))}
                       </div>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Class</label>
                        <div className="grid grid-cols-2 gap-4">
                          {['Economy', 'Premium', 'Business', 'First Class'].map(c => (
                            <label key={c} className="flex items-center gap-3 cursor-pointer">
                              <div onClick={() => setCabinClass(c)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${cabinClass === c ? 'border-[#33a8da] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                {cabinClass === c && <div className="w-2.5 h-2.5 bg-[#33a8da] rounded-full" />}
                              </div>
                              <span className={`text-xs font-bold ${cabinClass === c ? 'text-gray-900' : 'text-gray-400'}`}>{c}</span>
                            </label>
                          ))}
                        </div>
                     </div>
                   </div>
                 )}
                 
                 {tripType === 'Round Trip' && serviceType === 'Flight' && (
                   <div className="mt-6">
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Return Date</label>
                     <input 
                       type="date" 
                       value={createBookingData.returnDate}
                       onChange={(e) => setCreateBookingData(prev => ({...prev, returnDate: e.target.value}))}
                       className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] outline-none transition-all" 
                     />
                   </div>
                 )}
              </div>
            </div>

            <aside className="lg:col-span-4">
              <div className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100 border-t-4 border-t-[#33a8da] sticky top-24">
                 <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-10">Summary & Payment</h3>
                 <div className="space-y-6">
                   <div className="flex justify-between items-center">
                     <span className="text-gray-400 font-bold text-sm">Base Fare</span>
                     <div className="flex items-center gap-2">
                       <span className="font-black text-gray-900">
                         {currency.symbol === '$' ? '$' : 'NGN '}
                         {parseInt(createBookingData.baseFare).toLocaleString()}
                       </span>
                       <button 
                         type="button"
                         onClick={() => {
                           const newFare = prompt('Enter new base fare amount:', createBookingData.baseFare);
                           if (newFare && !isNaN(Number(newFare))) {
                             setCreateBookingData(prev => ({...prev, baseFare: newFare}));
                           }
                         }}
                         className="text-[10px] text-[#33a8da] font-bold hover:underline"
                       >
                         Edit
                       </button>
                     </div>
                   </div>
                   
                   <div className="flex justify-between items-center">
                     <span className="text-gray-400 font-bold text-sm">Taxes & Fees</span>
                     <div className="flex items-center gap-2">
                       <select 
                         value={createBookingData.taxesFees}
                         onChange={(e) => setCreateBookingData(prev => ({...prev, taxesFees: e.target.value}))}
                         className="font-bold text-gray-900 bg-transparent border-none outline-none"
                       >
                         <option value="included">Included</option>
                         <option value="additional">Additional</option>
                       </select>
                     </div>
                   </div>
                   
                   <div className="flex justify-between items-center border-b border-gray-50 pb-8">
                     <span className="text-gray-400 font-bold text-sm">Baggage</span>
                     <div className="flex items-center gap-2">
                       <select 
                         value={createBookingData.baggage}
                         onChange={(e) => setCreateBookingData(prev => ({...prev, baggage: e.target.value}))}
                         className="font-black text-blue-500 uppercase tracking-tighter bg-transparent border-none outline-none"
                       >
                         <option value="Free">Free</option>
                         <option value="Paid">Paid</option>
                         <option value="Extra">Extra</option>
                       </select>
                     </div>
                   </div>
                   
                   <div className="pt-2 flex justify-between items-end">
                     <span className="text-xl font-black text-gray-900 uppercase">Total</span>
                     <span className="text-3xl font-black text-[#33a8da] tracking-tighter">
                       {currency.symbol === '$' ? '$' : 'NGN '}
                       {parseInt(createBookingData.baseFare).toLocaleString()}
                     </span>
                   </div>

                   <div className="pt-8 space-y-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => setPaymentMethod('CREDIT CARD')}
                          className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentMethod === 'CREDIT CARD' ? 'bg-blue-50 border-[#33a8da] text-[#33a8da]' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'}`}
                        >
                          Credit Card
                        </button>
                        <button 
                          type="button"
                          onClick={() => setPaymentMethod('BANK TRANSFER')}
                          className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentMethod === 'BANK TRANSFER' ? 'bg-blue-50 border-[#33a8da] text-[#33a8da]' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'}`}
                        >
                          Bank Transfer
                        </button>
                      </div>
                   </div>

                   <button 
                     onClick={handleCreateBookingSubmit}
                     disabled={!createBookingData.provider || (!createBookingData.customerSearch && !createBookingData.customerName)}
                     className={`w-full py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl transition active:scale-95 mt-8 ${
                       !createBookingData.provider || (!createBookingData.customerSearch && !createBookingData.customerName)
                         ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                         : 'bg-[#33a8da] text-white shadow-blue-500/10 hover:bg-[#2c98c7]'
                     }`}
                   >
                     Confirm & Create Booking
                   </button>
                   
                   {(!createBookingData.provider || (!createBookingData.customerSearch && !createBookingData.customerName)) && (
                     <p className="text-[10px] text-red-400 text-center font-bold px-10 leading-relaxed mt-2">
                       Please fill in required fields: Provider and Customer Information
                     </p>
                   )}
                   
                   <p className="text-[10px] text-gray-400 text-center font-bold px-10 leading-relaxed mt-4">
                     By clicking confirm, an invoice will be generated and sent to the customer's email address.
                   </p>
                 </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  };

  // View: User Management (unchanged)
  const renderUserManagement = () => (
    <div className="animate-in fade-in duration-500 p-10">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">User Directory</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Total members: {users.length}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => downloadCSV(filteredUsers, 'ebony-bruce-users')}
            className="flex items-center gap-2 px-6 py-3 border border-gray-100 bg-white rounded-xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <button onClick={() => setActiveView('AddUser')} className="bg-[#33a8da] text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#2c98c7] transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M12 4v16m8-8H4" /></svg>
            Add New User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 flex items-center justify-between border-b border-gray-50">
           <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                {['All users', 'Active Only', 'Suspended'].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setUserStatusFilter(f)}
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      userStatusFilter === f ? 'bg-[#33a8da] text-white shadow-md' : 'text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
           </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#f8fbfe] border-b border-gray-100">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registered</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bookings</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Points</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map((u, i) => (
              <tr key={i} className="hover:bg-blue-50/10 transition cursor-pointer" onClick={() => handleViewUser(u)}>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[11px] font-black text-[#33a8da]">
                       {u.name.split(' ').map(n => n[0]).join('')}
                     </div>
                     <div><p className="text-sm font-black text-gray-900">{u.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{u.email}</p></div>
                  </div>
                </td>
                <td className="px-8 py-6 text-xs font-bold text-gray-500">{u.registered}</td>
                <td className="px-8 py-6 text-sm font-black text-gray-900">{u.booking}</td>
                <td className="px-8 py-6 text-sm font-black text-gray-900">{u.points}</td>
                <td className="px-8 py-6">
                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${
                    u.status === 'Active' ? 'bg-[#e7f6ed] text-[#5cb85c] border-[#d4edda]' : 'bg-red-50 text-red-500 border-red-100'
                  }`}>
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // View: Add User Form (unchanged)
  const renderAddUser = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-10 max-w-2xl">
       <button onClick={() => setActiveView('UserManagement')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-sm mb-10 transition">
         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7"/></svg>
         Back to list
       </button>
       <div className="mb-12">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Create Identity</h2>
          <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">Onboard a new platform user</p>
       </div>
       <form onSubmit={handleAddUser} className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100 space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
            <input name="name" required type="text" placeholder="John Doe" className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold focus:border-[#33a8da] outline-none border-2 border-transparent transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
            <input name="email" required type="email" placeholder="john@example.com" className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold focus:border-[#33a8da] outline-none border-2 border-transparent transition-all" />
          </div>
          <button type="submit" className="w-full bg-[#33a8da] text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:bg-[#2c98c7] transition">Provision User Account</button>
       </form>
    </div>
  );

  // View: Coupons (unchanged)
  const renderCoupons = () => (
    <div className="animate-in fade-in duration-500 p-10">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Incentives</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Active promo campaigns</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => downloadCSV(filteredCoupons, 'ebony-bruce-coupons')}
            className="flex items-center gap-2 px-6 py-3 border border-gray-100 bg-white rounded-xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <button onClick={() => setShowCouponModal(true)} className="bg-[#33a8da] text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#2c98c7] transition">
            New Coupon
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f8fbfe]">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target User</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiry</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredCoupons.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50 transition">
                <td className="px-8 py-6 text-sm font-black text-gray-900">{c.customer}</td>
                <td className="px-8 py-6 text-sm font-black text-[#33a8da]">{c.code}</td>
                <td className="px-8 py-6 text-xs font-bold text-gray-400">{c.expiry}</td>
                <td className="px-8 py-6 text-xs font-bold text-gray-600">{c.type}</td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase border ${
                    c.status === 'Active' ? 'bg-[#e7f6ed] text-[#5cb85c] border-[#d4edda]' : 'bg-red-50 text-red-500 border-red-100'
                  }`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // View: User Profile Drill-down (unchanged)
  const renderUserProfile = () => (
    <div className="animate-in fade-in duration-500 p-10">
       <button onClick={() => setActiveView('UserManagement')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-sm mb-10 transition">
         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7"/></svg>
         Directory
       </button>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 space-y-8">
             <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100 text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-3xl font-black text-[#33a8da] mx-auto mb-6">
                   {selectedUser?.name[0]}
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedUser?.name}</h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">{selectedUser?.email}</p>
                <div className="mt-8 pt-8 border-t border-gray-50 flex justify-between">
                   <div className="text-center">
                     <p className="text-xs font-black text-gray-900">{selectedUser?.booking}</p>
                     <p className="text-[9px] font-bold text-gray-400 uppercase">Bookings</p>
                   </div>
                   <div className="text-center">
                     <p className="text-xs font-black text-[#33a8da]">{selectedUser?.points}</p>
                     <p className="text-[9px] font-bold text-gray-400 uppercase">Points</p>
                   </div>
                   <div className="text-center">
                     <p className="text-xs font-black text-green-500">{selectedUser?.status}</p>
                     <p className="text-[9px] font-bold text-gray-400 uppercase">Status</p>
                   </div>
                </div>
             </div>
             <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-6">Internal Notes</h3>
                <textarea placeholder="Add a private note about this customer..." className="w-full h-32 bg-gray-50 rounded-xl p-4 text-sm font-medium border-none focus:ring-1 focus:ring-[#33a8da] outline-none" />
             </div>
          </div>
          <div className="lg:col-span-2 space-y-8">
             <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-8">Interaction History</h3>
                <div className="space-y-6">
                   {[1, 2].map(i => (
                     <div key={i} className="flex gap-4 p-5 bg-gray-50 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg">✈️</div>
                        <div>
                           <p className="text-sm font-black text-gray-900">Flight Booking Confirmed</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Ref: #BK-9421{i} • Jan 2026</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="flex gap-4">
                <button className="flex-1 bg-red-50 text-red-500 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-red-100 transition">Suspend Access</button>
                <button className="flex-1 bg-gray-900 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition">Reset Password Link</button>
             </div>
          </div>
       </div>
    </div>
  );

  // View: Security Settings (unchanged)
  const renderSecurity = () => (
    <div className="animate-in fade-in duration-500 p-10 max-w-4xl">
       <div className="mb-12">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Security Center</h2>
          <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">Admin Authorization Protection</p>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">
             <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl mb-6">🔐</div>
             <h3 className="text-lg font-black text-gray-900 mb-2">Two-Factor Authentication</h3>
             <p className="text-sm text-gray-400 font-medium mb-8 leading-relaxed">Add an extra layer of security to your administrative account.</p>
             <button onClick={() => setShow2FAModal(true)} className="w-full bg-[#33a8da] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#2c98c7] transition">Configure 2FA</button>
          </div>
          <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">
             <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl mb-6">🔑</div>
             <h3 className="text-lg font-black text-gray-900 mb-2">Password Rotation</h3>
             <p className="text-sm text-gray-400 font-medium mb-8 leading-relaxed">It is recommended to update your security key every 90 days.</p>
             <button className="w-full border-2 border-gray-100 text-gray-400 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:border-gray-200 transition">Change Key</button>
          </div>
       </div>
    </div>
  );

  const renderActiveView = () => {
    switch(activeView) {
      case 'Analytics': return renderAnalytics();
      case 'Bookings': return renderBookings();
      case 'UserManagement': return renderUserManagement();
      case 'Coupons': return renderCoupons();
      case 'AddUser': return renderAddUser();
      case 'CreateBooking': return renderCreateBooking();
      case 'PersonalDetails': return renderPersonalDetails();
      case 'UserProfile': return renderUserProfile();
      case 'Security': return renderSecurity();
      default: return renderAnalytics();
    }
  };

  return (
    <div className="flex bg-[#f8fbfe] min-h-screen">
      {renderSidebar()}
      
      <div className="flex-1 flex flex-col min-w-0">
        {renderTopBar()}
        <main className="flex-1 overflow-y-auto hide-scrollbar">
          {renderActiveView()}
        </main>
      </div>

      {/* Interactive Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001f3f]/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-[32px] border border-gray-100 shadow-2xl overflow-hidden animate-in zoom-in-95">
              <form onSubmit={handleCreateCoupon}>
                <div className="p-10 border-b border-gray-50 flex justify-between items-start">
                   <div>
                     <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">New Coupon</h2>
                     <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Generate a promo code</p>
                   </div>
                   <button type="button" onClick={() => setShowCouponModal(false)} className="text-gray-300 hover:text-gray-900"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg></button>
                </div>
                <div className="p-10 space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase">Target Customer</label>
                       <input name="customer" required placeholder="e.g. John Doe" className="w-full px-5 py-3 bg-gray-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase">Unique Code</label>
                       <input name="code" required placeholder="EBONY2026" className="w-full px-5 py-3 bg-gray-50 rounded-xl font-black text-[#33a8da] border-none outline-none focus:ring-2 focus:ring-blue-100 uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Expiry</label>
                          <input name="expiry" required type="date" className="w-full px-5 py-3 bg-gray-50 rounded-xl font-bold border-none outline-none" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Min Spend ($)</label>
                          <input name="minSpend" required type="number" placeholder="50" className="w-full px-5 py-3 bg-gray-50 rounded-xl font-bold border-none outline-none" />
                       </div>
                    </div>
                </div>
                <div className="p-10 bg-gray-50 flex gap-4">
                   <button type="button" onClick={() => setShowCouponModal(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-400 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                   <button type="submit" className="flex-2 px-10 bg-[#33a8da] text-white font-black rounded-2xl uppercase text-[10px] shadow-lg shadow-blue-200">Emit Coupon</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* Security Setup Flow Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-[#000814] w-full max-w-[440px] rounded-[40px] border border-white/10 p-16 text-center shadow-2xl animate-in zoom-in-95">
              {faStep === 'otp' ? (
                <>
                  <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-10 shadow-[0_0_80px_rgba(59,130,246,0.1)] border border-blue-500/20 text-3xl">📱</div>
                  <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Security Check</h2>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">We've sent a 6-digit authentication code to your registered device.</p>
                  <div className="flex justify-center gap-3 mb-10">
                     {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="w-10 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white font-black">0</div>)}
                  </div>
                  <button onClick={() => setFaStep('success')} className="w-full bg-[#33a8da] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/30">Verify Terminal</button>
                </>
              ) : (
                <div className="animate-in zoom-in-95">
                   <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto mb-10 border border-green-500/20 text-3xl">✅</div>
                   <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tight">Access Secure</h2>
                   <p className="text-gray-400 font-medium mb-10">Administrative terminal successfully authorized.</p>
                   <button onClick={() => setShow2FAModal(false)} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest">Return</button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;