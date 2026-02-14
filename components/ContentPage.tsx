'use client';
import React, { useEffect } from 'react';
import { PageContent } from '../lib/content';
interface ContentPageProps {
    content: PageContent;
    onBack: () => void;
}
const ContentPage: React.FC<ContentPageProps> = ({ content, onBack }) => {
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [content]);
    return (<div className="bg-white min-h-screen animate-in fade-in duration-500">
      
      <div className="relative h-[400px] md:h-[600px] overflow-hidden">
        <img src={content.image} className="w-full h-full object-cover" alt=""/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"/>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <button onClick={onBack} className="mb-8 px-8 py-2.5 bg-white/10 backdrop-blur-md border border-white/30 rounded-full text-white font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-white/20 transition-all active:scale-95">
            ← Back to Home
          </button>
          <div className="max-w-5xl space-y-6">
            <h1 className="text-4xl md:text-8xl font-black text-white tracking-tighter leading-none">{content.title}</h1>
            <p className="text-lg md:text-2xl text-blue-100 font-medium max-w-3xl mx-auto opacity-90 leading-relaxed">{content.subtitle}</p>
          </div>
        </div>
      </div>

      
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-24">
          {content.sections.map((section, idx) => (<div key={idx} className={`group ${idx === 0 ? 'md:col-span-2 md:max-w-3xl' : ''}`}>
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm grayscale group-hover:grayscale-0 transition-all duration-700 transform group-hover:rotate-6 group-hover:scale-110">
                  {section.icon || '✦'}
                </div>
                <div className="h-[2px] flex-1 bg-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#33a8da] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-1000"/>
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-[#001f3f] tracking-tight mb-8 uppercase leading-tight">{section.title}</h2>
              <p className="text-lg text-gray-500 leading-relaxed font-medium">
                {section.body}
              </p>
            </div>))}
        </div>

        
        {content.title.includes('Travel') && (<div className="mt-32 pt-24 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div>
                <p className="text-5xl font-black text-[#001f3f] mb-2 tracking-tighter">220+</p>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Countries Reached</p>
              </div>
              <div>
                <p className="text-5xl font-black text-[#33a8da] mb-2 tracking-tighter">IATA</p>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Accredited Agent</p>
              </div>
              <div>
                <p className="text-5xl font-black text-[#001f3f] mb-2 tracking-tighter">24/7</p>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Global Concierge</p>
              </div>
            </div>
          </div>)}

        
        <div className="mt-32 p-12 md:p-20 bg-[#001f3f] rounded-[48px] text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#33a8da]/10 rounded-full blur-[80px]"/>
          <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-white/5 rounded-full blur-[80px]"/>
          
          <div className="relative z-10">
            <h3 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Ready to elevate your travel?</h3>
            <p className="text-blue-100 mb-12 font-medium text-lg opacity-80 max-w-2xl mx-auto">Join the exclusive network of travelers who trust Ebony Bruce for their global journeys.</p>
            <button onClick={onBack} className="bg-[#33a8da] text-white font-black px-12 py-5 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#2c98c7] transition transform active:scale-95 uppercase tracking-widest text-sm">
              Start Your Journey
            </button>
          </div>
        </div>
      </div>
    </div>);
};
export default ContentPage;
