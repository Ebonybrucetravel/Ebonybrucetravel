'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  serviceInterestedIn: string;
  message: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    serviceInterestedIn: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<null | 'success' | 'error'>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const API_BASE_URL = 'https://ebony-bruce-production.up.railway.app/api/v1';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // Map the form service value to match API expected format
      const serviceMapping: { [key: string]: string } = {
        'travel': 'Travel Services',
        'logistics': 'Logistics - DHL',
        'education': 'Educational Consulting',
        'hotel': 'Hotel Reservations',
        'other': 'Other'
      };

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '', // Send empty string if not provided
        serviceInterestedIn: serviceMapping[formData.serviceInterestedIn] || formData.serviceInterestedIn,
        message: formData.message
      };

      console.log('📡 Sending contact form:', payload);

      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('📦 API Response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      // Success
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        serviceInterestedIn: '',
        message: ''
      });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000);

    } catch (err) {
      console.error('❌ Error sending message:', err);
      setSubmitStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
      
      // Reset error message after 5 seconds
      setTimeout(() => {
        setSubmitStatus(null);
        setErrorMessage('');
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Banner Section */}
      <section className="relative bg-gradient-to-br from-[#001f3f] to-[#002b4f] text-white py-24">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&q=80&w=1200" 
            alt="Contact background" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            Ebony Bruce <span className="text-[#33a8da]">Contact</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Get in touch with us for travel, logistics, or educational consulting needs
          </p>
        </div>
      </section>

      {/* Contact Info Cards - Redesigned */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* United Kingdom */}
          <div className="group bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-t-4 border-[#33a8da]">
            <div className="w-16 h-16 bg-[#33a8da]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#33a8da] transition-colors duration-300">
              <svg className="w-8 h-8 text-[#33a8da] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#001f3f] mb-4">United Kingdom</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Call Us</p>
                <a href="tel:+441582340807" className="text-xl font-semibold text-[#33a8da] hover:underline">
                  +44 1582 340807
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Office Address</p>
                <p className="text-gray-600 leading-relaxed">
                  1st Floor, Suite 103, 2-6 Alma Street,<br />
                  Luton, LU1 2PL, United Kingdom
                </p>
              </div>
            </div>
          </div>

          {/* Nigeria */}
          <div className="group bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-t-4 border-[#33a8da]">
            <div className="w-16 h-16 bg-[#33a8da]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#33a8da] transition-colors duration-300">
              <svg className="w-8 h-8 text-[#33a8da] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#001f3f] mb-4">Lagos, Nigeria</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Call Us</p>
                <a href="tel:+2348032416206" className="text-xl font-semibold text-[#33a8da] hover:underline">
                  +234 803 241 6206
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Office Address</p>
                <p className="text-gray-600 leading-relaxed">
                  29 Shipeolu Street, Elediye Bus Stop,<br />
                  Along Ikorodu Road, Somolu, Lagos
                </p>
              </div>
            </div>
          </div>

          {/* Email - Redesigned minimal */}
          <div className="group bg-gradient-to-br from-[#001f3f] to-[#002b4f] rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/20 transition-colors duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Email Us</h3>
            <p className="text-blue-100 mb-4">Available 24/7 - We'll respond within 24 hours</p>
            <a 
              href="mailto:info@ebonybrucetravels.com" 
              className="text-xl font-semibold text-white hover:text-[#33a8da] transition-colors break-all"
            >
              info@ebonybrucetravels.com
            </a>
          </div>
        </div>
      </section>

      {/* UK Map Section - Only UK map shown */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            Our Location
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-4">
            Visit Our UK Office
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            1st Floor, Suite 103, 2-6 Alma Street, Luton, LU1 2PL, United Kingdom
          </p>
        </div>
        
        <div className="relative h-[450px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2458.8988999999997!2d-0.420474!3d51.882!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487642e1a2b1a2b1%3A0x123456789abcdef!2s2-6%20Alma%20St%2C%20Luton%20LU1%202PL%2C%20UK!5e0!3m2!1sen!2sus!4v1644262070680!5m2!1sen!2sus"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            className="absolute inset-0"
            title="UK Office Location"
          />
        </div>
        
        {/* Direction buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <a 
            href="https://maps.google.com/?q=1st+Floor+Suite+103+2-6+Alma+Street+Luton+LU1+2PL" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#001f3f] text-white rounded-full hover:bg-[#002b4f] transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Get Directions
          </a>
          <a 
            href="tel:+441582340807" 
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#001f3f] text-[#001f3f] rounded-full hover:bg-[#001f3f] hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call UK Office
          </a>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100">
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
              Send a Message
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-2">We'd Love to Hear From You</h2>
            <p className="text-gray-600">Fill out the form below and we'll get back to you within 24 hours</p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-center">
              Thank you for your message! We'll contact you soon.
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
              {errorMessage || 'Failed to send message. Please try again.'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#33a8da] focus:border-transparent outline-none transition"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#33a8da] focus:border-transparent outline-none transition"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#33a8da] focus:border-transparent outline-none transition"
                  placeholder="+44 1582 340807"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Interested In *</label>
                <select
                  name="serviceInterestedIn"
                  value={formData.serviceInterestedIn}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#33a8da] focus:border-transparent outline-none transition"
                >
                  <option value="">Select a service</option>
                  <option value="travel">Travel Services</option>
                  <option value="logistics">Logistics - DHL</option>
                  <option value="education">Educational Consulting</option>
                  <option value="hotel">Hotel Reservations</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#33a8da] focus:border-transparent outline-none transition resize-none"
                placeholder="Tell us how we can help you..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#001f3f] to-[#002b4f] text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Message'
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Operating Hours Section */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
              Operating Hours
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-4">
              When to Reach Us
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-[#33a8da]/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#33a8da]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#001f3f]">Weekly Schedule</h3>
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div className="flex justify-between items-center text-lg border-b border-gray-100 pb-3">
                  <span className="text-gray-600 font-medium">Monday - Friday</span>
                  <span className="font-bold text-[#001f3f]">10:00 AM – 8:00 PM</span>
                </div>
                <div className="flex justify-between items-center text-lg border-b border-gray-100 pb-3">
                  <span className="text-gray-600 font-medium">Saturday</span>
                  <span className="font-bold text-[#33a8da]">Closed</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600 font-medium">Sunday</span>
                  <span className="font-bold text-[#33a8da]">Closed</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-gray-500">
                  For urgent matters, please call our UK office during operating hours or email us anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            Quick Answers
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Do you book flights?",
              a: "No, we specialize in non-flight travel services including tours, excursions, and event ticketing. For flights, we recommend working with your preferred airline directly."
            },
            {
              q: "What DHL services do you offer?",
              a: "As an authorized DHL franchise partner, we offer courier services, international parcel shipping, document handling, and package tracking services."
            },
            {
              q: "Do you provide visa assistance?",
              a: "We do not provide immigration or visa representation services. Our educational consulting focuses on academic counseling and course matching only."
            },
            {
              q: "What are your operating hours?",
              a: "We are open Monday to Friday from 10:00 AM to 8:00 PM. We are closed on Saturdays and Sundays, but you can always reach us via email."
            }
          ].map((faq, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-[#001f3f] mb-2">{faq.q}</h3>
              <p className="text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-[#001f3f] to-[#002b4f] rounded-3xl p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">Prefer to speak with us directly?</h3>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Call our UK office or send us an email. We're here to help
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:+441582340807"
                className="inline-flex items-center justify-center px-8 py-4 bg-[#33a8da] text-white font-semibold rounded-full hover:bg-[#2b8bb5] transform hover:scale-105 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call UK Office
              </a>
              <a
                href="mailto:info@ebonybrucetravels.com"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-[#001f3f] transform hover:scale-105 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Email
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}