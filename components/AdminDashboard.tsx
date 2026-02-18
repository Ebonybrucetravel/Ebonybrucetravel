'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminView = 'Analytics' | 'Flights' | 'Hotels' | 'CarRentals' | 'Bookings' | 'UserManagement' | 'Coupons' | 'PersonalDetails' | 'Security' | 'PaymentMethods' | 'AddUser' | 'CreateBooking' | 'BookingDetails' | 'UserProfile';

// Define types for API data
interface Booking {
  id: string;
  type: string;
  source: string;
  customer: string;
  price: string;
  status: string;
  date: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  registered: string;
  booking: number;
  points: string;
  status: string;
  role?: string; 
}

interface Coupon {
  id: string;
  customer: string;
  code: string;
  expiry: string;
  minSpend: string;
  type: string;
  status: string;
}

interface Stat {
  label: string;
  value: string;
  change: string;
  color: string;
  icon: string;
  bgColor: string;
}

interface RevenueData {
  month: string;
  value: number;
  previousYear: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { currency } = useLanguage();
  const [activeView, setActiveView] = useState<AdminView>('Analytics');
  const [activeServiceTab, setActiveServiceTab] = useState<'Flights' | 'Hotels' | 'CarRentals'>('Flights');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedChartPoint, setSelectedChartPoint] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  // Loading states
  const [isLoading, setIsLoading] = useState({
    analytics: false,
    bookings: false,
    users: false,
    coupons: false
  });

  // Error states
  const [error, setError] = useState<string | null>(null);
  
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
    profileImage: 'https://ui-avatars.com/api/?name=Miracle+Chiamaka&background=33a8da&color=fff'
  });

  // Data States - Initialize with empty arrays, will be populated from API
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Analytics Data - Initialize with default structure, will be populated from API
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Total Revenue', value: '$0', change: '+0%', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: '💰' },
    { label: 'Total Bookings', value: '0', change: '+0%', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: '📊' },
    { label: 'Active Users', value: '0', change: '+0%', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: '👥' },
    { label: 'Conversion Rate', value: '0%', change: '+0%', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: '🎯' },
  ]);

  const [bookingCategories, setBookingCategories] = useState([
    { type: 'Flight', percentage: 0, color: '#33a8da', value: 0, icon: '✈️' },
    { type: 'Hotels', percentage: 0, color: '#f59e0b', value: 0, icon: '🏨' },
    { type: 'Car Rentals', percentage: 0, color: '#10b981', value: 0, icon: '🚗' },
  ]);

  const [topLocations, setTopLocations] = useState([
    { name: 'Loading...', bookings: 0, revenue: '$0', growth: '+0%', flag: '🌍', color: 'from-blue-500 to-cyan-500' },
  ]);

  const [recentActivities, setRecentActivities] = useState([]);

  // Enhanced revenue data
  const [revenueData, setRevenueData] = useState<RevenueData[]>([
    { month: 'Loading...', value: 0, previousYear: 0 },
  ]);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // API Base URL - replace with your actual API endpoint
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ebonybruce.com';

  // Fetch data based on active view
  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      
      try {
        switch(activeView) {
          case 'Analytics':
          case 'Flights':
          case 'Hotels':
          case 'CarRentals':
            setIsLoading(prev => ({ ...prev, analytics: true }));
            // Fetch analytics data with service filter
            const analyticsData = await fetchAnalyticsData(activeView);
            if (analyticsData) {
              setStats(analyticsData.stats);
              setBookingCategories(analyticsData.bookingCategories);
              setTopLocations(analyticsData.topLocations);
              setRevenueData(analyticsData.revenueData);
            }
            setIsLoading(prev => ({ ...prev, analytics: false }));
            break;
            
          case 'Bookings':
            setIsLoading(prev => ({ ...prev, bookings: true }));
            const bookingsData = await fetchBookings();
            if (bookingsData) setBookings(bookingsData);
            setIsLoading(prev => ({ ...prev, bookings: false }));
            break;
            
          case 'UserManagement':
            setIsLoading(prev => ({ ...prev, users: true }));
            const usersData = await fetchUsers();
            if (usersData) setUsers(usersData);
            setIsLoading(prev => ({ ...prev, users: false }));
            break;
            
          case 'Coupons':
            setIsLoading(prev => ({ ...prev, coupons: true }));
            const couponsData = await fetchCoupons();
            if (couponsData) setCoupons(couponsData);
            setIsLoading(prev => ({ ...prev, coupons: false }));
            break;
        }
      } catch (err) {
        setError('Failed to fetch data. Please try again.');
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [activeView, activeServiceTab, dateRange]);

  // API Functions - You'll implement these with your actual endpoints
  const fetchAnalyticsData = async (view?: string) => {
    // TODO: Implement actual API call with service filter
    // const response = await fetch(`${API_BASE_URL}/admin/analytics?service=${view}&range=${dateRange}`);
    // return await response.json();
    
    // Return beautiful mock data based on selected service
    const multiplier = view === 'Flights' ? 1.2 : view === 'Hotels' ? 0.9 : view === 'CarRentals' ? 0.6 : 1;
    
    return {
      stats: [
        { 
          label: 'Total Revenue', 
          value: `$${(1284500 * multiplier).toLocaleString()}`, 
          change: '+12.5%', 
          color: 'text-emerald-600', 
          bgColor: 'bg-emerald-50',
          icon: '💰' 
        },
        { 
          label: 'Total Bookings', 
          value: Math.round(42890 * multiplier).toLocaleString(), 
          change: '+8.25%', 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          icon: '📊' 
        },
        { 
          label: 'Active Users', 
          value: '12,405', 
          change: '+8.4%', 
          color: 'text-purple-600', 
          bgColor: 'bg-purple-50',
          icon: '👥' 
        },
        { 
          label: 'Conversion Rate', 
          value: '3.2%', 
          change: '+2.1%', 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50',
          icon: '🎯' 
        },
      ],
      bookingCategories: [
        { type: 'Flight', percentage: view === 'Flights' ? 100 : view === 'Hotels' ? 0 : view === 'CarRentals' ? 0 : 45, color: '#33a8da', value: view === 'Flights' ? 18450 : view === 'Hotels' ? 0 : view === 'CarRentals' ? 0 : 19300, icon: '✈️' },
        { type: 'Hotels', percentage: view === 'Hotels' ? 100 : view === 'Flights' ? 0 : view === 'CarRentals' ? 0 : 40, color: '#f59e0b', value: view === 'Hotels' ? 14230 : view === 'Flights' ? 0 : view === 'CarRentals' ? 0 : 17156, icon: '🏨' },
        { type: 'Car Rentals', percentage: view === 'CarRentals' ? 100 : view === 'Flights' ? 0 : view === 'Hotels' ? 0 : 15, color: '#10b981', value: view === 'CarRentals' ? 6210 : view === 'Flights' ? 0 : view === 'Hotels' ? 0 : 6434, icon: '🚗' },
      ],
      topLocations: [
        { 
          name: view === 'Flights' ? 'London, UK' : view === 'Hotels' ? 'Paris, France' : view === 'CarRentals' ? 'Los Angeles, USA' : 'London, UK', 
          bookings: view === 'Flights' ? 1200 : view === 'Hotels' ? 850 : view === 'CarRentals' ? 650 : 1200, 
          revenue: view === 'Flights' ? '$450,000' : view === 'Hotels' ? '$320,000' : view === 'CarRentals' ? '$245,000' : '$450,000', 
          growth: '+15%', 
          flag: '🇬🇧',
          color: 'from-blue-500 to-cyan-500'
        },
        { 
          name: view === 'Flights' ? 'New York, USA' : view === 'Hotels' ? 'Dubai, UAE' : view === 'CarRentals' ? 'Miami, USA' : 'New York, USA', 
          bookings: view === 'Flights' ? 850 : view === 'Hotels' ? 650 : view === 'CarRentals' ? 450 : 850, 
          revenue: view === 'Flights' ? '$320,000' : view === 'Hotels' ? '$245,000' : view === 'CarRentals' ? '$180,000' : '$320,000', 
          growth: '+12%', 
          flag: '🇺🇸',
          color: 'from-purple-500 to-pink-500'
        },
        { 
          name: view === 'Flights' ? 'Dubai, UAE' : view === 'Hotels' ? 'Tokyo, Japan' : view === 'CarRentals' ? 'Chicago, USA' : 'Dubai, UAE', 
          bookings: view === 'Flights' ? 650 : view === 'Hotels' ? 550 : view === 'CarRentals' ? 350 : 650, 
          revenue: view === 'Flights' ? '$245,000' : view === 'Hotels' ? '$210,000' : view === 'CarRentals' ? '$145,000' : '$245,000', 
          growth: '+25%', 
          flag: '🇦🇪',
          color: 'from-amber-500 to-orange-500'
        },
      ],
      revenueData: (() => {
        const baseData = [
          { month: 'Jan', value: 45000, previousYear: 38000 },
          { month: 'Feb', value: 52000, previousYear: 41000 },
          { month: 'Mar', value: 48000, previousYear: 43000 },
          { month: 'Apr', value: 61000, previousYear: 47000 },
          { month: 'May', value: 58000, previousYear: 49000 },
          { month: 'Jun', value: 63000, previousYear: 52000 },
          { month: 'Jul', value: 67000, previousYear: 54000 },
          { month: 'Aug', value: 72000, previousYear: 56000 },
          { month: 'Sep', value: 68000, previousYear: 58000 },
          { month: 'Oct', value: 75000, previousYear: 61000 },
          { month: 'Nov', value: 79000, previousYear: 63000 },
          { month: 'Dec', value: 85000, previousYear: 65000 },
        ];
        
        return baseData.map(item => ({
          ...item,
          value: Math.round(item.value * multiplier),
          previousYear: Math.round(item.previousYear * multiplier * 0.85)
        }));
      })(),
    };
  };

  const fetchBookings = async (): Promise<Booking[]> => {
    // TODO: Implement actual API call
    return [
      { id: '#LND-8824', type: 'Flight', source: 'Air Peace', customer: 'John Dane', price: '$450.00', status: 'Confirmed', date: 'Jan 15, 2026' },
      { id: '#LND-8830', type: 'Hotel', source: 'Marriott', customer: 'Michael Smith', price: '$550.00', status: 'Confirmed', date: 'Jan 10, 2026' },
      { id: '#LND-8844', type: 'Car Rental', source: 'Hertz', customer: 'Robert Brown', price: '$350.00', status: 'Cancelled', date: 'Jan 27, 2026' },
      { id: '#LND-9012', type: 'Flight', source: 'Qatar Airways', customer: 'Sarah Jenkins', price: '$1,200.00', status: 'Confirmed', date: 'Feb 02, 2026' },
    ];
  };

  const fetchUsers = async (): Promise<User[]> => {
    // TODO: Implement actual API call
    return [
      { id: 'u1', name: 'John Dane', email: 'johndane@example.com', registered: 'Jan 12, 2024', booking: 12, points: '15,200', status: 'Active' },
      { id: 'u2', name: 'Michael Smith', email: 'michael@smith.io', registered: 'Feb 05, 2024', booking: 3, points: '2,400', status: 'Active' },
      { id: 'u3', name: 'Sarah Jenkins', email: 'sarah.j@outlook.com', registered: 'Mar 10, 2024', booking: 15, points: '22,100', status: 'Suspended' },
    ];
  };

  const fetchCoupons = async (): Promise<Coupon[]> => {
    // TODO: Implement actual API call
    return [
      { id: 'c1', customer: 'John Dane', code: 'WINTER20', expiry: '2026-12-30', minSpend: '$50.00', type: 'Flight', status: 'Active' },
      { id: 'c2', customer: 'Anna Lee', code: 'SAVE50', expiry: '2024-01-12', minSpend: '$100.00', type: 'Hotel', status: 'Expired' },
    ];
  };

  // CRUD Operations - These will be implemented with your API endpoints
  const createBooking = async (bookingData: any) => {
    // TODO: Implement API call
  };

  const updateBooking = async (id: string, bookingData: any) => {
    // TODO: Implement API call
  };

  const deleteBooking = async (id: string) => {
    // TODO: Implement API call
  };

  const createUser = async (userData: any) => {
    // TODO: Implement API call
  };

  const updateUser = async (id: string, userData: any) => {
    // TODO: Implement API call
  };

  const deleteUser = async (id: string) => {
    // TODO: Implement API call
  };

  const createCoupon = async (couponData: any) => {
    // TODO: Implement API call
  };

  const updateCoupon = async (id: string, couponData: any) => {
    // TODO: Implement API call
  };

  const deleteCoupon = async (id: string) => {
    // TODO: Implement API call
  };

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
      headers.join(','),
      ...data.map(row => 
        headers.map(fieldName => {
          const value = String(row[fieldName] || '');
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

// Handlers - Update these to use API calls
const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const newUser = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    role: formData.get('role') as string,
  };
  
  try {
    // Mock implementation with role
    const mockUser = {
      id: `u${Date.now()}`,
      ...newUser,
      registered: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      booking: 0,
      points: '0',
      status: 'Active',
      role: newUser.role
    };
    setUsers([mockUser, ...users]);
    
    setActiveView('UserManagement');
    setIsMobileMenuOpen(false);
    alert(`User created successfully with role: ${newUser.role}`);
  } catch (error) {
    alert('Failed to create user. Please try again.');
  }
};

  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    const price = currency.symbol === '$' 
      ? `$${parseInt(createBookingData.baseFare).toLocaleString()}.00`
      : `NGN ${parseInt(createBookingData.baseFare).toLocaleString()}`;

    const newBooking = {
      type: serviceType,
      source: createBookingData.provider || 'Manual Entry',
      customer: customerName,
      price: price,
      departureDate: createBookingData.departureDate,
      returnDate: createBookingData.returnDate,
      fromLocation: createBookingData.fromLocation,
      toLocation: createBookingData.toLocation
    };
    
    try {
      // Mock implementation
      const mockBooking = {
        id: `#EB-${Math.floor(1000 + Math.random() * 9000)}`,
        ...newBooking,
        status: 'Confirmed',
        date: createBookingData.departureDate 
          ? new Date(createBookingData.departureDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      };
      
      setBookings([mockBooking, ...bookings]);
      
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
      setIsMobileMenuOpen(false);
      
      alert(`Booking created successfully!\nBooking ID: ${mockBooking.id}`);
    } catch (error) {
      alert('Failed to create booking. Please try again.');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCoupon = {
      customer: formData.get('customer') as string,
      code: formData.get('code') as string,
      expiry: formData.get('expiry') as string,
      minSpend: `$${formData.get('minSpend')}`,
    };
    
    try {
      // Mock implementation
      const mockCoupon = {
        id: `c${Date.now()}`,
        ...newCoupon,
        type: 'All',
        status: 'Active'
      };
      
      setCoupons([mockCoupon, ...coupons]);
      setShowCouponModal(false);
      alert('Coupon created successfully!');
    } catch (error) {
      alert('Failed to create coupon. Please try again.');
    }
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setActiveView('UserProfile');
    setIsMobileMenuOpen(false);
  };

  const handleViewBooking = (booking: any) => {
    setSelectedBooking(booking);
    setActiveView('BookingDetails');
    setIsMobileMenuOpen(false);
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
      const imageUrl = URL.createObjectURL(file);
      setProfileData(prev => ({ ...prev, profileImage: imageUrl }));
      alert('Profile image updated successfully!');
    }
  };

  const handleSaveProfile = () => {
    // TODO: Implement API call to save profile
    alert('Profile saved successfully!');
  };

  // Service Tabs Component
  const renderServiceTabs = () => (
    <div className="flex items-center gap-2 p-1 bg-white rounded-2xl shadow-sm border border-gray-100 w-fit mb-8">
      {[
        { id: 'Flights', label: 'Flights', icon: '✈️', color: 'from-blue-500 to-cyan-500' },
        { id: 'Hotels', label: 'Hotels', icon: '🏨', color: 'from-amber-500 to-orange-500' },
        { id: 'CarRentals', label: 'Car Rentals', icon: '🚗', color: 'from-emerald-500 to-teal-500' },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            setActiveView(tab.id as AdminView);
            setActiveServiceTab(tab.id as 'Flights' | 'Hotels' | 'CarRentals');
          }}
          className={`relative flex items-center gap-3 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
            activeView === tab.id
              ? 'text-white shadow-lg'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {activeView === tab.id && (
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.color} animate-gradient`} />
          )}
          <span className="relative z-10 text-lg">{tab.icon}</span>
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );

  // Header Component with Logo, Search, and Profile
  const renderHeader = () => (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
      <div className="px-4 md:px-8 py-3 flex items-center justify-between">
        {/* Left side - Mobile menu button and logo */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          {/* Logo with gradient */}
          <div className="relative group">
            <div className="absolute " />
            <div className="relative w-12 h-12 md:w-14 md:h-14 ">
              <Image
                src="/images/logo1.png"
                alt="Ebony Bruce Travels Logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
          </div>
        </div>

        {/* Center - Search bar with gradient focus */}
        <div className="hidden md:flex items-center flex-1 max-w-2xl mx-8">
          <div className="relative w-full group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da]/20 to-[#2c8fc0]/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center">
              <svg className="w-5 h-5 text-gray-400 absolute left-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${activeView === 'UserManagement' ? 'users' : activeView === 'Bookings' ? 'bookings' : 'dashboard'}...`} 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Right side - Profile with gradient */}
        <div className="flex items-center gap-4">
          <div 
            className="relative group cursor-pointer"
            onClick={() => setActiveView('PersonalDetails')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da]/20 to-[#2c8fc0]/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 transition">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-gray-900">{profileData.displayName}</p>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] p-0.5 shadow-lg">
                <div className="w-full h-full rounded-xl bg-white overflow-hidden">
                  <img src={profileData.profileImage} className="w-full h-full object-cover" alt="Profile" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
          />
        </div>
      </div>
    </header>
  );

  // Desktop Navigation Sidebar
  const renderDesktopNav = () => (
    <aside className="hidden md:block w-72 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex-col h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
      <nav className="p-6 space-y-2">
        {/* Service Quick Access */}
        <div className="mb-6">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Services</p>
          <div className="space-y-1">
            {[
              { id: 'Flights', label: 'Flights', icon: '✈️', gradient: 'from-blue-500 to-cyan-500' },
              { id: 'Hotels', label: 'Hotels', icon: '🏨', gradient: 'from-amber-500 to-orange-500' },
              { id: 'CarRentals', label: 'Car Rentals', icon: '🚗', gradient: 'from-emerald-500 to-teal-500' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { 
                  setActiveView(item.id as AdminView); 
                  setActiveServiceTab(item.id as 'Flights' | 'Hotels' | 'CarRentals');
                  setSearchTerm('');
                }}
                className={`relative w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                  activeView === item.id ? 'shadow-lg' : 'hover:shadow-md'
                }`}
              >
                {activeView === item.id && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                )}
                <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className={`relative flex items-center gap-3 px-4 py-3 ${
                  activeView === item.id ? 'text-white' : 'text-gray-600'
                }`}>
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="mb-6 pt-4 border-t border-gray-100">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Main</p>
          <div className="space-y-1">
            {[
              { id: 'Analytics', label: 'Analytics', icon: '📊', gradient: 'from-purple-500 to-pink-500' },
              { id: 'Bookings', label: 'Bookings', icon: '📅', gradient: 'from-blue-500 to-cyan-500' },
              { id: 'UserManagement', label: 'Users', icon: '👥', gradient: 'from-green-500 to-emerald-500' },
              { id: 'Coupons', label: 'Coupons', icon: '🏷️', gradient: 'from-amber-500 to-orange-500' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id as AdminView); setSearchTerm(''); }}
                className={`relative w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                  activeView === item.id || (activeView === 'CreateBooking' && item.id === 'Bookings') 
                    ? 'shadow-lg' 
                    : 'hover:shadow-md'
                }`}
              >
                {(activeView === item.id || (activeView === 'CreateBooking' && item.id === 'Bookings')) && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                )}
                <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className={`relative flex items-center gap-3 px-4 py-3 ${
                  activeView === item.id || (activeView === 'CreateBooking' && item.id === 'Bookings') 
                    ? 'text-white' 
                    : 'text-gray-600'
                }`}>
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Admin Account */}
        <div className="pt-4 border-t border-gray-100">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account</p>
          <div className="space-y-1">
            {[
              { id: 'PersonalDetails', label: 'Profile', icon: '👤', gradient: 'from-blue-500 to-cyan-500' },
              { id: 'Security', label: 'Security', icon: '🛡️', gradient: 'from-purple-500 to-pink-500' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as AdminView)}
                className={`relative w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                  activeView === item.id ? 'shadow-lg' : 'hover:shadow-md'
                }`}
              >
                {activeView === item.id && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                )}
                <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className={`relative flex items-center gap-3 px-4 py-3 ${
                  activeView === item.id ? 'text-white' : 'text-gray-600'
                }`}>
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pt-6 mt-6 border-t border-gray-100">
          <button 
            onClick={onLogout} 
            className="relative w-full group overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3 px-4 py-3 text-gray-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium text-sm">Sign Out</span>
            </div>
          </button>
        </div>
      </nav>
    </aside>
  );

  // Mobile Navigation Sidebar
  const renderMobileNav = () => (
    <>
      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-80 bg-white/95 backdrop-blur-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] rounded-2xl blur-lg opacity-50" />
              <div className="relative w-full h-full bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] rounded-2xl p-2 shadow-lg">
                <Image
                  src="/images/logo1.png"
                  alt="Ebony Bruce Travels Logo"
                  fill
                  className="object-contain p-1"
                  priority
                />
              </div>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl hover:bg-gray-100 transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
          {/* Service Quick Access */}
          <div className="mb-6">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Services</p>
            <div className="space-y-1">
              {[
                { id: 'Flights', label: 'Flights', icon: '✈️', gradient: 'from-blue-500 to-cyan-500' },
                { id: 'Hotels', label: 'Hotels', icon: '🏨', gradient: 'from-amber-500 to-orange-500' },
                { id: 'CarRentals', label: 'Car Rentals', icon: '🚗', gradient: 'from-emerald-500 to-teal-500' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { 
                    setActiveView(item.id as AdminView); 
                    setActiveServiceTab(item.id as 'Flights' | 'Hotels' | 'CarRentals');
                    setSearchTerm('');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`relative w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                    activeView === item.id ? 'shadow-lg' : 'hover:shadow-md'
                  }`}
                >
                  {activeView === item.id && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`relative flex items-center gap-3 px-4 py-3 ${
                    activeView === item.id ? 'text-white' : 'text-gray-600'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Navigation */}
          <div className="mb-6 pt-4 border-t border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Main</p>
            <div className="space-y-1">
              {[
                { id: 'Analytics', label: 'Analytics', icon: '📊', gradient: 'from-purple-500 to-pink-500' },
                { id: 'Bookings', label: 'Bookings', icon: '📅', gradient: 'from-blue-500 to-cyan-500' },
                { id: 'UserManagement', label: 'Users', icon: '👥', gradient: 'from-green-500 to-emerald-500' },
                { id: 'Coupons', label: 'Coupons', icon: '🏷️', gradient: 'from-amber-500 to-orange-500' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { 
                    setActiveView(item.id as AdminView); 
                    setSearchTerm('');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`relative w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                    activeView === item.id || (activeView === 'CreateBooking' && item.id === 'Bookings') 
                      ? 'shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                >
                  {(activeView === item.id || (activeView === 'CreateBooking' && item.id === 'Bookings')) && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`relative flex items-center gap-3 px-4 py-3 ${
                    activeView === item.id || (activeView === 'CreateBooking' && item.id === 'Bookings') 
                      ? 'text-white' 
                      : 'text-gray-600'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Admin Account */}
          <div className="pt-4 border-t border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account</p>
            <div className="space-y-1">
              {[
                { id: 'PersonalDetails', label: 'Profile', icon: '👤', gradient: 'from-blue-500 to-cyan-500' },
                { id: 'Security', label: 'Security', icon: '🛡️', gradient: 'from-purple-500 to-pink-500' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { 
                    setActiveView(item.id as AdminView);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`relative w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                    activeView === item.id ? 'shadow-lg' : 'hover:shadow-md'
                  }`}
                >
                  {activeView === item.id && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`relative flex items-center gap-3 px-4 py-3 ${
                    activeView === item.id ? 'text-white' : 'text-gray-600'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="pt-6 mt-6 border-t border-gray-100">
            <button 
              onClick={() => {
                onLogout();
                setIsMobileMenuOpen(false);
              }} 
              className="relative w-full group overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3 px-4 py-3 text-gray-600 group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium text-sm">Sign Out</span>
              </div>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );

  // Loading Component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-64">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#33a8da] rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );

  // Analytics View with Beautiful Charts
  const renderAnalytics = () => {
    if (isLoading.analytics) return <LoadingSpinner />;
    
    // Prepare chart data
    const lineChartData = {
      labels: revenueData.map(d => d.month),
      datasets: [
        {
          label: 'This Year',
          data: revenueData.map(d => d.value),
          borderColor: '#33a8da',
          backgroundColor: 'rgba(51, 168, 218, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#33a8da',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Last Year',
          data: revenueData.map(d => d.previousYear),
          borderColor: '#94a3b8',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };

    const lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            boxWidth: 6,
            boxHeight: 6,
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'white',
          titleColor: '#1e293b',
          bodyColor: '#475569',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: '#e2e8f0',
            drawBorder: false,
          },
          ticks: {
            callback: (value: any) => `$${value/1000}k`,
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    };

    const doughnutData = {
      labels: bookingCategories.map(c => c.type),
      datasets: [
        {
          data: bookingCategories.map(c => c.percentage),
          backgroundColor: bookingCategories.map(c => c.color),
          borderColor: 'white',
          borderWidth: 3,
          hoverOffset: 15,
        },
      ],
    };

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            padding: 20,
          },
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#1e293b',
          bodyColor: '#475569',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value}% (${percentage}%)`;
            },
          },
        },
      },
      cutout: '70%',
    };

    // Get title based on active view
    const getTitle = () => {
      switch(activeView) {
        case 'Flights': return 'Flight Analytics';
        case 'Hotels': return 'Hotel Analytics';
        case 'CarRentals': return 'Car Rental Analytics';
        default: return 'Global Analytics';
      }
    };

    const totalRevenue = stats[0].value;
    const totalBookings = stats[1].value;
    const activeUsers = stats[2].value;
    const conversionRate = stats[3].value;

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        {/* Header with title and actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {getTitle()}
            </h1>
            <p className="text-gray-500 mt-2">Comprehensive overview of your business performance</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button 
              onClick={() => downloadCSV(stats, `ebony-bruce-${activeView.toLowerCase()}-analytics`)}
              className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
            </button>
          </div>
        </div>

        {/* Service Tabs */}
        {(activeView === 'Analytics' || activeView === 'Flights' || activeView === 'Hotels' || activeView === 'CarRentals') && (
          renderServiceTabs()
        )}

        {/* Stats Grid with beautiful cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center text-2xl`}>
                    {stat.icon}
                  </div>
                  <span className={`text-sm font-semibold ${stat.color} bg-opacity-10 ${stat.bgColor} px-3 py-1 rounded-full`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
                <p className="text-sm text-gray-500">Monthly revenue comparison</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#33a8da]" />
                  <span className="text-xs text-gray-600">2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-xs text-gray-600">2025</span>
                </div>
              </div>
            </div>
            <div className="h-80">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>

          {/* Booking Distribution - Takes 1 column */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Distribution</h3>
            <p className="text-sm text-gray-500 mb-6">Breakdown by service type</p>
            <div className="h-64">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* Bottom Grid - Top Locations and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Locations */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Locations</h3>
            <div className="space-y-4">
              {topLocations.map((location, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${location.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  <div className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl">
                          {location.flag}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{location.name}</h4>
                          <p className="text-sm text-gray-500">{location.bookings.toLocaleString()} bookings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{location.revenue}</p>
                        <p className="text-sm text-emerald-600 font-medium">{location.growth}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-600">Live</span>
              </span>
            </div>
            
            <div className="space-y-4">
              {[
                {
                  icon: '✈️',
                  title: 'New Booking',
                  description: 'John Doe booked a flight to London',
                  time: '2 minutes ago',
                  color: 'from-blue-500 to-cyan-500',
                },
                {
                  icon: '👤',
                  title: 'New User',
                  description: 'Sarah Jenkins registered',
                  time: '15 minutes ago',
                  color: 'from-green-500 to-emerald-500',
                },
                {
                  icon: '🏷️',
                  title: 'Coupon Used',
                  description: 'WINTER20 applied to booking #LND-8824',
                  time: '1 hour ago',
                  color: 'from-amber-500 to-orange-500',
                },
                {
                  icon: '🏨',
                  title: 'Hotel Booking',
                  description: 'Marriott reservation confirmed',
                  time: '3 hours ago',
                  color: 'from-purple-500 to-pink-500',
                },
              ].map((activity, index) => (
                <div key={index} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-start gap-3 p-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activity.color} bg-opacity-10 flex items-center justify-center text-lg`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-3 text-sm font-medium text-[#33a8da] hover:text-[#2c8fc0] border-t border-gray-100 hover:bg-gray-50 transition rounded-b-2xl">
              View All Activity
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Personal Details View
  const renderPersonalDetails = () => (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Profile Settings
          </h1>
          <p className="text-gray-500 mt-2">Manage your account information and preferences</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <div className="flex flex-col md:flex-row items-center gap-8 pb-8 mb-8 border-b border-gray-100">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] p-1 shadow-xl">
                <div className="w-full h-full rounded-2xl bg-white overflow-hidden">
                  <img src={profileData.profileImage} className="w-full h-full object-cover" alt="Profile" />
                </div>
              </div>
              <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                />
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{profileData.displayName}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="px-4 py-1.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white text-sm font-medium rounded-full">
                  Super Admin
                </span>
                <span className="text-sm text-gray-400">ID: #ADM-4421-XB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Display Name', field: 'displayName' as keyof typeof profileData, value: profileData.displayName },
              { label: 'Admin Email', field: 'adminEmail' as keyof typeof profileData, value: profileData.adminEmail },
              { label: 'Primary Terminal', field: 'primaryTerminal' as keyof typeof profileData, value: profileData.primaryTerminal },
              { label: 'Authorization Level', field: 'authorizationLevel' as keyof typeof profileData, value: profileData.authorizationLevel },
            ].map(({ label, field, value }) => (
              <div key={field} className="group">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{label}</label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center group-hover:border-[#33a8da] transition-all">
                  <span className="text-sm font-medium text-gray-900">{value}</span>
                  <button 
                    onClick={() => handleProfileEdit(field)}
                    className="text-xs text-[#33a8da] opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Multi-Factor Authentication Active</p>
                <p className="text-xs text-gray-500">Your account has enhanced security</p>
              </div>
            </div>
            <button 
              onClick={handleSaveProfile}
              className="px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-medium text-sm hover:shadow-xl hover:scale-105 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Bookings Table View
  const renderBookings = () => {
    if (isLoading.bookings) return <LoadingSpinner />;
    
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Bookings
            </h1>
            <p className="text-gray-500 mt-2">Manage and track all platform bookings</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => downloadCSV(filteredBookings, 'ebony-bruce-bookings')}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button onClick={() => setActiveView('CreateBooking')} className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4v16m8-8H4" />
              </svg>
              New Booking
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {['All', 'Confirmed', 'Cancelled'].map(status => (
                  <button 
                    key={status} 
                    onClick={() => setBookingStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      bookingStatusFilter === status 
                        ? 'bg-white text-[#33a8da] shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-500 ml-auto">
                {filteredBookings.length} bookings found
              </span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.length > 0 ? filteredBookings.map((booking, i) => (
                  <tr 
                    key={i} 
                    onClick={() => handleViewBooking(booking)}
                    className="hover:bg-gray-50 transition cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[#33a8da]">{booking.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white text-xs font-bold">
                          {booking.customer.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{booking.customer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">{booking.price}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'Confirmed' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{booking.date}</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Create Booking Form View
  const renderCreateBooking = () => {
    const filteredSearchUsers = users.filter(user =>
      user.name.toLowerCase().includes(createBookingData.customerSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(createBookingData.customerSearch.toLowerCase())
    );

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => setActiveView('Bookings')} 
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="text-sm font-medium">Back to Bookings</span>
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Create New Booking
              </h1>
              <p className="text-gray-500 mt-2">Fill in the details to create a reservation</p>
            </div>
            <button 
              onClick={handleRefreshCreateBooking}
              className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Form
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Service Type */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Service Type</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'Flight', label: 'Flight', icon: '✈️', gradient: 'from-blue-500 to-cyan-500' },
                    { id: 'Hotel', label: 'Hotel', icon: '🏨', gradient: 'from-amber-500 to-orange-500' },
                    { id: 'Car Rental', label: 'Car', icon: '🚗', gradient: 'from-emerald-500 to-teal-500' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setServiceType(item.id as any)}
                      className={`relative group overflow-hidden rounded-xl transition-all duration-300 ${
                        serviceType === item.id ? 'shadow-lg scale-105' : 'hover:shadow-md'
                      }`}
                    >
                      {serviceType === item.id && (
                        <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                      )}
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                      <div className={`relative p-4 text-center ${
                        serviceType === item.id ? 'text-white' : 'text-gray-600'
                      }`}>
                        <span className="text-3xl mb-2 block">{item.icon}</span>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">2. Customer Information</h3>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCustomerType('Existing User')}
                      className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                        customerType === 'Existing User'
                          ? 'bg-white text-[#33a8da] shadow-sm'
                          : 'text-gray-500'
                      }`}
                    >
                      Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerType('New Guest')}
                      className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                        customerType === 'New Guest'
                          ? 'bg-white text-[#33a8da] shadow-sm'
                          : 'text-gray-500'
                      }`}
                    >
                      New Guest
                    </button>
                  </div>
                </div>

                {customerType === 'Existing User' ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={createBookingData.customerSearch}
                        onChange={(e) => setCreateBookingData(prev => ({ ...prev, customerSearch: e.target.value }))}
                        placeholder="Search by name or email..."
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                      />
                    </div>

                    {createBookingData.customerSearch && filteredSearchUsers.length > 0 && (
                      <div className="bg-gray-50 rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
                        {filteredSearchUsers.map(user => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleCustomerSearchSelect(user)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white transition text-left border-b last:border-0 border-gray-100"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white text-xs font-bold">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={createBookingData.customerName}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Full name"
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                    <input
                      type="email"
                      value={createBookingData.customerEmail}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="Email address"
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                )}
              </div>

              {/* Trip Details */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Trip Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">From</label>
                    <input
                      type="text"
                      value={createBookingData.fromLocation}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, fromLocation: e.target.value }))}
                      placeholder="Departure city"
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">To</label>
                    <input
                      type="text"
                      value={createBookingData.toLocation}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, toLocation: e.target.value }))}
                      placeholder="Arrival city"
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Departure</label>
                    <input
                      type="date"
                      value={createBookingData.departureDate}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, departureDate: e.target.value }))}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Return</label>
                    <input
                      type="date"
                      value={createBookingData.returnDate}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, returnDate: e.target.value }))}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Provider</label>
                    <select
                      value={createBookingData.provider}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, provider: e.target.value }))}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    >
                      <option value="">Select provider</option>
                      <option value="airpeace">Air Peace</option>
                      <option value="qatar">Qatar Airways</option>
                      <option value="emirates">Emirates</option>
                      <option value="marriott">Marriott</option>
                      <option value="hilton">Hilton</option>
                      <option value="hertz">Hertz</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Booking Summary</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-500">Base Fare</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {currency.symbol === '$' ? '$' : 'NGN '}
                        {parseInt(createBookingData.baseFare).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newFare = prompt('Enter base fare:', createBookingData.baseFare);
                          if (newFare && !isNaN(Number(newFare))) {
                            setCreateBookingData(prev => ({ ...prev, baseFare: newFare }));
                          }
                        }}
                        className="text-xs text-[#33a8da] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-500">Taxes & Fees</span>
                    <select
                      value={createBookingData.taxesFees}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, taxesFees: e.target.value }))}
                      className="text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none"
                    >
                      <option value="included">Included</option>
                      <option value="additional">Additional</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-500">Baggage</span>
                    <select
                      value={createBookingData.baggage}
                      onChange={(e) => setCreateBookingData(prev => ({ ...prev, baggage: e.target.value }))}
                      className="text-sm font-medium text-[#33a8da] bg-transparent border-none focus:outline-none"
                    >
                      <option value="Free">Free</option>
                      <option value="Paid">Paid</option>
                      <option value="Extra">Extra</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-[#33a8da]">
                        {currency.symbol === '$' ? '$' : 'NGN '}
                        {parseInt(createBookingData.baseFare).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <p className="text-xs text-gray-500 mb-3">Payment Method</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CREDIT CARD')}
                        className={`py-3 rounded-xl text-xs font-medium border transition-all ${
                          paymentMethod === 'CREDIT CARD'
                            ? 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white border-transparent shadow-lg'
                            : 'border-gray-200 text-gray-500 hover:border-[#33a8da]'
                        }`}
                      >
                        Credit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('BANK TRANSFER')}
                        className={`py-3 rounded-xl text-xs font-medium border transition-all ${
                          paymentMethod === 'BANK TRANSFER'
                            ? 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white border-transparent shadow-lg'
                            : 'border-gray-200 text-gray-500 hover:border-[#33a8da]'
                        }`}
                      >
                        Bank Transfer
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateBookingSubmit}
                    disabled={
                      !createBookingData.provider ||
                      (customerType === 'New Guest' && !createBookingData.customerEmail) ||
                      (customerType === 'Existing User' && !createBookingData.customerSearch)
                    }
                    className={`w-full py-4 rounded-xl font-medium transition-all mt-4 ${
                      !createBookingData.provider ||
                      (customerType === 'New Guest' && !createBookingData.customerEmail) ||
                      (customerType === 'Existing User' && !createBookingData.customerSearch)
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white hover:shadow-lg hover:shadow-[#33a8da]/25'
                    }`}
                  >
                    Confirm Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // User Management View
  const renderUserManagement = () => {
    if (isLoading.users) return <LoadingSpinner />;
    
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Users
            </h1>
            <p className="text-gray-500 mt-2">Manage platform users and permissions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => downloadCSV(filteredUsers, 'ebony-bruce-users')}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button onClick={() => setActiveView('AddUser')} className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {['All users', 'Active Only', 'Suspended'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setUserStatusFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      userStatusFilter === filter
                        ? 'bg-white text-[#33a8da] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-500 ml-auto">
                {filteredUsers.length} users found
              </span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookings</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length > 0 ? filteredUsers.map((user, i) => (
                  <tr
                    key={i}
                    onClick={() => handleViewUser(user)}
                    className="hover:bg-gray-50 transition cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{user.registered}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{user.booking}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[#33a8da]">{user.points}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

// Add User Form View
const renderAddUser = () => (
  <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={() => setActiveView('UserManagement')} 
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
      >
        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <span className="text-sm font-medium">Back to Users</span>
      </button>
      
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Create Identity
        </h1>
        <p className="text-gray-500 mt-2">Onboard a new platform user</p>
      </div>
      
      <form onSubmit={handleAddUser} className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <input 
            name="name" 
            required 
            type="text" 
            placeholder="John Doe" 
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input 
            name="email" 
            required 
            type="email" 
            placeholder="john@example.com" 
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <div className="relative">
            <select 
              name="role" 
              required
              defaultValue="user"
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] appearance-none cursor-pointer"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="w-full py-4 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all"
        >
          Create User
        </button>
      </form>
    </div>
  </div>
);

  // Coupons View
  const renderCoupons = () => {
    if (isLoading.coupons) return <LoadingSpinner />;
    
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Coupons
            </h1>
            <p className="text-gray-500 mt-2">Manage promotional campaigns</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => downloadCSV(filteredCoupons, 'ebony-bruce-coupons')}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button onClick={() => setShowCouponModal(true)} className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4v16m8-8H4" />
              </svg>
              New Coupon
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {['All', 'Active', 'Expired'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setCouponStatusFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      couponStatusFilter === filter
                        ? 'bg-white text-[#33a8da] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-500 ml-auto">
                {filteredCoupons.length} coupons found
              </span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Min Spend</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCoupons.length > 0 ? filteredCoupons.map((coupon, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{coupon.customer}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-[#33a8da]">{coupon.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{coupon.expiry}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{coupon.minSpend}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        coupon.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {coupon.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No coupons found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // User Profile View
  const renderUserProfile = () => (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <button 
        onClick={() => setActiveView('UserManagement')} 
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
      >
        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <span className="text-sm font-medium">Back to Users</span>
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 text-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4 shadow-lg">
              {selectedUser?.name[0]}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{selectedUser?.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{selectedUser?.email}</p>
            
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4">
              <div>
                <p className="text-lg font-bold text-gray-900">{selectedUser?.booking}</p>
                <p className="text-xs text-gray-500">Bookings</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[#33a8da]">{selectedUser?.points}</p>
                <p className="text-xs text-gray-500">Points</p>
              </div>
              <div>
                <p className={`text-sm font-semibold ${
                  selectedUser?.status === 'Active' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {selectedUser?.status}
                </p>
                <p className="text-xs text-gray-500">Status</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Internal Notes</h3>
            <textarea 
              placeholder="Add a private note about this user..." 
              className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
            />
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white text-lg">
                    ✈️
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Flight Booking Confirmed</p>
                    <p className="text-xs text-gray-500 mt-1">Ref: #BK-9421{i} • Jan 2026</p>
                  </div>
                  <span className="text-xs text-gray-400">2 hours ago</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-4">
            <button className="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all">
              Suspend User
            </button>
            <button className="flex-1 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all">
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Security Settings View
  const renderSecurity = () => (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Security
          </h1>
          <p className="text-gray-500 mt-2">Manage your account security settings</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl mb-4 text-white">
              🔐
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 mb-6">Add an extra layer of security to your account</p>
            <button 
              onClick={() => setShow2FAModal(true)} 
              className="w-full py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all"
            >
              Enable 2FA
            </button>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-3xl mb-4 text-white">
              🔑
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Password</h3>
            <p className="text-sm text-gray-500 mb-6">Update your password regularly</p>
            <button className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all">
              Change Password
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl mb-4 text-white">
              📱
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Active Sessions</h3>
            <p className="text-sm text-gray-500 mb-6">Manage your logged-in devices</p>
            <button className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all">
              View Sessions
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-3xl mb-4 text-white">
              📋
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Activity Log</h3>
            <p className="text-sm text-gray-500 mb-6">Review your account activity</p>
            <button className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all">
              View Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    switch(activeView) {
      case 'Analytics':
      case 'Flights':
      case 'Hotels':
      case 'CarRentals':
        return renderAnalytics();
      case 'Bookings':
        return renderBookings();
      case 'UserManagement':
        return renderUserManagement();
      case 'Coupons':
        return renderCoupons();
      case 'AddUser':
        return renderAddUser();
      case 'CreateBooking':
        return renderCreateBooking();
      case 'PersonalDetails':
        return renderPersonalDetails();
      case 'UserProfile':
        return renderUserProfile();
      case 'Security':
        return renderSecurity();
      default:
        return renderAnalytics();
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      {/* Header with Logo, Search, and Profile */}
      {renderHeader()}
      
      <div className="flex flex-1">
        {/* Desktop Navigation Sidebar */}
        {renderDesktopNav()}
        
        {/* Mobile Navigation Menu */}
        {renderMobileNav()}
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <form onSubmit={handleCreateCoupon}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Coupon</h2>
                  <p className="text-sm text-gray-500 mt-1">Generate a new promotional code</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Customer</label>
                  <input
                    name="customer"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code</label>
                  <input
                    name="code"
                    required
                    placeholder="SUMMER2024"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-[#33a8da] focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                    <input
                      name="expiry"
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Spend ($)</label>
                    <input
                      name="minSpend"
                      required
                      type="number"
                      placeholder="50"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            {faStep === 'otp' ? (
              <>
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-4xl mx-auto mb-6 text-white">
                    📱
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Enter the 6-digit code from your authenticator app
                  </p>

                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        className="w-12 h-12 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setFaStep('success')}
                    className="w-full py-4 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all"
                  >
                    Verify
                  </button>

                  <button className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition">
                    Resend Code
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-4xl mx-auto mb-6 text-white">
                  ✅
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">2FA Enabled!</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Two-factor authentication has been successfully activated
                </p>
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="w-full py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;