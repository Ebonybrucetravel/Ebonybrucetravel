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
}

const Profile: React.FC<ProfileProps> = ({
  user,
  onUpdateUser,
  onBack,
  onSignOut,
  onBookItem,
}) => {
  const [activeTab, setActiveTab] = useState<
    'details' | 'bookings' | 'saved' | 'wallet' | 'rewards' | 'security'
  >('details');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [isSaving, setIsSaving] = useState(false);

  // Bookings tab states
  const [bookingFilter, setBookingFilter] = useState<'All' | 'Flight' | 'Hotel' | 'Car'>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [visibleBookingsCount, setVisibleBookingsCount] = useState(4); // Start with 4 visible

  // Manage booking modal
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormData({ ...user });
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field: keyof User, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdateUser(formData);
      setIsSaving(false);
      setIsEditing(false);
    }, 600);
  };

  const handleCancel = () => {
    setFormData({ ...user });
    setIsEditing(false);
  };

  const handleManageBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsManageModalOpen(true);
  };

  const handleBookItemClick = (type: 'hotel' | 'car') => {
    const mockItem =
      type === 'hotel'
        ? {
            id: 'saved-hotel-1',
            provider: 'Passi Al Colosseo',
            title: 'Passi Al Colosseo B&B',
            subtitle: 'Apartments for Rent in Rome',
            price: 'NGN 110,000',
            type: 'hotels',
            time: '14:00',
            duration: 'Flexible',
            imageUrl:
              'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600',
          }
        : {
            id: 'saved-car-1',
            provider: 'Hertz',
            title: 'Tesla Model Y Long Range',
            subtitle: 'Electric SUV • 5 Seats • Lagos Airport',
            price: 'NGN 45,000',
            type: 'cars',
            time: '10:00',
            duration: '24 Hours',
            imageUrl:
              'https://images.unsplash.com/photo-1502877338535-766e3a6052c0?auto=format&fit=crop&q=80&w=800',
          };

    onBookItem(mockItem);
  };

  const handleViewMoreBookings = () => {
    setVisibleBookingsCount((prev) => prev + 2); // Show 2 more each click
  };

  const menuItems = [
    { id: 'details', label: 'Personal Details', icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { id: 'bookings', label: 'My Bookings', icon: <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745V20a2 2 0 002 2h14a2 2 0 002-2v-6.745zM16 8V5a3 3 0 00-6 0v3h6z" /> },
    { id: 'saved', label: 'Saved Items', icon: <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /> },
    { id: 'wallet', label: 'Wallet', icon: <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
    { id: 'rewards', label: 'Rewards & Loyalty', icon: <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /> },
    { id: 'security', label: 'Security', icon: <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
  ];

  // Mock bookings data (expanded to 6 so "View More" has something to show)
  const mockBookings: Booking[] = [
    {
      id: '1',
      type: 'flight',
      title: 'Lagos(LOS) to Abuja(ABJ)',
      provider: 'Air Peace',
      subtitle: 'Flight BA117 . Economy',
      date: 'Dec 26 – Dec 28, 2025',
      duration: '1h 15m Non-Stop',
      status: 'Confirmed',
      price: '75,000.00',
      currency: 'NGN',
      iconBg: 'bg-blue-50',
    },
    {
      id: '2',
      type: 'hotel',
      title: 'Hyatt Tokyo',
      provider: 'Hyatt',
      subtitle: 'Standard King Room . 2 Guests, 5 Nights',
      date: 'Dec 26 – Dec 28, 2025',
      status: 'Completed',
      price: '1,500.00',
      currency: '$',
      iconBg: 'bg-yellow-50',
    },
    {
      id: '3',
      type: 'car',
      title: 'Tesla Model Y',
      provider: 'Hertz',
      subtitle: 'Lagos Airport • Full-to-Full',
      date: 'Jan 15 – Jan 18, 2026',
      status: 'Active',
      price: '45,000.00',
      currency: 'NGN',
      iconBg: 'bg-purple-50',
    },
    {
      id: '4',
      type: 'flight',
      title: 'Abuja(ABV) to Lagos(LOS)',
      provider: 'Ibom Air',
      subtitle: 'Flight IB123 . Business',
      date: 'Jan 20 – Jan 21, 2026',
      duration: '1h 20m Non-Stop',
      status: 'Confirmed',
      price: '95,000.00',
      currency: 'NGN',
      iconBg: 'bg-blue-50',
    },
    {
      id: '5',
      type: 'hotel',
      title: 'Hilton Lagos',
      provider: 'Hilton',
      subtitle: 'Ocean View Suite . 2 Guests, 3 Nights',
      date: 'Feb 10 – Feb 13, 2026',
      status: 'Confirmed',
      price: '320,000.00',
      currency: 'NGN',
      iconBg: 'bg-yellow-50',
    },
    {
      id: '6',
      type: 'car',
      title: 'Mercedes-Benz E-Class',
      provider: 'Avis',
      subtitle: 'Lagos Island • Premium Sedan',
      date: 'Feb 20 – Feb 22, 2026',
      status: 'Active',
      price: '85,000.00',
      currency: 'NGN',
      iconBg: 'bg-purple-50',
    },
  ];

  const filteredBookings = mockBookings.filter((b) => {
    if (bookingFilter === 'All') return true;
    return b.type === bookingFilter.toLowerCase();
  });

  // Only show the number of bookings we want visible
  const visibleBookings = filteredBookings.slice(0, visibleBookingsCount);
  const hasMoreBookings = visibleBookingsCount < filteredBookings.length;

  const statusColors: Record<string, string> = {
    Confirmed: 'bg-green-100 text-green-600',
    Completed: 'bg-gray-100 text-gray-500',
    Cancel: 'bg-red-50 text-red-500',
    Active: 'bg-green-100 text-green-600',
  };

  // ──────────────────────────────────────────────
  //              Render Functions (unchanged except for car card image)
  // ──────────────────────────────────────────────

  const renderBookingCard = (booking: Booking) => (
    <div
      key={booking.id}
      className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 flex flex-col md:flex-row items-center gap-6 hover:shadow-md transition-shadow"
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${booking.iconBg}`}>
        {booking.type === 'flight' && (
          <svg className="w-8 h-8 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        )}
        {booking.type === 'hotel' && <div className="w-10 h-10 bg-[#fef3c7] rounded-full" />}
        {booking.type === 'car' && (
          <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
          </svg>
        )}
      </div>

      <div className="flex-1 text-center md:text-left min-w-0">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
          <h4 className="text-lg font-bold text-gray-900 truncate">{booking.title}</h4>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors[booking.status]}`}>
            {booking.status}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          {booking.provider} <span className="opacity-70">{booking.subtitle}</span>
        </p>
        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {booking.date}
          </div>
          {booking.duration && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {booking.duration}
            </div>
          )}
        </div>
      </div>

      <div className="text-center md:text-right shrink-0">
        <p className="text-sm font-bold text-[#33a8da] mb-3">
          {booking.currency} <span className="text-xl">{booking.price}</span>
        </p>
        <div className="flex items-center justify-center md:justify-end gap-4">
          <button className="text-sm text-gray-400 hover:text-[#33a8da] transition">
            {booking.status === 'Cancel' ? 'Receipt' : 'Details'}
          </button>
          <button
            onClick={() => handleManageBooking(booking)}
            className="px-6 py-2 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition"
          >
            {booking.status === 'Completed' ? 'Book Again' : 'Manage'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHotelCard = () => (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col md:flex-row group">
      <div className="md:w-64 h-48 md:h-auto overflow-hidden relative">
        <img
          src="https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600"
          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          alt="Hotel"
        />
        <button className="absolute top-3 right-3 w-8 h-8 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 p-6 md:p-8">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 leading-tight">
            Passi Al Colosseo B&B - Apartments For Rent In Rome
          </h3>
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 text-[#33a8da] mb-3">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
          <span className="text-sm font-medium">Rome, Italy</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex text-orange-400">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
          </div>
          <span className="text-xs font-bold bg-blue-50 text-[#33a8da] px-2 py-0.5 rounded">5.0</span>
          <span className="text-xs text-gray-500">(200 Reviews)</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs font-medium px-3 py-1 bg-gray-100 rounded-full">Breakfast included</span>
          <span className="text-xs font-medium px-3 py-1 bg-gray-100 rounded-full">Beach Access</span>
        </div>

        <div className="flex items-center justify-between">
          <button className="text-sm font-medium text-[#33a8da] hover:underline">View Details</button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs line-through text-gray-400">NGN 130,000</p>
              <p className="text-xl font-bold text-[#33a8da]">NGN 110,000</p>
            </div>
            <button
              onClick={() => handleBookItemClick('hotel')}
              className="bg-[#33a8da] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-[#2c98c7] transition active:scale-95"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCarCard = () => (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col md:flex-row group">
      <div className="md:w-64 h-48 md:h-auto overflow-hidden relative">
        <img
          src="https://images.unsplash.com/photo-1502877338535-766e3a6052c0?auto=format&fit=crop&q=80&w=800"
          className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
          alt="Car Rental"
        />
        <button className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 p-6 md:p-8">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
            Tesla Model Y Long Range AWD
          </h3>
          <div className="text-red-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[#33a8da] mb-3">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <span className="text-[11px] font-bold">Lagos, Nigeria</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex text-orange-400">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            ))}
          </div>
          <span className="text-[11px] font-black bg-blue-50 text-[#33a8da] px-2 py-0.5 rounded">4.8/5</span>
          <span className="text-[10px] text-gray-400 font-bold">(142 Reviews)</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-[9px] font-black uppercase text-gray-500 bg-gray-100 px-3 py-1 rounded">Automatic</span>
          <span className="text-[9px] font-black uppercase text-gray-500 bg-gray-100 px-3 py-1 rounded">Unlimited Mileage</span>
          <span className="text-[9px] font-black uppercase text-gray-500 bg-gray-100 px-3 py-1 rounded">Insurance Included</span>
        </div>

        <div className="flex items-center justify-between">
          <button className="text-[11px] font-black text-[#33a8da] uppercase tracking-widest hover:underline">
            View Details
          </button>
          <div className="text-right flex items-center gap-4">
            <div className="mr-4">
              <p className="text-[10px] line-through text-gray-400 font-bold">NGN 65,000</p>
              <p className="text-xl font-black text-[#33a8da]">NGN 45,000</p>
            </div>
            <button
              onClick={() => handleBookItemClick('car')}
              className="bg-[#33a8da] text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition active:scale-95"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#f8fbfe] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-[#33a8da] mb-8 font-medium">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            Home
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-700">Account Settings</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10">

          {/* Sidebar */}
          <aside className="w-full lg:w-80 space-y-6 shrink-0">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#f4d9c6] rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=f4d9c6&color=9a7d6a`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 truncate">{user.name || 'Guest User'}</h2>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">Member</p>
                </div>
              </div>
            </div>

            <nav className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-4 px-6 py-4 text-base font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-[#33a8da]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${activeTab === item.id ? 'text-[#33a8da]' : 'text-gray-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    {item.icon}
                  </svg>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Gold Status</h3>
              </div>
              <div className="w-full bg-white/60 h-2.5 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-yellow-500 w-3/4 rounded-full" />
              </div>
              <p className="text-xs text-gray-600 font-medium">1,200 points • Platinum next</p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-8">

            {activeTab === 'details' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-8">
                  <div className="relative group">
                    <div className="w-24 h-24 bg-[#f4d9c6] rounded-full flex items-center justify-center border-4 border-white shadow overflow-hidden">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=f4d9c6&color=9a7d6a`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {isEditing && (
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#33a8da] rounded-full flex items-center justify-center border-4 border-white cursor-pointer">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Personal Information</h1>
                    <p className="text-gray-500 mt-1">Manage your account details</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Identity Details</h3>
                    {isEditing && <span className="text-sm text-blue-600 font-medium">Editing mode</span>}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        readOnly={!isEditing}
                        value={isEditing ? formData.name || '' : user.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full px-5 py-3.5 rounded-xl border ${
                          isEditing ? 'border-[#33a8da] ring-1 ring-[#33a8da]/30 bg-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                        } focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 transition-all`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                        <input
                          type={isEditing ? 'date' : 'text'}
                          readOnly={!isEditing}
                          value={isEditing ? formData.dob || '' : user.dob || '1992-05-15'}
                          onChange={(e) => handleInputChange('dob', e.target.value)}
                          className={`w-full px-5 py-3.5 rounded-xl border ${
                            isEditing ? 'border-[#33a8da] ring-1 ring-[#33a8da]/30 bg-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                          } focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 transition-all`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                        {isEditing ? (
                          <select
                            value={formData.gender || 'Male'}
                            onChange={(e) => handleInputChange('gender', e.target.value)}
                            className="w-full px-5 py-3.5 rounded-xl border border-[#33a8da] ring-1 ring-[#33a8da]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 transition-all appearance-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <div className="w-full px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700">
                            {user.gender || 'Male'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white transition-colors group">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-[#33a8da]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Address</p>
                        {isEditing ? (
                          <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="mt-1 w-full bg-transparent border-b border-[#33a8da] text-lg font-medium focus:outline-none pb-1"
                          />
                        ) : (
                          <p className="text-lg font-medium text-gray-800">{user.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Verified</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white transition-colors group">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-[#33a8da]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone Number</p>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="mt-1 w-full bg-transparent border-b border-[#33a8da] text-lg font-medium focus:outline-none pb-1"
                          />
                        ) : (
                          <p className="text-lg font-medium text-gray-800">{user.phone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Verified</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={onSignOut}
                        className="px-10 py-3.5 border-2 border-[#33a8da]/30 text-[#33a8da] font-bold rounded-xl hover:bg-blue-50 transition"
                      >
                        Sign Out
                      </button>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-10 py-3.5 bg-[#33a8da] text-white font-bold rounded-xl hover:bg-[#2c98c7] shadow-lg shadow-blue-200/30 transition"
                      >
                        Edit Profile
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleCancel}
                        className="px-10 py-3.5 border border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-10 py-3.5 bg-[#33a8da] text-white font-bold rounded-xl hover:bg-[#2c98c7] shadow-lg shadow-blue-200/30 transition flex items-center gap-2 disabled:opacity-70"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">Booking History</h1>
                      <p className="text-gray-500 mt-1">View and manage your past and upcoming bookings</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative" ref={filterRef}>
                        <button
                          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                          className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium flex items-center gap-2 hover:border-[#33a8da] transition"
                        >
                          {bookingFilter === 'All' ? 'All Bookings' : `${bookingFilter}s`}
                          <svg
                            className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showFilterDropdown && (
                          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                            {['All', 'Flight', 'Hotel', 'Car'].map((f) => (
                              <button
                                key={f}
                                onClick={() => {
                                  setBookingFilter(f as any);
                                  setShowFilterDropdown(false);
                                }}
                                className={`w-full text-left px-5 py-3 text-sm font-medium ${
                                  bookingFilter === f ? 'bg-blue-50 text-[#33a8da]' : 'hover:bg-gray-50'
                                }`}
                              >
                                {f === 'All' ? 'All Bookings' : `${f}s`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative" ref={sortRef}>
                        <button
                          onClick={() => setShowSortDropdown(!showSortDropdown)}
                          className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium flex items-center gap-2 hover:border-[#33a8da] transition"
                        >
                          Sort by Date
                          <svg
                            className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showSortDropdown && (
                          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                            {['Date (Latest)', 'Date (Oldest)', 'Price (Highest)', 'Price (Lowest)'].map((s) => (
                              <button
                                key={s}
                                onClick={() => setShowSortDropdown(false)}
                                className="w-full text-left px-5 py-3 text-sm font-medium hover:bg-gray-50"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {visibleBookings.length === 0 ? (
                      <p className="text-center text-gray-500 py-12">No bookings found</p>
                    ) : (
                      visibleBookings.map(renderBookingCard)
                    )}
                  </div>

                  {hasMoreBookings && (
                    <div className="text-center pt-8">
                      <button
                        onClick={handleViewMoreBookings}
                        className="w-full max-w-md mx-auto bg-gradient-to-r from-[#33a8da] to-[#1e90ff] text-white font-black py-5 rounded-[24px] shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:from-[#2c98c7] hover:to-[#1a7ed9] transition-all duration-300 active:scale-[0.98] text-lg tracking-tight"
                      >
                        View More Bookings
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Saved Items</h1>
                    <p className="text-gray-400 font-bold text-sm mt-1">View and manage your wishlist</p>
                  </div>
                  <button className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-[#33a8da] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                    </svg>
                    Share List
                  </button>
                </div>

                <div className="flex gap-4 flex-wrap">
                  {['All items', 'Hotels', 'Car Rentals', 'Flights'].map((t, i) => (
                    <button
                      key={t}
                      className={`px-5 py-2 rounded-full text-xs font-black ${
                        i === 0 ? 'bg-[#33a8da] text-white shadow-md' : 'text-[#33a8da] bg-blue-50 hover:bg-blue-100'
                      } transition`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  {renderHotelCard()}
                  {renderCarCard()}
                  {renderHotelCard()}
                  {renderCarCard()}
                </div>

                <div className="text-center pt-8">
                  <button className="bg-[#33a8da] text-white px-12 py-4 rounded-[24px] font-black text-base shadow-xl shadow-blue-200/30 hover:bg-[#2c98c7] hover:shadow-2xl transition-all duration-300 active:scale-95">
                    View More Saved Items
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'wallet' && (
              <div className="space-y-8 animate-fade-in">
                <h1 className="text-3xl font-bold text-gray-900">Wallet & Rewards</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-[#33a8da]">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Wallet Balance</h3>
                    </div>
                    <p className="text-4xl font-black text-gray-900">NGN 220,000</p>
                    <p className="text-sm text-gray-500 mt-1">Default currency: NGN</p>
                  </div>

                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Rewards Points</h3>
                    </div>
                    <p className="text-4xl font-black text-gray-900">45,000 pts</p>
                    <div className="mt-4 flex gap-8">
                      <div>
                        <p className="text-sm text-gray-500">Spending</p>
                        <p className="text-xl font-bold text-green-600">35,000</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pending</p>
                        <p className="text-xl font-bold text-orange-500">10,000</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 border border-blue-100">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Smart Redeem</h4>
                  <p className="text-gray-600 mb-6">Convert points to booking credit instantly</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm">
                      <p className="text-sm text-gray-500 font-medium uppercase mb-2">From Points</p>
                      <div className="flex items-end gap-2">
                        <input
                          type="text"
                          defaultValue="4500"
                          className="text-3xl font-bold w-32 focus:outline-none"
                        />
                        <span className="text-gray-500 font-medium">PTS</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Rate: 100 pts = ₦1,000</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm">
                      <p className="text-sm text-gray-500 font-medium uppercase mb-2">You Get</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-[#33a8da]">NGN 45,000</span>
                      </div>
                    </div>
                  </div>

                  <button className="mt-6 w-full bg-[#33a8da] text-white py-4 rounded-xl font-bold hover:bg-[#2c98c7] transition">
                    Convert Now
                  </button>
                </div>
              </div>
            )}

            {['rewards', 'security'].includes(activeTab) && (
              <div className="bg-white rounded-3xl p-12 text-center text-gray-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  {activeTab === 'rewards' ? 'Rewards & Loyalty' : 'Security'}
                </h2>
                <p>Coming soon...</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <ManageBookingModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        booking={selectedBooking}
      />
    </div>
  );
};

export default Profile;