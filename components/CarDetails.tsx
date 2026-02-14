'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
interface CarDetailsProps {
    item: any;
    searchParams: any;
    onBack: () => void;
    onBook: () => void;
}
const CarDetails: React.FC<CarDetailsProps> = ({ item, searchParams, onBack, onBook }) => {
    const { currency } = useLanguage();
    const [activeTab, setActiveTab] = useState('Overview');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    if (!item) {
        return (<div className="bg-[#f8fbfe] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-gray-900 mb-4">No Car Selected</h1>
          <button onClick={onBack} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-full hover:bg-[#2c98c7] transition">
            Back to Results
          </button>
        </div>
      </div>);
    }
    const carData = item.realData || {};
    const vehicle = carData.vehicle || {};
    const provider = carData.serviceProvider || carData.partnerInfo?.serviceProvider || {};
    const seats = vehicle.seats?.[0]?.count ?? carData.seats ?? 5;
    const baggages = vehicle.baggages || [];
    const sumBySize = (size: string) => baggages.filter((b: any) => (b.size || '').toUpperCase() === size.toUpperCase()).reduce((s: number, b: any) => s + (b.count || 0), 0);
    const baggageLarge = sumBySize('L') || sumBySize('Large');
    const baggageMedium = sumBySize('M') || sumBySize('Medium');
    const baggageSmall = sumBySize('S') || sumBySize('Small') || (baggages.length ? baggages.reduce((s: number, b: any) => s + (b.count || 0), 0) : 1);
    const baggageDisplay = [baggageLarge && `${baggageLarge}L`, baggageMedium && `${baggageMedium}M`, baggageSmall && `${baggageSmall}S`].filter(Boolean).join(', ') || '1S';
    const category = (vehicle.category === 'ST' ? 'Standard' : vehicle.category === 'BU' ? 'Business' : vehicle.category) || carData.vehicleCategory || 'Standard';
    const transmission = item.amenities?.includes('Manual') ? 'Manual' : 'Automatic';
    const extractPrice = (priceString: string) => {
        return parseFloat(priceString.replace(/[^\d.]/g, '')) || 0;
    };
    const dailyPrice = extractPrice(item.price);
    const calculateDuration = () => {
        if (!searchParams?.pickupDate || !searchParams?.returnDate)
            return 1;
        const pickup = new Date(searchParams.pickupDate);
        const returnDate = new Date(searchParams.returnDate);
        const diffTime = Math.abs(returnDate.getTime() - pickup.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays || 1;
    };
    const durationInDays = calculateDuration();
    const totalPrice = dailyPrice * durationInDays;
    const formatPrice = (amount: number) => {
        return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const formatDate = (dateString: string) => {
        if (!dateString)
            return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };
    const serverImage = carData.vehicleImageURL || item.image;
    const defaultGallery = [
        "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1618843479619-f4190600b91e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1603584173870-7f1ef91207ac?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1618843479373-5b6cb8a0ac0a?auto=format&fit=crop&q=80&w=1200",
    ];
    const galleryImages = serverImage ? [serverImage, ...defaultGallery.filter(u => u !== serverImage)].slice(0, 5) : defaultGallery;
    const nextImage = useCallback(() => {
        setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
    }, [galleryImages.length]);
    const prevImage = useCallback(() => {
        setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    }, [galleryImages.length]);
    const specifications = [
        { label: 'Transmission', value: transmission, icon: '⚙️' },
        { label: 'Category', value: category, icon: '🏷️' },
        { label: 'Passengers', value: `${seats} Seats`, icon: '👥' },
        { label: 'Baggage', value: baggageDisplay, icon: '🧳' },
        { label: 'Air Conditioning', value: 'Included', icon: '❄️' },
        { label: 'Fuel Policy', value: 'Full to Full', icon: '⛽' },
    ];
    const renderOverview = () => (<div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-12">
        <div>
          <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-6">Vehicle Specification</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {specifications.map(spec => (<div key={spec.label} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-100 transition-colors">
                 <span className="text-2xl mb-3 block">{spec.icon}</span>
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{spec.label}</p>
                 <p className="text-sm font-black text-gray-900">{spec.value}</p>
              </div>))}
          </div>
        </div>

        <div>
          <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-6">About this rental</h2>
          <div className="text-base text-gray-500 font-medium leading-relaxed space-y-4">
            <p>Travel in style with the {item.title}. This vehicle is part of the {category} fleet, known for its reliability and modern safety assists. Perfect for both business professionals and small families exploring the region.</p>
            <p>Managed by <span className="text-black font-black">{item.provider}</span>, you are guaranteed a professional handover and 24/7 roadside assistance throughout your rental period.</p>
          </div>
        </div>
      </div>
    </div>);
    const cancellationRules = (carData.cancellationRules as {
        ruleDescription?: string;
    }[]) || [];
    const termsFromServer = cancellationRules.length > 0
        ? cancellationRules.map((r, i) => ({ label: i === 0 ? 'Cancellation' : `Cancellation (${i + 1})`, value: r.ruleDescription || '' })).filter(t => t.value)
        : (carData.cancellationPolicy ? [{ label: 'Cancellation', value: carData.cancellationPolicy }] : []);
    const defaultTerms = [
        { label: 'Driver Requirements', value: 'Valid driving license held for at least 1 year. Minimum age 21 (young driver fee may apply under 25).' },
        { label: 'Security Deposit', value: `${currency.symbol}250.00 will be blocked on your credit card at pick-up.` },
        { label: 'Payment Policy', value: 'A credit card in the lead driver\'s name is required for the security deposit.' },
        { label: 'Mileage', value: 'Unlimited mileage included for the duration of this rental.' },
        { label: 'Fuel Policy', value: 'Pick up full, return full. Avoid local refueling surcharges.' },
    ];
    const termsList = termsFromServer.length > 0 ? [...termsFromServer, ...defaultTerms] : defaultTerms;
    const renderTerms = () => (<div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
        {termsList.map((term, i) => (<div key={i} className={`flex flex-col md:flex-row p-8 ${i !== termsList.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <div className="w-full md:w-56 shrink-0 mb-2 md:mb-0">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{term.label}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700 leading-relaxed">{term.value}</p>
            </div>
          </div>))}
      </div>
    </div>);
    return (<div className="bg-[#f8fbfe] min-h-screen">
      
      {isLightboxOpen && (<div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-[60px] flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center p-6 text-white relative z-10">
            <div className="flex flex-col">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#33a8da]">Ebony Bruce Gallery</p>
              <h3 className="text-lg font-bold">{item.title}</h3>
            </div>
            <button onClick={() => setIsLightboxOpen(false)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center border border-white/10">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center px-4 md:px-20">
            <button onClick={prevImage} className="absolute left-6 md:left-10 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition flex items-center justify-center border border-white/10 text-white active:scale-95 z-20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 19l-7-7 7-7"/></svg>
            </button>
            
            <div className="w-full max-w-5xl h-full flex items-center justify-center p-4">
              <img src={galleryImages[currentImageIndex]} className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500" alt={`${item.title} view ${currentImageIndex + 1}`}/>
            </div>

            <button onClick={nextImage} className="absolute right-6 md:right-10 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition flex items-center justify-center border border-white/10 text-white active:scale-95 z-20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          <div className="p-10 flex justify-center gap-3 overflow-x-auto hide-scrollbar relative z-10">
            {galleryImages.map((img, i) => (<button key={i} onClick={() => setCurrentImageIndex(i)} className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${currentImageIndex === i ? 'border-[#33a8da] scale-110 shadow-2xl' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                <img src={img} className="w-full h-full object-cover" alt=""/>
              </button>))}
          </div>
        </div>)}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        
        <div className="flex justify-between items-center mb-12">
          <button onClick={onBack} className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#33a8da] transition group">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7"/></svg>
            Back to Results
          </button>
          <div className="flex gap-3">
             <button className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-[#33a8da] transition shadow-sm">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
             </button>
             <button className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-[#33a8da] transition shadow-sm">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
             </button>
          </div>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-8 bg-white rounded-[48px] p-6 md:p-12 border border-gray-100 shadow-xl shadow-blue-500/5 flex flex-col relative overflow-hidden group">
            
            <div className="relative z-10 mb-10">
               <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-none mb-4">{item.title}</h1>
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{carData.pickupLocation || 'Lagos Airport'}</p>
               </div>
            </div>
            
            
            <div className="relative flex-1 flex items-center justify-center min-h-[300px] mb-8">
               <div className="absolute inset-0 flex items-center justify-between z-20 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button onClick={prevImage} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-[#33a8da] hover:bg-white transition active:scale-90">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <button onClick={nextImage} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-[#33a8da] hover:bg-white transition active:scale-90">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7"/></svg>
                  </button>
               </div>

               <div className="w-full h-full flex items-center justify-center transition-all duration-700">
                 <img src={galleryImages[currentImageIndex]} className="max-w-full max-h-[400px] object-contain drop-shadow-2xl animate-in fade-in duration-700" alt={item.title}/>
               </div>

               
               <button onClick={() => setIsLightboxOpen(true)} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-gray-100 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 shadow-xl hover:bg-white transition flex items-center gap-2 z-30">
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                 View all {galleryImages.length} photos
               </button>
            </div>

            
            <div className="flex gap-3 justify-center">
               {galleryImages.slice(0, 4).map((img, i) => (<div key={i} onClick={() => setCurrentImageIndex(i)} className={`w-20 h-20 bg-gray-50 rounded-2xl border-2 p-1 flex items-center justify-center cursor-pointer transition relative overflow-hidden ${currentImageIndex === i ? 'border-[#33a8da] scale-105 shadow-md' : 'border-gray-100 hover:border-blue-200'}`}>
                    <img src={img} className="w-full h-full object-cover rounded-xl" alt=""/>
                    {i === 3 && galleryImages.length > 4 && (<div onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }} className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                        <span className="text-lg font-black leading-none">+{galleryImages.length - 4}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest mt-1">More</span>
                      </div>)}
                 </div>))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#001f3f] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/></svg>
               </div>
               
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-8">Rental Summary</p>
               
               <div className="space-y-8 mb-10">
                 <div className="grid grid-cols-2 gap-6">
                   <div>
                     <p className="text-sm font-bold opacity-60 mb-1">Daily Rate</p>
                     <p className="text-3xl font-black tracking-tighter">{formatPrice(dailyPrice)}</p>
                   </div>
                   <div>
                     <p className="text-sm font-bold opacity-60 mb-1">Duration</p>
                     <p className="text-xl font-black">{durationInDays} Day{durationInDays > 1 ? 's' : ''}</p>
                   </div>
                 </div>

                 
                 {searchParams?.pickupDate && searchParams?.returnDate && (<>
                     <div className="h-px bg-white/10"></div>
                     <div className="space-y-4">
                       <div className="flex justify-between items-center">
                         <span className="text-sm font-bold opacity-60">Pick-up</span>
                         <span className="text-base font-black">{formatDate(searchParams.pickupDate)}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-sm font-bold opacity-60">Return</span>
                         <span className="text-base font-black">{formatDate(searchParams.returnDate)}</span>
                       </div>
                     </div>
                   </>)}

                 <div className="h-px bg-white/10"></div>

                 <div className="flex justify-between items-center">
                   <span className="text-lg font-bold">Total Estimated</span>
                   <span className="text-3xl font-black text-[#33a8da]">{formatPrice(totalPrice)}</span>
                 </div>
               </div>

               <button onClick={onBook} className="w-full bg-[#33a8da] text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#2c98c7] transition active:scale-95 text-base uppercase tracking-widest">
                 Reserve Vehicle
               </button>
               
               <p className="text-[10px] font-bold text-center mt-6 opacity-40 uppercase tracking-widest">Free cancellation up to 48h</p>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-gray-100 flex items-center gap-6 shadow-sm">
               <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center p-3 shrink-0 border border-gray-50">
                  {provider.logoUrl ? (<img src={provider.logoUrl} className="max-w-full max-h-full object-contain" alt={item.provider}/>) : (<span className="text-xl font-black text-[#33a8da]">{item.provider?.substring(0, 1) || 'C'}</span>)}
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fleet Provider</p>
                  <h4 className="text-lg font-black text-gray-900 leading-none">{item.provider || 'Car Rental Company'}</h4>
                  <p className="text-xs font-bold text-green-500 mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Verified Elite Partner
                  </p>
               </div>
            </div>
          </div>
        </div>

        
        <div className="border-b border-gray-100 mb-12 flex gap-12 overflow-x-auto hide-scrollbar sticky top-20 bg-[#f8fbfe] z-20 pt-4">
          {['Overview', 'Rental Terms', 'Insurance', 'Location Details'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`pb-5 text-[11px] font-black uppercase tracking-widest transition relative shrink-0 ${activeTab === tab ? 'text-[#33a8da]' : 'text-gray-400 hover:text-gray-600'}`}>
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#33a8da] rounded-full animate-in fade-in duration-300"/>}
            </button>))}
        </div>

        <div className="max-w-4xl">
           {activeTab === 'Overview' && renderOverview()}
           {activeTab === 'Rental Terms' && renderTerms()}
           {activeTab === 'Insurance' && (<div className="animate-in fade-in slide-in-from-bottom-2 duration-500 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[32px] border-2 border-blue-50 relative">
                   <div className="bg-green-500 text-white text-[9px] font-black px-3 py-1 rounded-full absolute top-6 right-6 uppercase">Standard</div>
                   <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Basic Protection</h3>
                   <ul className="space-y-4 text-sm font-bold text-gray-500">
                      <li className="flex items-center gap-3"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg> Collision Damage Waiver</li>
                      <li className="flex items-center gap-3"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg> Theft Protection</li>
                      <li className="flex items-center gap-3"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg> 24/7 Roadside Assistance</li>
                   </ul>
                </div>
                <div className="bg-white p-10 rounded-[32px] border border-gray-100 hover:border-blue-300 transition-colors group">
                   <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Premium Full Cover</h3>
                   <ul className="space-y-4 text-sm font-bold text-gray-400 mb-8">
                      <li className="flex items-center gap-3"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg> Zero Excess Liability</li>
                      <li className="flex items-center gap-3"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg> Tires & Windshield</li>
                      <li className="flex items-center gap-3"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg> Personal Accident Cover</li>
                   </ul>
                   <button className="w-full py-4 border-2 border-gray-100 rounded-2xl text-[11px] font-black uppercase text-gray-400 group-hover:border-[#33a8da] group-hover:text-[#33a8da] transition">Upgrade at Counter</button>
                </div>
             </div>)}
           {activeTab === 'Location Details' && (<div className="animate-in fade-in slide-in-from-bottom-2 duration-500 bg-white p-10 rounded-[32px] shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row gap-12">
                   <div className="flex-1 space-y-8">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Pick-up Location</p>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tight">{carData.pickupLocation || 'International Terminal'}</h4>
                        <p className="text-sm text-gray-500 font-medium mt-2">Head to the {item.provider} desk in the arrivals hall. A staff member will be waiting with your name plate.</p>
                      </div>
                      <div className="flex items-center gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                        <svg className="w-6 h-6 text-[#33a8da]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                        <p className="text-xs font-black text-blue-800 uppercase">Operational Hours: 24/7</p>
                      </div>
                   </div>
                   <div className="w-full md:w-80 h-64 bg-gray-100 rounded-[24px] overflow-hidden border border-gray-200 shadow-inner">
                      <img src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover opacity-80" alt="Map Location"/>
                   </div>
                </div>
             </div>)}
        </div>
      </div>
    </div>);
};
export default CarDetails;
