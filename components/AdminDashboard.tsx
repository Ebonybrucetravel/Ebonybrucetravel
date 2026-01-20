
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface BookingRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  type: 'Flight' | 'Hotel' | 'Car Rental';
  status: string;
  statusColor: string;
  amount: string;
  details?: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount: string;
  status: 'Active' | 'Expired';
  usageCount: number;
  expiryDate: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { currency } = useLanguage();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoSuccessCode, setPromoSuccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [bookings, setBookings] = useState<BookingRecord[]>([
    { id: '#1223', name: 'Alex Fisher', email: 'alex003@gmail.com', phone: '+234 902 543 3001', gender: 'Male', type: 'Flight', status: 'Booked', statusColor: 'text-green-500 bg-green-50', amount: '120,000', details: 'LOS -> ABJ' },
    { id: '#1224', name: 'Anna Baker', email: 'annabelia10@gmail.com', phone: '+233 702 733 3721', gender: 'Female', type: 'Hotel', status: 'Pending', statusColor: 'text-orange-500 bg-orange-50', amount: '450,000', details: 'Providence Hotel, 3 Nights' },
    { id: '#1225', name: 'John Doe', email: 'j.doe@example.com', phone: '+234 803 111 2222', gender: 'Male', type: 'Car Rental', status: 'Booked', statusColor: 'text-green-500 bg-green-50', amount: '85,000', details: 'Tesla Model 3, 2 Days' },
    { id: '#1226', name: 'Sarah Connor', email: 'terminator@skynet.com', phone: '+1 555 0199', gender: 'Female', type: 'Flight', status: 'Cancelled', statusColor: 'text-red-500 bg-red-50', amount: '950,000', details: 'LHR -> JFK' },
    { id: '#1227', name: 'Michael Scott', email: 'michael.s@dundermifflin.com', phone: '+234 705 999 8888', gender: 'Male', type: 'Hotel', status: 'Booked', statusColor: 'text-green-500 bg-green-50', amount: '1,200,000', details: 'Marriott, 5 Nights' },
    { id: '#1228', name: 'Pam Beesly', email: 'pam.b@dundermifflin.com', phone: '+234 812 333 4444', gender: 'Female', type: 'Car Rental', status: 'Pending', statusColor: 'text-orange-500 bg-orange-50', amount: '45,000', details: 'Toyota Camry, 1 Day' },
  ]);

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([
    { id: '1', code: 'EBONY5', discount: '5%', status: 'Active', usageCount: 142, expiryDate: '2025-12-31' },
    { id: '2', code: 'WELCOME', discount: '10%', status: 'Active', usageCount: 89, expiryDate: '2025-06-30' },
    { id: '3', code: 'FLYEBONY', discount: '₦5000', status: 'Active', usageCount: 21, expiryDate: '2025-12-01' },
  ]);

  const [newService, setNewService] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    type: 'Flight' as BookingRecord['type'],
    amount: '',
    origin: '',
    destination: '',
    hotelName: '',
    nights: '',
    carModel: '',
    rentalDays: ''
  });

  const [newPromo, setNewPromo] = useState({
    code: '',
    discount: '',
    expiryDate: ''
  });

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    let details = '';
    if (newService.type === 'Flight') details = `${newService.origin || 'N/A'} -> ${newService.destination || 'N/A'}`;
    else if (newService.type === 'Hotel') details = `${newService.hotelName || 'Property'}, ${newService.nights || '0'} Nights`;
    else details = `${newService.carModel || 'Model'}, ${newService.rentalDays || '0'} Days`;

    const service: BookingRecord = {
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
      name: newService.name,
      email: newService.email,
      phone: newService.phone,
      gender: newService.gender,
      type: newService.type,
      amount: newService.amount,
      status: 'Booked',
      statusColor: 'text-green-500 bg-green-50',
      details
    };
    setBookings([service, ...bookings]);
    setIsServiceModalOpen(false);
    setNewService({ 
      name: '', email: '', phone: '', gender: 'Male', type: 'Flight', amount: '',
      origin: '', destination: '', hotelName: '', nights: '', carModel: '', rentalDays: ''
    });
  };

  const handleGeneratePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = newPromo.code.toUpperCase() || `EBONY${Math.floor(Math.random() * 1000)}`;
    const promo: PromoCode = {
      id: Date.now().toString(),
      code: finalCode,
      discount: newPromo.discount,
      status: 'Active',
      usageCount: 0,
      expiryDate: newPromo.expiryDate || '2025-12-31'
    };
    setPromoCodes([promo, ...promoCodes]);
    setPromoSuccessCode(finalCode);
    setNewPromo({ code: '', discount: '', expiryDate: '' });
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Type', 'Status', 'Amount', 'Details'];
    const rows = headers.join(",") + "\n" + bookings.map(b => [b.id, b.name, b.email, b.phone, b.type, b.status, b.amount, b.details].join(",")).join("\n");
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Ebony_Bruce_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const navMapping: any = { 'Dashboard': 'All', 'Flights': 'Flight', 'Hotels': 'Hotel', 'Car Rentals': 'Car Rental' };
      const targetType = navMapping[activeNav];
      const matchesTab = targetType === 'All' || b.type === targetType;
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [bookings, activeNav, searchTerm]);

  const kpis = [
    { label: 'Total Revenue', value: `${currency.symbol}12.7M`, change: '+2.81%', isPositive: true, featured: true },
    { label: 'Total Bookings', value: bookings.length.toString(), change: '+4.20%', isPositive: true },
    { label: 'Active Promos', value: promoCodes.filter(p => p.status === 'Active').length.toString(), change: '+12%', isPositive: true },
    { label: 'Cancelled Orders', value: bookings.filter(b => b.status === 'Cancelled').length.toString(), change: '+0.55%', isPositive: true },
  ];

  const marketSegments = [
    { label: 'Flights', color: 'bg-[#001f3f]', percent: 56, icon: '✈️' },
    { label: 'Hotels', color: 'bg-[#fbbf24]', percent: 25, icon: '🏨' },
    { label: 'Car Rentals', color: 'bg-[#33a8da]', percent: 19, icon: '🚗' }
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f9] font-sans selection:bg-blue-100">
      {/* Refined Navigation - Integrated Tabs for Mobile */}
      <nav className="bg-[#001f3f] sticky top-0 z-50 shadow-2xl transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-10">
          <div className="h-16 lg:h-24 flex items-center justify-between gap-4">
            {/* Brand Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-[#33a8da] p-1.5 rounded-lg">
                <span className="text-white font-black italic text-base">EB</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-tighter leading-none text-white">EBONY BRUCE</span>
                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Travels</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 gap-1">
              {['Dashboard', 'Flights', 'Hotels', 'Car Rentals', 'Promo Codes'].map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                    activeNav === item ? 'bg-[#33a8da] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Desktop Search & Profile / Mobile Profile */}
            <div className="flex items-center gap-3 lg:gap-5">
              <div className="hidden lg:flex items-center relative group">
                <input 
                  type="text" 
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:w-64 transition-all w-40"
                />
                <svg className="w-4 h-4 text-gray-400 absolute right-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <div onClick={onLogout} className="w-9 h-9 lg:w-10 lg:h-10 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer hover:border-[#33a8da] transition-all" title="Sign Out">
                <img src={`https://ui-avatars.com/api/?name=Admin&background=33a8da&color=fff`} className="w-full h-full" alt="Admin" />
              </div>
            </div>
          </div>

          {/* Integrated Mobile Navigation Bar */}
          <div className="lg:hidden border-t border-white/5 overflow-x-auto hide-scrollbar pb-3 pt-1">
            <div className="flex items-center gap-2 min-w-max">
              {['Dashboard', 'Flights', 'Hotels', 'Car Rentals', 'Promo Codes'].map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeNav === item 
                      ? 'bg-[#33a8da] text-white shadow-lg' 
                      : 'text-gray-500 bg-white/5 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-4 md:p-10 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-10 gap-6">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-[#001f3f] tracking-tight uppercase leading-none">
              {activeNav === 'Promo Codes' ? 'Campaigns' : 'Operational Console'}
            </h1>
            <p className="text-gray-400 mt-2 font-bold text-[10px] md:text-xs uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-3 md:gap-4 w-full md:w-auto">
            <button onClick={exportToCSV} className="flex-1 md:flex-none bg-white border border-gray-200 text-[#001f3f] font-black px-4 md:px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition text-xs md:text-sm uppercase shadow-sm">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="hidden sm:inline">Export Data</span>
              <span className="sm:hidden">Export</span>
            </button>
            {activeNav === 'Promo Codes' ? (
              <button onClick={() => { setPromoSuccessCode(null); setIsPromoModalOpen(true); }} className="flex-1 md:flex-none bg-[#33a8da] hover:bg-[#2c98c7] text-white font-black px-4 md:px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition text-xs md:text-sm uppercase tracking-tight">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                New Promo
              </button>
            ) : (
              <button onClick={() => setIsServiceModalOpen(true)} className="flex-1 md:flex-none bg-[#33a8da] hover:bg-[#2c98c7] text-white font-black px-4 md:px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition text-xs md:text-sm uppercase tracking-tight">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                New Entry
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
          {kpis.map((kpi) => (
            <div key={kpi.label} className={`rounded-[20px] md:rounded-[24px] p-4 md:p-8 shadow-sm border transition-all hover:shadow-md ${kpi.featured ? 'bg-[#001f3f] text-white border-[#33a8da]/30' : 'bg-white text-[#001f3f] border-white/60'}`}>
              <p className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest mb-3 md:mb-6 ${kpi.featured ? 'text-[#33a8da]' : 'opacity-70'}`}>{kpi.label}</p>
              <div className="flex flex-col gap-1 md:gap-2">
                <h3 className="text-xl md:text-3xl font-black tracking-tight">{kpi.value}</h3>
                <div className={`flex items-center gap-1.5 text-[9px] md:text-[11px] font-black ${kpi.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {kpi.change}
                  <span className="opacity-50 text-gray-400 hidden sm:inline">vs Prev.</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          <div className="lg:col-span-8 space-y-6 md:space-y-8">
            {activeNav === 'Promo Codes' ? (
              <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-sm border border-white/60 overflow-hidden">
                <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-50">
                  <h3 className="text-sm md:text-lg font-black text-[#001f3f] tracking-tight uppercase">Active Promotions</h3>
                  <span className="bg-blue-50 text-[#33a8da] px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest">{promoCodes.length} Total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</th>
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Value</th>
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {promoCodes.map((promo) => (
                        <tr key={promo.id} className="hover:bg-blue-50/20 transition-colors cursor-pointer">
                          <td className="px-6 md:px-8 py-5 md:py-6">
                            <span className="text-[11px] font-black text-[#001f3f] bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">{promo.code}</span>
                          </td>
                          <td className="px-6 md:px-8 py-5 md:py-6 text-xs font-black text-blue-600">{promo.discount}</td>
                          <td className="px-6 md:px-8 py-5 md:py-6 text-right text-[11px] font-bold text-gray-400">{promo.expiryDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-sm border border-white/60 overflow-hidden">
                <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-50">
                  <h3 className="text-sm md:text-lg font-black text-[#001f3f] tracking-tight uppercase">{activeNav === 'Dashboard' ? 'Global' : activeNav} Activity</h3>
                  <span className="bg-blue-50 text-[#33a8da] px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest">{filteredBookings.length} Total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-50 bg-gray-50/50">
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Identity</th>
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                        <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredBookings.map((b, i) => (
                        <tr key={i} className="hover:bg-blue-50/20 transition-colors group cursor-pointer">
                          <td className="px-6 md:px-8 py-5 md:py-6">
                            <div className="flex items-center gap-3">
                              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=33a8da&color=fff`} className="w-8 h-8 rounded-full border border-gray-100" alt="" />
                              <div><p className="text-xs font-black text-[#001f3f] leading-tight">{b.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{b.id}</p></div>
                            </div>
                          </td>
                          <td className="px-6 md:px-8 py-5 md:py-6"><p className="text-[11px] font-bold text-gray-600 truncate max-w-[200px]">{b.details || 'N/A'}</p></td>
                          <td className="px-6 md:px-8 py-5 md:py-6 text-right"><span className="text-xs font-black text-[#33a8da]">{currency.symbol}{b.amount}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            {/* Market Segment Allocation */}
            <div className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-sm border border-white/60">
              <div className="mb-8">
                <h3 className="text-sm md:text-lg font-black text-[#001f3f] tracking-tight uppercase">Segment Allocation</h3>
                <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Business model distribution</p>
              </div>
              <div className="space-y-6 md:space-y-8">
                {marketSegments.map((segment) => (
                  <div key={segment.label} className="group">
                    <div className="flex justify-between items-end mb-2 md:mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base md:text-xl">{segment.icon}</span>
                        <span className="text-[10px] md:text-[11px] font-black text-[#001f3f] uppercase tracking-widest">{segment.label}</span>
                      </div>
                      <span className="text-[10px] md:text-xs font-black text-gray-400 group-hover:text-[#33a8da] transition-colors">{segment.percent}%</span>
                    </div>
                    <div className="h-2 md:h-2.5 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                      <div 
                        style={{ width: `${segment.percent}%` }} 
                        className={`h-full ${segment.color} rounded-full transition-all duration-1000 ease-out group-hover:opacity-90`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance History */}
            <div className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-sm border border-white/60">
              <h3 className="text-sm md:text-lg font-black text-[#001f3f] tracking-tight uppercase mb-8">Performance History</h3>
              <div className="h-48 md:h-64 flex items-end justify-between gap-3 md:gap-6 px-2 md:px-4">
                 {[
                   { m: 'OCT', v: 202, h: 'h-[45%]' },
                   { m: 'NOV', v: 137, h: 'h-[35%]' },
                   { m: 'DEC', v: 367, h: 'h-[90%]', a: true },
                   { m: 'JAN', v: 169, h: 'h-[40%]' }
                 ].map(bar => (
                   <div key={bar.m} className="flex-1 flex flex-col items-center gap-3 md:gap-4 group cursor-pointer">
                     <div className="relative w-full flex flex-col items-center gap-1">
                        <span className={`text-[8px] md:text-[10px] font-black transition-all ${bar.a ? 'text-[#33a8da] opacity-100' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}>{bar.v}</span>
                        <div className={`w-full max-w-[42px] rounded-t-lg md:rounded-t-xl transition-all duration-700 ${bar.h} ${bar.a ? 'bg-gradient-to-t from-[#001f3f] to-[#33a8da]' : 'bg-gray-100 group-hover:bg-gray-200'}`}></div>
                     </div>
                     <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${bar.a ? 'text-[#001f3f]' : 'text-gray-400'}`}>{bar.m}</span>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001f3f]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[32px] md:rounded-[48px] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-500 relative">
            <div className="p-6 md:p-12 lg:p-16">
              <div className="flex justify-between items-start mb-8 md:mb-12">
                <div>
                  <h2 className="text-xl md:text-3xl font-black text-[#001f3f] tracking-tight uppercase leading-none">Record Entry</h2>
                  <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Operations Hub</p>
                </div>
                <button onClick={() => setIsServiceModalOpen(false)} className="p-2 md:p-3 bg-gray-50 rounded-xl md:rounded-2xl text-gray-400 hover:text-red-500 transition-all shadow-sm">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleAddService} className="space-y-8 md:space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                    <select 
                      value={newService.type}
                      onChange={(e) => setNewService({...newService, type: e.target.value as any})}
                      className="w-full px-5 md:px-6 py-3 md:py-4 bg-gray-50 rounded-xl md:rounded-2xl font-bold border-2 border-transparent focus:border-[#33a8da] focus:bg-white transition-all outline-none text-[#001f3f] appearance-none"
                    >
                      <option value="Flight">✈️ Flight Booking</option>
                      <option value="Hotel">🏨 Hotel Reservation</option>
                      <option value="Car Rental">🚗 Car Rental</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount ({currency.code})</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">{currency.symbol}</span>
                      <input 
                        type="text" 
                        required
                        placeholder="0.00"
                        value={newService.amount}
                        onChange={(e) => setNewService({...newService, amount: e.target.value})}
                        className="w-full pl-12 pr-6 py-3 md:py-4 bg-gray-50 rounded-xl md:rounded-2xl font-bold border-2 border-transparent focus:border-[#33a8da] focus:bg-white transition-all outline-none placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-10 bg-[#f8fbfe] rounded-[24px] md:rounded-[32px] border border-blue-50/50">
                   <h3 className="text-[10px] md:text-xs font-black text-[#33a8da] uppercase tracking-[0.2em] mb-6 md:mb-8 text-center md:text-left">Customer Profile</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div className="space-y-2">
                        <label className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Legal Name</label>
                        <input required type="text" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} placeholder="Customer name" className="w-full px-4 md:px-5 py-3 md:py-4 bg-white rounded-xl font-bold border border-gray-100 outline-none focus:ring-4 focus:ring-[#33a8da]/5 shadow-sm placeholder:text-gray-600" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Active Email</label>
                        <input required type="email" value={newService.email} onChange={(e) => setNewService({...newService, email: e.target.value})} placeholder="name@domain.com" className="w-full px-4 md:px-5 py-3 md:py-4 bg-white rounded-xl font-bold border border-gray-100 outline-none focus:ring-4 focus:ring-[#33a8da]/5 shadow-sm placeholder:text-gray-600" />
                      </div>
                   </div>
                </div>

                <button type="submit" className="w-full bg-[#001f3f] text-[#33a8da] font-black py-5 md:py-8 rounded-[20px] md:rounded-[32px] shadow-2xl hover:bg-[#002b55] transition transform active:scale-[0.98] text-xs md:text-sm uppercase tracking-[0.3em] border-2 border-[#33a8da]/20 mt-4">
                  Register Record
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Promo Generation Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001f3f]/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-[#001f3f] tracking-tight uppercase">Code Generator</h2>
                  <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Growth Tools</p>
                </div>
                <button onClick={() => { setIsPromoModalOpen(false); setPromoSuccessCode(null); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {!promoSuccessCode ? (
                <form onSubmit={handleGeneratePromo} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Custom Code</label>
                    <input 
                      type="text" 
                      value={newPromo.code}
                      onChange={(e) => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                      placeholder="e.g. SUMMER25"
                      className="w-full px-5 py-4 bg-gray-50 rounded-xl font-black border-2 border-transparent focus:border-[#fbbf24] focus:bg-white outline-none transition-all placeholder:text-gray-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Discount</label>
                      <input 
                        type="text" 
                        required
                        value={newPromo.discount}
                        onChange={(e) => setNewPromo({...newPromo, discount: e.target.value})}
                        placeholder="15% or ₦2000"
                        className="w-full px-5 py-4 bg-gray-50 rounded-xl font-bold border-2 border-transparent focus:border-[#fbbf24] focus:bg-white outline-none transition-all placeholder:text-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expiry</label>
                      <input 
                        type="date" 
                        required
                        value={newPromo.expiryDate}
                        onChange={(e) => setNewPromo({...newPromo, expiryDate: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 rounded-xl font-bold border-2 border-transparent focus:border-[#fbbf24] focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-[#33a8da] text-white font-black py-4 md:py-5 rounded-2xl shadow-xl hover:bg-[#2c98c7] transition transform active:scale-[0.98] text-[10px] md:text-xs uppercase tracking-widest mt-4">
                    Deploy Campaign
                  </button>
                </form>
              ) : (
                <div className="py-8 md:py-10 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-gray-900 mb-2 uppercase">Success!</h3>
                  
                  <div className="relative group bg-gray-50 p-5 md:p-6 rounded-2xl border-2 border-dashed border-gray-200 mb-8 cursor-pointer hover:bg-white hover:border-[#33a8da] transition-all" onClick={() => handleCopyToClipboard(promoSuccessCode)}>
                     <span className="text-2xl md:text-3xl font-black text-[#001f3f] tracking-tighter">{promoSuccessCode}</span>
                     <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-green-500 text-white' : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'}`}>
                        {copied ? 'Copied!' : 'Click to copy'}
                     </div>
                  </div>

                  <button onClick={() => { setIsPromoModalOpen(false); setPromoSuccessCode(null); }} className="w-full bg-[#001f3f] text-[#33a8da] font-black py-4 md:py-5 rounded-2xl shadow-xl transition transform active:scale-[0.98] text-[10px] md:text-xs uppercase tracking-widest">
                    Return to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="py-12 md:py-16 text-center border-t border-gray-100 bg-white">
        <p className="text-[8px] md:text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em] px-4">Ebony Bruce Enterprise Command • Staff Portal Access Verified</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
