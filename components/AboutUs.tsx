'use client';
import React from 'react';

interface AboutUsProps {
  onBack: () => void;
  onNavigateToBlog?: (slug: string) => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onBack }) => {
  const team = [
    { name: 'Bruce Ayobami Benjamin', title: 'Business Support Officer.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300' },
    { name: 'Ojo Afolabi Sunday', title: 'Customer Service Associate.', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300' },
    { name: 'ADETUNMBI Yetunde Oluwafunto', title: 'Customer Service Associate.', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300' },
    { name: 'James Olabisi Ogundele', title: 'Business Operations Manager', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300' },
  ];

  const blogPosts = [
    { title: 'Hotel Booking: Your Comfortable Stay, Every Time', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600' },
    { title: 'Speedy Admission Processing: Your Fast-Track to Studying Abroad', img: 'https://images.unsplash.com/photo-1523050338192-067307066a70?auto=format&fit=crop&q=80&w=600' }
  ];

  return (
    <div className="bg-white min-h-screen animate-in fade-in duration-500">
      {/* 1. Header Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-6 border-b border-gray-50 flex items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#33a8da] transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </button>
      </div>

      {/* 2. Top Identity Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image Grid */}
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="space-y-4">
              <div className="h-64 rounded-xl overflow-hidden shadow-lg">
                <img src="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover" alt="Travel" />
              </div>
              <div className="h-[400px] rounded-xl overflow-hidden shadow-lg relative">
                <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover" alt="Check-in" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="bg-white/95 backdrop-blur p-8 rounded-xl shadow-2xl text-center transform translate-y-24">
                      <p className="text-4xl font-black text-gray-900 tracking-tighter">8+</p>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Years Of Experience</p>
                   </div>
                </div>
              </div>
            </div>
            <div className="pt-12">
               <div className="h-80 rounded-xl overflow-hidden shadow-lg">
                <img src="https://images.unsplash.com/photo-1522071823991-b59fea12f4c8?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover" alt="Office" />
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-8">
            <h4 className="text-[#33a8da] font-black text-sm uppercase tracking-widest">About Ebony Bruce Travels</h4>
            <h1 className="text-4xl lg:text-6xl font-black text-[#001f3f] tracking-tighter leading-tight">
              Your Trusted Partner for Seamless Travel Solutions!
            </h1>
            <div className="text-lg text-gray-500 font-medium leading-relaxed space-y-6">
              <p>
                At <span className="text-[#001f3f] font-black">Ebony Bruce Travels</span>, we specialize in providing seamless <span className="text-[#001f3f] font-black">Tours and Tickets (non-flight) Operations</span>, <span className="text-[#001f3f] font-black">DHL Franchised Logistics Services</span> and <span className="text-[#001f3f] font-black">hotel reservation and Educational Consulting</span> services to make your travel stress-free and convenient. Whether you're planning a business trip, family vacation, or international adventure, we ensure <span className="text-[#001f3f] font-black">affordable Tours</span> and <span className="text-[#001f3f] font-black">comfortable stays</span> with the best deals.
              </p>
              <p>
                Our mission is to offer <span className="text-[#001f3f] font-black">efficient, reliable, and budget-friendly travel solutions</span>, ensuring a smooth experience from booking to check-in. With our expert support, your journey becomes easier, so you can focus on enjoying your destination.
              </p>
              <p className="text-[#001f3f] font-black text-xl pt-4">
                Book with us today and travel with confidence!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Choose Us Section (Dark Theme) */}
      <section className="bg-[#121212] py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover grayscale" alt="" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">Why Choose Us</p>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">Make Your Travel Stress-Free And Convenient</h2>
          <div className="w-16 h-1 bg-[#33a8da] mx-auto mb-20 rounded-full"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start text-left">
            <div className="flex gap-6 group">
              <div className="shrink-0 w-16 h-16 rounded-full border border-white/20 flex items-center justify-center text-[#33a8da] group-hover:scale-110 transition duration-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="flex gap-6">
                <div className="w-px h-24 bg-white/10 hidden md:block"></div>
                <div>
                   <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">Our Mission</h3>
                   <p className="text-gray-400 font-medium leading-relaxed">Our aim is to provide seamless flight, hotel booking services and Educational Consulting for stress-free global travel.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-6 group">
              <div className="shrink-0 w-16 h-16 rounded-full border border-white/20 flex items-center justify-center text-[#33a8da] group-hover:scale-110 transition duration-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
              <div className="flex gap-6">
                <div className="w-px h-24 bg-white/10 hidden md:block"></div>
                <div>
                   <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">Our Vision</h3>
                   <p className="text-gray-400 font-medium leading-relaxed">To make global travel effortless with seamless Tours and Tickets (non-flight) Operations and hotel booking services for all travelers.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-6 group">
              <div className="shrink-0 w-16 h-16 rounded-full border border-white/20 flex items-center justify-center text-[#33a8da] group-hover:scale-110 transition duration-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              </div>
              <div className="flex gap-6">
                <div className="w-px h-24 bg-white/10 hidden md:block"></div>
                <div>
                   <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">Our Goal</h3>
                   <p className="text-gray-400 font-medium leading-relaxed">Our goal is to provide hassle-free flight and hotel bookings for smooth and affordable travel experiences.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Team Section */}
      <section className="max-w-7xl mx-auto px-6 py-32 text-center">
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">Our Team</p>
        <h2 className="text-4xl md:text-5xl font-black text-[#001f3f] tracking-tighter mb-4">People You Can Trust</h2>
        <div className="w-16 h-1 bg-[#33a8da] mx-auto mb-20 rounded-full"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {team.map((member) => (
            <div key={member.name} className="group">
              <div className="aspect-square rounded-2xl overflow-hidden mb-6 shadow-md transition-all duration-500 group-hover:shadow-2xl">
                <img src={member.img} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt={member.name} />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight px-4">{member.name}</h3>
              <p className="text-gray-400 font-bold italic text-sm mt-2">{member.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Blog Section */}
      <section className="bg-gray-50/50 py-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
           <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">From The Blog</p>
           <h2 className="text-4xl font-black text-[#001f3f] tracking-tighter mb-20">Our Latest Posts</h2>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left">
              {blogPosts.map((post) => (
                <div key={post.title} className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 group">
                   <div className="h-80 overflow-hidden">
                     <img src={post.img} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt={post.title} />
                   </div>
                   <div className="p-10 space-y-8">
                      <h3 className="text-2xl font-black text-[#001f3f] tracking-tight leading-tight min-h-[3.5rem]">{post.title}</h3>
                      <button className="bg-[#33a8da] text-white font-black px-10 py-4 rounded-xl hover:bg-[#2c98c7] transition active:scale-95 text-sm uppercase tracking-widest shadow-lg shadow-blue-500/10">Read More</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* 6. Gallery Heading Section */}
      <section className="py-24 text-center">
        <h2 className="text-6xl font-black text-gray-900 tracking-tighter uppercase opacity-80">Gallery</h2>
        {/* Gallery contents could go here if needed, mirroring the placeholder in the screenshot */}
      </section>
    </div>
  );
};

export default AboutUs;