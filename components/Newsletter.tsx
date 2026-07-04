import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface NewsletterResponse {
  success: boolean;
  message?: string;
}

const Newsletter: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: t('newsletter.invalidEmail') || 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // ✅ Use environment variable for backend URL
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ebony-bruce-backend-production.up.railway.app';
      const response = await fetch(`${API_BASE}/api/v1/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data: NewsletterResponse = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || t('newsletter.success') || 'You have been subscribed!' });
        setEmail('');
      } else {
        setMessage({
          type: 'error',
          text: data.message || t('newsletter.error') || 'Something went wrong. Please try again.',
        });
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setMessage({ type: 'error', text: t('newsletter.error') || 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white py-24">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
          {t('newsletter.title')}
        </h2>
        <p className="text-gray-500 mb-10 tracking-widest text-sm font-bold uppercase">
          {t('newsletter.subtitle')}
        </p>
        <form className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder={t('newsletter.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-6 py-4 focus:outline-none text-gray-900 font-medium placeholder-gray-400 border-2 border-gray-200 rounded-xl focus:border-[#32A6D7] transition-colors duration-200"
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#32A6D7] text-white font-bold px-10 py-4 rounded-xl hover:bg-[#2B94C6] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('newsletter.subscribing') || 'Subscribing...' : t('newsletter.subscribe')}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </section>
  );
};

export default Newsletter;