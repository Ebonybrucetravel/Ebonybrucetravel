'use client';

import { useState } from 'react';
import AIAssistant from './AIAssistant'; 

export default function GlobalAIWidget({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[50] w-14 h-14 bg-[#32A6D7] hover:bg-[#2c98c7] text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
          aria-label="Open AI Assistant"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* The AI Chat Panel */}
      {isOpen && (
        <AIAssistant 
          onClose={() => setIsOpen(false)} 
          user={user} 
        />
      )}
    </>
  );
}