'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
interface AIAssistantProps {
    onClose: () => void;
    user?: {
        name: string;
        email: string;
        profilePicture?: string;
    };
}
const FALLBACK_RESPONSES = [
    "I'd be happy to help you plan your trip! For flights from Lagos to Abuja, I recommend checking Air Peace or Ibom Air for competitive prices around $120-$180 for economy class.",
    "Looking for hotels in London? Consider the Grand Plaza Hotel in the city center for $250/night or the Ocean View Resort beachfront for $320/night with all-inclusive amenities.",
    "For car rentals in Los Angeles, Enterprise offers Toyota Prado SUVs for $85/day, while Hertz has Mercedes-Benz C-Class luxury cars for $120/day.",
    "I can help you find the best travel deals! Our premium network offers competitive rates on flights, hotels, and car rentals worldwide.",
    "Planning a multi-city trip? I recommend booking flights 2-3 months in advance for the best prices and considering mid-week travel for lower rates.",
    "For beach destinations, consider booking all-inclusive resorts that include meals and activities. Popular options include Maldives, Bali, and the Caribbean.",
    "Traveling on a budget? Look for red-eye flights, consider alternative airports, and book accommodations slightly outside city centers for better value."
];
type AIStatus = 'checking' | 'working' | 'fallback';

const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, user }) => {
    const { t } = useLanguage();
    const [aiStatus] = useState<AIStatus>('fallback');
    const [messages, setMessages] = useState<{
        role: 'user' | 'assistant';
        content: string;
    }[]>([
        {
            role: 'assistant',
            content: user?.name
                ? `Hello ${user.name}! I'm your Ebony Bruce travel assistant. Where would you like to go?`
                : "Hello! I'm your Ebony Bruce travel assistant. Where would you like to go?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const brandBlue = '#32A6D7';
    const brandBlueDark = '#2a8bb5';
    const whatsappGreen = '#25D366';
    const openWhatsApp = () => {
        const phone = '2348000000000';
        const text = encodeURIComponent("Hi, I'd like help with my booking.");
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
    };
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);
    const getFallbackResponse = (userMessage: string): string => {
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes('flight') || lowerMessage.includes('fly') || lowerMessage.includes('airplane')) {
            return "For flights, I recommend checking our premium airline partners: Air Peace, Ibom Air, and Arik Air. Economy fares start from $120, premium economy from $180, and business class from $280. Would you like me to search specific routes for you?";
        }
        if (lowerMessage.includes('hotel') || lowerMessage.includes('stay') || lowerMessage.includes('accommodation')) {
            return "We have excellent hotel partnerships worldwide! In major cities, expect $200-$400/night for 4-5 star properties. Beach resorts range from $300-$600/night all-inclusive. Shall I check availability for your dates?";
        }
        if (lowerMessage.includes('car') || lowerMessage.includes('rental') || lowerMessage.includes('vehicle')) {
            return "Car rental options include economy cars from $40/day, SUVs from $85/day, and luxury vehicles from $120/day. All rentals include insurance and unlimited mileage. Which type of vehicle interests you?";
        }
        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
            return "Our travel packages offer great value! Budget trips start from $500, mid-range from $1,200, and luxury from $2,500+ per person. This typically includes flights and accommodation. What's your budget range?";
        }
        if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('best')) {
            return "Popular destinations right now: Bali for beaches, Japan for culture, Italy for food, and Dubai for luxury. For adventure, consider Costa Rica or New Zealand. Where are you thinking of going?";
        }
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return user?.name
                ? `Hi ${user.name}! Ready to plan your next adventure?`
                : "Hi there! I'm here to help you plan your perfect trip. Where shall we start?";
        }
        const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
        return FALLBACK_RESPONSES[randomIndex];
    };
    const handleSend = async () => {
        if (!input.trim() || isLoading)
            return;
        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
            const aiResponse = getFallbackResponse(userMessage);
            setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: aiResponse
                }]);
        }
        catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "I'm here to help with your travel plans! What destination are you considering?"
                }]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    return (<div className="fixed inset-0 z-[60] flex items-end justify-end p-4 pointer-events-none">
      <div className="w-full max-w-md h-[600px] bg-white rounded-3xl shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
        
        <div className="p-6 rounded-t-3xl flex justify-between items-center text-white" style={{ backgroundColor: brandBlue }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold">Travel Assistant</h3>
              <p className="text-xs opacity-90">
                {aiStatus === 'checking' && 'Testing AI connection...'}
                {aiStatus === 'working' && 'AI Assistant'}
                {aiStatus === 'fallback' && 'Fallback Mode'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((m, i) => (<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user'
                ? 'text-white rounded-tr-none'
                : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none'}`} style={m.role === 'user' ? { backgroundColor: brandBlue } : {}}>
                {m.content}
              </div>
            </div>))}
          {isLoading && (<div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 rounded-tl-none flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: brandBlue }}></div>
                <div className="w-2.5 h-2.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: brandBlue }}></div>
                <div className="w-2.5 h-2.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: brandBlue }}></div>
              </div>
            </div>)}
        </div>

        
        <div className="p-4 bg-white border-t border-gray-100 rounded-b-3xl">
          <div className="flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyPress} placeholder="Ask about flights, hotels, or destinations..." className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none text-sm font-medium transition-all" style={{
            '--tw-ring-color': `${brandBlue}40`,
            '--tw-ring-offset-color': 'transparent'
        } as React.CSSProperties}/>
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 text-white rounded-xl transition disabled:opacity-50" style={{
            backgroundColor: brandBlue,
            '--tw-ring-color': `${brandBlue}66`
        } as React.CSSProperties} onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = brandBlueDark;
        }} onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = brandBlue;
        }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
          
          {/* Status Bar */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2 text-xs">
              <span className="text-green-600">Flights</span>
              <span className="text-green-600">Hotels</span>
              <span className="text-green-600">Cars</span>
            </div>
            <button
              onClick={openWhatsApp}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition hover:opacity-80"
              style={{ backgroundColor: '#f0f9f0', color: whatsappGreen }}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/>
              </svg>
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>);
};
export default AIAssistant;
