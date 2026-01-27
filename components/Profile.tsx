'use client';
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../app/page';
import ManageBookingModal from './ManageBookingModal';
import { useLanguage } from '../context/LanguageContext';
import CancelBooking from './CancelBooking'; 
import { userApi, ApiError } from '../lib/api';

interface ProfileProps {
  user: User;
  activeTab?: string;
  onUpdateUser: (data: Partial<User>) => void;
  onBack: () => void;
  onSignOut: () => void;
  onBookItem: (item: any) => void;
  onCancelRequest?: (booking: any) => void;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
  initialActiveTab?: string;
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

interface SavedItem {
  id: string;
  name: string;
  location: string;
  price: string;
  image: string;
  type: string;
}

type ProfileTab = 'details' | 'travelers' | 'bookings' | 'saved' | 'rewards' | 'security' | 'preferences' | 'payment';

const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' }
] as const;

const Profile: React.FC<ProfileProps> = ({ 
  user, 
  activeTab: activeTabProp, 
  onUpdateUser, 
  onBack, 
  onSignOut, 
  onBookItem, 
  onCancelRequest, 
  isDrawerOpen, 
  onCloseDrawer,
  initialActiveTab = 'details'
}) => {
  const { language: currentLang, setLanguage, currency: currentCurr, setCurrency } = useLanguage();
  const [activeTab, setActiveTab] = useState<ProfileTab>((initialActiveTab as ProfileTab) || 'details');
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [isEditing, setIsEditing] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'All' | 'Flight' | 'Hotel' | 'Car'>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTopRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [faStep, setFaStep] = useState<'otp' | 'success'>('otp');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [prefLang, setPrefLang] = useState<'EN' | 'FR' | 'ES'>(currentLang as 'EN' | 'FR' | 'ES');
  const [prefCurrCode, setPrefCurrCode] = useState<'USD' | 'EUR' | 'GBP' | 'NGN' | 'JPY' | 'CNY'>(currentCurr.code as 'USD' | 'EUR' | 'GBP' | 'NGN' | 'JPY' | 'CNY');

  const [savedItems, setSavedItems] = useState<SavedItem[]>([
    { id: 's1', name: 'Luxury Suite Colosseum', location: 'Rome, Italy . 5 Star Hotel', price: '$150.00', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600', type: 'Hotels' },
    { id: 's2', name: 'Passi Al Colosseo B&B', location: 'Rome, Italy . Boutique', price: '$110.00', image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600', type: 'Hotels' },
    { id: 's3', name: 'Tesla Model 3 Rental', location: 'San Francisco, USA', price: '$85.00', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800', type: 'Car Rentals' }
  ]);

  const [travelers, setTravelers] = useState<OtherTraveler[]>([
    { id: 't1', name: 'Amara Bruce', relationship: 'Spouse', dob: '1994-08-22', gender: 'Female' },
    { id: 't2', name: 'Leo Bruce', relationship: 'Child', dob: '2018-11-12', gender: 'Male' }
  ]);
  const [showAddTravelerForm, setShowAddTravelerForm] = useState(false);
  const [newTraveler, setNewTraveler] = useState<Omit<OtherTraveler, 'id'>>({ name: '', relationship: 'Spouse', dob: '', gender: 'Male' });

  const [savedCards, setSavedCards] = useState<PaymentCard[]>([
    { id: 'c1', brand: 'Visa', last4: '4324', expiry: '12/26', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg', isDefault: true },
    { id: 'c2', brand: 'Mastercard', last4: '8821', expiry: '08/25', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' }
  ]);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [newCardData, setNewCardData] = useState({ holderName: '', number: '', expiry: '', cvv: '' });

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [showCancelPage, setShowCancelPage] = useState(false);
  const [cancellationData, setCancellationData] = useState<{
    item: any;
    searchParams: any;
  } | null>(null);

  const [mockBookings, setMockBookings] = useState<Booking[]>([
    { id: '1', type: 'flight', title: 'Lagos(LOS) to Abuja(ABJ)', provider: 'Air Peace', subtitle: 'Flight BA117 . Economy', date: 'Dec 26-Dec 28, 2025', duration: '1h 15m Non-Stop', status: 'Confirmed', price: '75,000.00', currency: 'NGN', iconBg: 'bg-blue-50', imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600' },
    { id: '2', type: 'hotel', title: 'Hyatt Tokyo', provider: 'Hyatt', subtitle: 'Standard King Room . 2 Guests, 5 Nights', date: 'Dec 26-Dec 28, 2025', duration: '1h 15m Non-Stop', status: 'Completed', price: '1,500.00', currency: '$', iconBg: 'bg-yellow-50', imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600' },
    { id: '3', type: 'car', title: 'Tesla Model', provider: 'Hertz', subtitle: 'San Francisco Int. Airport . Hertz', date: 'Dec 26-Dec 28, 2025', duration: '1h 15m Non-Stop', status: 'Cancel', price: '1,500.00', currency: '$', iconBg: 'bg-purple-50', imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800' }
  ]);

  useEffect(() => {
    setFormData({ ...user });
  }, [user]);

  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp as ProfileTab);
    }
  }, [activeTabProp]);

  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab as ProfileTab);
    }
  }, [initialActiveTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTabClick = (tabId: ProfileTab) => {
    setActiveTab(tabId);
    if (onCloseDrawer) onCloseDrawer();
    if (contentTopRef.current) {
      const offset = 100;
      const elementPosition = contentTopRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const handleProfilePictureClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    console.log('📁 Selected file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString()
    });
  
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }
  
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }
  
    // Show immediate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setFormData(prev => ({ 
        ...prev, 
        profilePicture: imageUrl,
        avatar: imageUrl
      }));
    };
    reader.readAsDataURL(file);
  
    setIsSaving(true);
  
    try {
      console.log('📤 Uploading profile image to API...');
      
      // Upload to the API with field name "image"
      const uploadResult = await userApi.uploadProfileImage(file);
      
      console.log('✅ Upload successful, response:', uploadResult);
      
      // Get the image URL from the response - check all possible field names
      // FIXED: Remove .data since uploadResult doesn't have a data property
      const imageUrl = uploadResult.avatar || 
                      uploadResult.url || 
                      uploadResult.imageUrl || 
                      uploadResult.profilePicture;
                      // REMOVED: uploadResult.data?.url ||
                      // REMOVED: uploadResult.data?.avatar;
      
      if (!imageUrl) {
        throw new Error('No image URL returned from server');
      }
      
      // Update the form data with the new image URL
      const updatedData = {
        ...formData,
        profilePicture: imageUrl,
        avatar: imageUrl
      };
      
      setFormData(updatedData);
      
      // Save to user profile via API
      const profileResult = await userApi.updateProfile({
        profilePicture: imageUrl,
        avatar: imageUrl
      });
      
      if (profileResult) {
        console.log('✅ Profile updated with new image');
        
        // Call the parent update function
        onUpdateUser({
          ...profileResult,
          profilePicture: imageUrl,
          avatar: imageUrl
        });
        
        // Show success message
        alert('Profile picture updated successfully!');
      }
    } catch (error: any) {
      console.error('❌ Failed to upload profile picture:', error);
      
      let errorMessage = 'Failed to upload image';
      if (error instanceof ApiError) {
        errorMessage = error.message;
        console.log('🔍 ApiError details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Failed to upload image: ${errorMessage}`);
      
      // Revert to original image
      setFormData({ ...user });
    } finally {
      setIsSaving(false);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      console.log('🔄 Saving profile updates:', formData);
      
      // Create a safe object without avatar property
      const safeFormData = { ...formData };
      // Remove avatar if it exists since it's not part of User type
      if ('avatar' in safeFormData) {
        delete safeFormData.avatar;
      }
      
      // Update via API
      const result = await userApi.updateProfile(safeFormData);
      
      if (result) {
        console.log('✅ Profile saved successfully:', result);
        
        // Update parent component with the full result
        onUpdateUser(result);
        
        // Show success
        alert('Profile updated successfully!');
        
        // Exit edit mode
        setIsEditing(false);
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error: any) {
      console.error('❌ Failed to save profile:', error);
      
      let errorMessage = 'Failed to save profile';
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Failed to save profile: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareList = () => {
    setIsSharing(true);
    if (navigator.share) {
      navigator.share({
        title: 'My Travel Wishlist',
        text: 'Check out these hotels I saved on Ebony Bruce Travels!',
        url: window.location.href,
      }).finally(() => setIsSharing(false));
    } else {
      navigator.clipboard.writeText(window.location.href);
      setTimeout(() => {
        setIsSharing(false);
        alert('Wishlist link copied to clipboard!');
      }, 500);
    }
  };

  const handleRemoveSaved = (id: string) => {
    setSavedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdatePassword = () => {
    if (!passwords.new || passwords.new !== passwords.confirm) {
      alert('New passwords do not match');
      return;
    }
    
    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setPasswords({ current: '', new: '', confirm: '' });
      alert('Password updated successfully!');
    }, 1500);
  };

  const handleAddTraveler = () => {
    if (newTraveler.name && newTraveler.dob) {
      setTravelers([...travelers, { ...newTraveler, id: Date.now().toString() }]);
      setNewTraveler({ name: '', relationship: 'Spouse', dob: '', gender: 'Male' });
      setShowAddTravelerForm(false);
    } else {
      alert('Please fill in all required fields');
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
    return parts.length ? parts.join(' ') : v;
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNumber = newCardData.number.replace(/\s/g, '');
    if (rawNumber.length >= 15 && newCardData.expiry && newCardData.cvv && newCardData.holderName) {
      setIsSavingCard(true);
      setTimeout(() => {
        const isVisa = rawNumber.startsWith('4');
        const brand = isVisa ? 'Visa' : 'Mastercard';
        const icon = isVisa ? 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg' : 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg';
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
    } else {
      alert('Please fill in all card details');
    }
  };

  const handleRemoveCard = (id: string) => {
    setSavedCards(savedCards.filter(c => c.id !== id));
  };

  const handleManageBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsManageModalOpen(true);
  };

  const handleCancelClick = () => {
    if (selectedBooking) {
      console.log('Cancelling booking:', selectedBooking.id);
      
      // Update the booking status locally
      setMockBookings(prev => prev.map(b => 
        b.id === selectedBooking.id 
          ? { ...b, status: 'Cancel' as const } 
          : b
      ));
      
      // Call the onCancelRequest prop if provided
      if (onCancelRequest) {
        onCancelRequest(selectedBooking);
      }
      
      // Close the modal
      setIsManageModalOpen(false);
      
      // Prepare the data for CancelBooking page
      const cancelData = {
        item: {
          id: selectedBooking.id,
          title: selectedBooking.title,
          provider: selectedBooking.provider,
          subtitle: selectedBooking.subtitle,
          date: selectedBooking.date,
          price: selectedBooking.price,
          type: selectedBooking.type,
          status: selectedBooking.status,
          currency: selectedBooking.currency
        },
        searchParams: {
          segments: [
            {
              from: 'Lagos (LOS)',
              to: 'Abuja (ABV)'
            }
          ],
          travellers: '1 Traveller',
          bookingReference: `#${selectedBooking.id}`
        }
      };
      
      // Set the data and show the cancel page
      setCancellationData(cancelData);
      setShowCancelPage(true);
    }
  };

  const handleBackFromCancel = () => {
    setShowCancelPage(false);
    setCancellationData(null);
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
    if (otp.some(digit => digit === '')) {
      alert('Please enter the complete OTP');
      return;
    }
    
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
    if (faStep === 'success') setFaStep('otp');
  };

  const filteredBookings = mockBookings.filter(b => {
    if (bookingFilter === 'All') return true;
    return b.type.toLowerCase() === bookingFilter.toLowerCase();
  });

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

  const renderSavedCard = (item: SavedItem) => {
    const formattedItem = { ...item, title: item.name, subtitle: item.location };
    return (
      <div key={item.id} className="bg-white rounded-[24px] p-6 border border-gray-100 flex flex-col md:flex-row items-center gap-6 group hover:shadow-md transition-shadow relative">
        <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden shrink-0 relative">
          <img src={item.image} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" alt={item.name} />
          <button onClick={() => handleRemoveSaved(item.id)} className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 shadow-md hover:bg-red-500 hover:text-white transition transform hover:scale-110 active:scale-95 z-10" title="Remove">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-lg font-black text-gray-900 tracking-tight">{item.name}</h4>
          <p className="text-[11px] font-bold text-gray-400">{item.location}</p>
          <div className="flex items-center justify-center md:justify-start gap-1 mt-2 text-yellow-400">
            {[...Array(5)].map((_, i) => <svg key={i} className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
          </div>
        </div>
        <div className="text-center md:text-right">
          <p className="text-xl font-black text-[#33a8da]">{item.price}</p>
          <button onClick={() => onBookItem(formattedItem)} className="text-[10px] font-black text-[#33a8da] uppercase tracking-widest hover:underline mt-2">View Details</button>
        </div>
      </div>
    );
  };

  const renderBookingCard = (booking: Booking) => {
    const statusColors = { 
      Confirmed: 'bg-green-100 text-green-600', 
      Completed: 'bg-gray-100 text-gray-500', 
      Cancel: 'bg-red-50 text-red-500', 
      Active: 'bg-green-100 text-green-600' 
    };
    
    return (
      <div key={booking.id} className="bg-white rounded-[24px] p-6 border border-gray-100 flex flex-col md:flex-row items-center gap-6 group hover:shadow-md transition-shadow">
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
            <button onClick={() => handleManageBooking(booking)} className="text-[11px] font-black uppercase text-gray-600 hover:text-[#33a8da] transition">{booking.status === 'Cancel' ? 'Receipt' : 'Details'}</button>
            <button onClick={() => handleManageBooking(booking)} className="px-8 py-3 bg-[#33a8da] text-white rounded-xl text-[11px] font-black uppercase hover:bg-[#2c98c7] transition shadow-lg active:scale-95">{booking.status === 'Completed' ? 'Book Again' : 'Manage'}</button>
          </div>
        </div>
      </div>
    );
  };

  // If showCancelPage is true, render the CancelBooking component
  if (showCancelPage && cancellationData) {
    return (
      <CancelBooking 
        item={cancellationData.item}
        searchParams={cancellationData.searchParams}
        onBack={handleBackFromCancel}
      />
    );
  }

  return (
    <div className="bg-[#f8fbfe] min-h-screen">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp" 
      />
      
      {/* Soft Mobile Menu Drawer (Slide-in) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={onCloseDrawer}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col p-6 animate-in slide-in-from-left duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Navigation</h3>
              <button onClick={onCloseDrawer} className="p-2 text-gray-400 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto hide-scrollbar">
              {menuItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleTabClick(item.id as ProfileTab)} 
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all text-sm font-bold ${activeTab === item.id ? 'bg-blue-50 text-[#33a8da]' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-[#33a8da]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    {item.icon}
                  </svg>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <button onClick={onSignOut} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-red-500 font-bold hover:bg-red-50 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Soft Desktop Sidebar */}
          <aside className="hidden lg:block w-full lg:w-[320px] space-y-6">
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#f4d9c6] rounded-full flex items-center justify-center text-[#9a7d6a] border-2 border-white shadow-sm overflow-hidden shrink-0">
                  <img 
                    src={
                      formData.profilePicture || 
                      formData.avatar || 
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=f4d9c6&color=9a7d6a&size=56`
                    } 
                    className="w-full h-full object-cover" 
                    alt="Profile" 
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=f4d9c6&color=9a7d6a&size=56`;
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-gray-900 tracking-tight truncate">{formData.name || 'Ebony Bruce'}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Premium Identity</p>
                </div>
              </div>
            </div>
            
            <nav className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100/50">
              {menuItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleTabClick(item.id as ProfileTab)} 
                  className={`w-full flex items-center gap-5 px-8 py-5 transition-all text-[15px] font-bold ${activeTab === item.id ? 'bg-[#f0f9ff] text-[#33a8da]' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-[#33a8da]' : 'text-gray-400 opacity-60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    {item.icon}
                  </svg>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="bg-[#f0f9ff] rounded-[24px] p-8 shadow-sm border border-blue-50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center text-white">
                  <svg className="w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-tighter">Gold Level</h3>
              </div>
              <div className="w-full bg-white h-1.5 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-orange-400 w-3/4 rounded-full" />
              </div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">1,200 points Platinum</p>
            </div>
          </aside>

          <main className="flex-1 space-y-8" ref={contentTopRef}>
            {activeTab === 'details' && (
              <div className="animate-in fade-in duration-500">
                <div className="bg-white rounded-[32px] p-8 md:p-10 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8">
                  <div className="flex items-center gap-8">
                    <div onClick={handleProfilePictureClick} className={`relative group shrink-0 ${isEditing ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}>
                      <div className="w-24 h-24 bg-[#f4d9c6] rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                        <img 
                          src={
                            formData.profilePicture || 
                            formData.avatar || 
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=f4d9c6&color=9a7d6a&size=96`
                          } 
                          className="w-full h-full object-cover" 
                          alt="Profile" 
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=f4d9c6&color=9a7d6a&size=96`;
                          }}
                        />
                        {isEditing && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {isEditing && (
                        <div className="absolute bottom-1 right-1 w-7 h-7 bg-[#33a8da] border-4 border-white rounded-full flex items-center justify-center shadow-md">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Personal Information</h1>
                      <p className="text-gray-400 font-bold text-sm mt-1">Manage your identity and contact details.</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-[#33a8da] text-[#33a8da] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-50 transition active:scale-95 shadow-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Profile
                    </button>
                  )}
                </div>
                
                <div className="bg-white rounded-[32px] p-8 md:p-10 border border-gray-100 mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-8">Identity Details</h3>
                  <div className="space-y-8">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Full Name</label>
                      <input 
                        type="text" 
                        disabled={!isEditing} 
                        value={formData.name || ''} 
                        onChange={(e) => handleInputChange('name', e.target.value)} 
                        placeholder="Full Name" 
                        className={`w-full px-6 py-4 bg-gray-50 border-2 rounded-xl font-bold text-gray-900 transition-all outline-none ${isEditing ? 'border-transparent focus:bg-white focus:border-[#33a8da] focus:ring-4 focus:ring-[#33a8da]/10' : 'border-transparent opacity-70 cursor-not-allowed'}`} 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Date of Birth</label>
                        <input 
                          type="date" 
                          disabled={!isEditing} 
                          value={formData.dob || '1992-05-15'} 
                          onChange={(e) => handleInputChange('dob', e.target.value)} 
                          className={`w-full px-6 py-4 bg-gray-50 border-2 rounded-xl font-bold text-gray-900 transition-all outline-none ${isEditing ? 'border-transparent focus:bg-white focus:border-[#33a8da] focus:ring-4 focus:ring-[#33a8da]/10' : 'border-transparent opacity-70 cursor-not-allowed'}`} 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Gender</label>
                        <select 
                          disabled={!isEditing} 
                          value={formData.gender || 'Male'} 
                          onChange={(e) => handleInputChange('gender', e.target.value)} 
                          className={`w-full px-6 py-4 bg-gray-50 border-2 rounded-xl font-bold text-gray-900 transition-all outline-none appearance-none ${isEditing ? 'border-transparent focus:bg-white focus:border-[#33a8da] focus:ring-4 focus:ring-[#33a8da]/10' : 'border-transparent opacity-70 cursor-not-allowed'}`}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 md:p-10 border border-gray-100 mb-10">
                  <h3 className="text-xl font-bold text-gray-900 mb-8">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#33a8da] shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email Address</p>
                        <input 
                          type="email" 
                          disabled={!isEditing} 
                          value={formData.email || ''} 
                          onChange={(e) => handleInputChange('email', e.target.value)} 
                          className={`w-full bg-transparent font-bold text-gray-900 border-none outline-none p-0 focus:ring-0 ${!isEditing && 'opacity-70 cursor-not-allowed'}`} 
                        />
                      </div>
                      {isEditing && <span className="text-[10px] font-black uppercase text-green-500 bg-green-50 px-2 py-0.5 rounded">Verified</span>}
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#33a8da] shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Phone Number</p>
                        <input 
                          type="tel" 
                          disabled={!isEditing} 
                          value={formData.phone || ''} 
                          onChange={(e) => handleInputChange('phone', e.target.value)} 
                          className={`w-full bg-transparent font-bold text-gray-900 border-none outline-none p-0 focus:ring-0 ${!isEditing && 'opacity-70 cursor-not-allowed'}`} 
                        />
                      </div>
                      {isEditing && <button className="text-[10px] font-bold uppercase text-gray-400 hover:text-[#33a8da] transition">Update</button>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-4 pb-12">
                  {isEditing && (
                    <button 
                      onClick={() => { setIsEditing(false); setFormData({ ...user }); }} 
                      className="px-8 py-3.5 border border-gray-200 rounded-xl text-gray-500 font-bold text-sm uppercase tracking-widest hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={onSignOut} 
                    className="px-10 py-3.5 border border-blue-100 rounded-xl text-[#33a8da] font-bold text-sm uppercase tracking-widest hover:bg-blue-50 transition"
                  >
                    Sign Out
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving || !isEditing} 
                    className={`px-10 py-3.5 text-white font-bold text-sm uppercase tracking-widest rounded-xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 ${isEditing ? 'bg-[#33a8da] shadow-blue-100 hover:bg-[#2c98c7]' : 'bg-gray-300 shadow-none cursor-not-allowed'}`}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Booking History</h1>
                    <p className="text-gray-400 font-bold text-sm mt-1">Manage your upcoming and past travels.</p>
                  </div>
                  <div className="relative" ref={filterRef}>
                    <button 
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)} 
                      className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-500 flex items-center gap-2 hover:border-[#33a8da] transition shadow-sm"
                    >
                      {bookingFilter === 'All' ? 'All Bookings' : `${bookingFilter}s`}
                      <svg className={`w-3.5 h-3.5 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showFilterDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                        {['All', 'Flight', 'Hotel', 'Car'].map((f) => (
                          <button 
                            key={f} 
                            onClick={() => { setBookingFilter(f as any); setShowFilterDropdown(false); }} 
                            className={`w-full text-left px-5 py-3 text-xs font-bold ${bookingFilter === f ? 'text-[#33a8da] bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            {f === 'All' ? 'All Bookings' : `${f}s`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {filteredBookings.map(renderBookingCard)}
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50">
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Payment Methods</h1>
                  <p className="text-gray-400 font-bold text-sm mt-1">Stored cards for faster checkout.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div 
                    onClick={() => !isSavingCard && setShowAddPaymentForm(!showAddPaymentForm)} 
                    className={`bg-white rounded-[32px] p-8 border-2 ${showAddPaymentForm ? 'border-[#33a8da]' : 'border-dashed border-gray-100'} flex flex-col items-center justify-center text-center group hover:border-[#33a8da]/50 transition cursor-pointer h-[200px]`}
                  >
                    <div className={`w-12 h-12 ${showAddPaymentForm ? 'bg-blue-50 text-[#33a8da]' : 'bg-gray-50 text-gray-300'} rounded-full flex items-center justify-center mb-4 transition`}>
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d={showAddPaymentForm ? "M18 12H6" : "M12 4v16m8-8H4"} />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{showAddPaymentForm ? 'Cancel' : 'Add Card'}</h3>
                  </div>
                  
                  {showAddPaymentForm && (
                    <div className="bg-white rounded-[32px] p-8 border border-[#33a8da] shadow-sm animate-in slide-in-from-right duration-300">
                      <form onSubmit={handleAddPayment} className="space-y-4">
                        <input 
                          required 
                          type="text" 
                          value={newCardData.holderName} 
                          onChange={(e) => setNewCardData({...newCardData, holderName: e.target.value.toUpperCase()})} 
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
                          placeholder="CARDHOLDER NAME" 
                        />
                        <input 
                          required 
                          type="text" 
                          maxLength={19} 
                          value={newCardData.number} 
                          onChange={(e) => setNewCardData({...newCardData, number: formatCardNumber(e.target.value)})} 
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
                          placeholder="CARD NUMBER" 
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                            required 
                            type="text" 
                            maxLength={5} 
                            value={newCardData.expiry} 
                            onChange={(e) => { 
                              let v = e.target.value.replace(/\D/g, ''); 
                              if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4); 
                              setNewCardData({...newCardData, expiry: v}); 
                            }} 
                            className="w-full px-4 py-2.5 bg-gray-50 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
                            placeholder="MM/YY" 
                          />
                          <input 
                            required 
                            type="password" 
                            maxLength={4} 
                            value={newCardData.cvv} 
                            onChange={(e) => setNewCardData({...newCardData, cvv: e.target.value.replace(/\D/g, '')})} 
                            className="w-full px-4 py-2.5 bg-gray-50 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
                            placeholder="CVV" 
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={isSavingCard} 
                          className="w-full bg-[#33a8da] text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#2c98c7] transition disabled:opacity-50"
                        >
                          {isSavingCard ? 'Saving...' : 'Save Card'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {savedCards.map(card => (
                    <div key={card.id} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 hover:border-[#33a8da]/50 transition-colors">
                      <div className="flex items-center gap-6">
                        <img src={card.icon} className="h-8 w-auto opacity-70" alt={card.brand} />
                        <div>
                          <p className="font-bold text-gray-900">•••• •••• {card.last4}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{card.expiry}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveCard(card.id)} 
                        className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Saved Items</h1>
                    <p className="text-gray-400 font-bold text-sm mt-1">Your personal travel wishlist.</p>
                  </div>
                  <button onClick={handleShareList} disabled={isSharing} className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-[#33a8da] font-bold text-xs uppercase tracking-widest hover:bg-gray-50 active:scale-95 disabled:opacity-50">
                    {isSharing ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                      </svg>
                    )}
                    {isSharing ? 'Sharing...' : 'Share List'}
                  </button>
                </div>
                <div className="space-y-4">
                  {savedItems.length > 0 ? savedItems.map(renderSavedCard) : (
                    <div className="bg-white rounded-[32px] p-16 text-center border-4 border-dashed border-gray-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No saved items</h3>
                      <p className="text-gray-400 font-bold">Items you "love" will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Rewards</h1>
                  <p className="text-gray-400 font-bold text-sm mt-1">Track your loyalty points.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Current Balance</p>
                    <p className="text-5xl font-black text-gray-900">45,000 <span className="text-sm font-bold text-gray-400">pts</span></p>
                  </div>
                  <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 uppercase text-xs mb-4">Quick Perks</h3>
                    <ul className="space-y-3 text-xs font-bold text-gray-600">
                      {['Priority Check-in', 'Free Shuttle', '15% Off Hotels'].map(p => (
                        <li key={p} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#33a8da] rounded-full"></div>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50">
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Security</h1>
                  <p className="text-gray-400 font-bold text-sm mt-1">Update passwords and 2FA settings.</p>
                </div>
                <div className="bg-white rounded-[32px] p-8 border border-gray-100">
                  <div className="space-y-6">
                    <input 
                      type="password" 
                      value={passwords.current} 
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})} 
                      className="w-full px-5 py-3.5 bg-gray-50 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
                      placeholder="Current Password" 
                    />
                    <input 
                      type="password" 
                      value={passwords.new} 
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                      className="w-full px-5 py-3.5 bg-gray-50 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
                      placeholder="New Password" 
                    />
                    <button 
                      onClick={handleUpdatePassword} 
                      disabled={isUpdatingPassword || !passwords.new} 
                      className="bg-[#33a8da] text-white px-8 py-3.5 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#2c98c7] transition disabled:opacity-50"
                    >
                      {isUpdatingPassword ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-[32px] p-8 border border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-600">Two-Factor Authentication</p>
                  <button 
                    onClick={() => !twoFactorEnabled ? open2FAModal() : setTwoFactorEnabled(false)} 
                    className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest ${twoFactorEnabled ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {twoFactorEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="animate-in fade-in duration-500">
                <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                  <div className="p-8 md:p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div>
                        <label className="block text-lg font-bold text-gray-900 mb-4">Currency</label>
                        <select 
                          value={prefCurrCode} 
                          onChange={(e) => setPrefCurrCode(e.target.value as 'USD' | 'EUR' | 'GBP' | 'NGN' | 'JPY' | 'CNY')} 
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] appearance-none"
                        >
                          {CURRENCY_OPTIONS.map(currency => (
                            <option key={currency.code} value={currency.code}>
                              {currency.code} ({currency.symbol})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-lg font-bold text-gray-900 mb-4">Language</label>
                        <select 
                          value={prefLang} 
                          onChange={(e) => setPrefLang(e.target.value as 'EN' | 'FR' | 'ES')} 
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] appearance-none"
                        >
                          <option value="EN">English</option>
                          <option value="FR">Français</option>
                          <option value="ES">Español</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-5">
                  <button 
                    onClick={() => { 
                      setLanguage(prefLang); 
                      const selectedCurrency = CURRENCY_OPTIONS.find(c => c.code === prefCurrCode);
                      if (selectedCurrency) {
                        setCurrency(selectedCurrency);
                      }
                      setIsSaving(true); 
                      setTimeout(() => setIsSaving(false), 500); 
                    }} 
                    className="px-10 py-3.5 bg-[#33a8da] text-white font-bold rounded-2xl shadow-xl shadow-blue-500/10 hover:bg-[#2c98c7] active:scale-95 text-lg transition"
                  >
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'travelers' && (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-gray-100/50 gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Other Travelers</h1>
                    <p className="text-gray-400 font-bold text-sm mt-1">Quicker booking for family and friends.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddTravelerForm(!showAddTravelerForm)} 
                    className="bg-[#33a8da] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-[#2c98c7] active:scale-95 transition"
                  >
                    {showAddTravelerForm ? 'Cancel' : 'Add Traveler'}
                  </button>
                </div>
                
                {showAddTravelerForm && (
                  <div className="bg-white rounded-[32px] p-8 border-2 border-[#33a8da] shadow-sm animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <input 
                        type="text" 
                        value={newTraveler.name} 
                        onChange={(e) => setNewTraveler({...newTraveler, name: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-gray-50 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
                        placeholder="Full Name" 
                      />
                      <select 
                        value={newTraveler.relationship} 
                        onChange={(e) => setNewTraveler({...newTraveler, relationship: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-gray-50 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Friend">Friend</option>
                      </select>
                      <input 
                        type="date" 
                        value={newTraveler.dob} 
                        onChange={(e) => setNewTraveler({...newTraveler, dob: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-gray-50 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
                      />
                      <button 
                        onClick={handleAddTraveler} 
                        className="bg-[#33a8da] text-white py-3.5 rounded-xl font-bold uppercase text-xs hover:bg-[#2c98c7] transition"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {travelers.map(t => (
                    <div key={t.id} className="bg-white rounded-[24px] p-6 border border-gray-100 flex items-center justify-between hover:border-[#33a8da]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#33a8da]">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{t.name}</h4>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.relationship} • {t.dob}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveTraveler(t.id)} 
                        className="text-gray-300 hover:text-red-500 transition p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      
      <ManageBookingModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        booking={selectedBooking} 
        onCancelClick={handleCancelClick}
      />

      {/* OTP Modal */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[440px] rounded-[32px] shadow-2xl overflow-hidden relative p-10 text-center">
            <button onClick={close2FAModal} className="absolute top-6 right-6 text-gray-300 hover:text-gray-600 transition">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {faStep === 'otp' ? (
              <>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Verify Account</h2>
                <p className="text-sm text-gray-400 font-bold mb-10 px-4">Code sent to {formData.email || 'your email'}</p>
                <div className="flex justify-center gap-3 mb-10">
                  {otp.map((digit, idx) => (
                    <input 
                      key={idx} 
                      ref={el => { otpRefs.current[idx] = el; }} 
                      type="text" 
                      maxLength={1} 
                      value={digit} 
                      onChange={e => handleOtpChange(idx, e.target.value)} 
                      onKeyDown={e => handleOtpKeyDown(idx, e)} 
                      className="w-11 h-14 bg-gray-50 border-2 border-gray-100 rounded-xl text-center text-xl font-black text-gray-900 focus:border-[#33a8da] outline-none" 
                    />
                  ))}
                </div>
                <button 
                  onClick={handleVerifyOtp} 
                  disabled={isVerifying || otp.some(d => d === '')} 
                  className="w-full bg-[#33a8da] text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#2c98c7] disabled:opacity-50 text-sm uppercase tracking-widest"
                >
                  {isVerifying ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </>
            ) : (
              <div className="animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-4">Security Activated</h2>
                <button onClick={close2FAModal} className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-black transition text-sm uppercase tracking-widest">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;