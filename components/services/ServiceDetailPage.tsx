'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ServiceDetailPageProps {
  service: 'travel' | 'dhl' | 'admissions';
}

const serviceData = {
  travel: {
    title: 'Travel Services (Non-Flight)',
    headline: 'Tailored travel experiences and ticketing solutions for both local and international clients.',
    bannerImage: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=1968&auto=format&fit=crop',
    overview: 'We specialize in organizing and managing tours, excursions, and event ticketing. We do not book or manage flight reservations or offer immigration services. Our focus is providing tailored travel experiences and ticketing solutions for both local and international clients.',
    features: [
      {
        icon: '🗺️',
        title: 'Curated Tours',
        description: 'Bespoke local and international tours designed to provide authentic cultural immersion and unforgettable experiences.'
      },
      {
        icon: '🎟️',
        title: 'Event Ticketing',
        description: 'Access to exclusive events, concerts, and experiences with premium seating and VIP packages.'
      },
      {
        icon: '🏨',
        title: 'Excursions',
        description: 'Carefully planned day trips and excursions to popular destinations and hidden gems.'
      },
      {
        icon: '🚗',
        title: 'Ground Transportation',
        description: 'Private transfers, chauffeur services, and vehicle rentals for seamless travel.'
      },
      {
        icon: '🍽️',
        title: 'Dining Experiences',
        description: 'Reservations at top restaurants and unique culinary experiences around the world.'
      },
      {
        icon: '🎭',
        title: 'Cultural Experiences',
        description: 'Immersive cultural activities, workshops, and behind-the-scenes access.'
      }
    ],
    benefits: [
      'Tailored itineraries designed around your preferences',
      'Expert local guides and insider access',
      'Stress-free planning and booking',
      '24/7 support during your travels',
      'Exclusive experiences not available to the general public'
    ],
    process: [
      {
        step: '01',
        title: 'Consultation',
        description: 'We discuss your travel preferences, interests, and budget.'
      },
      {
        step: '02',
        title: 'Custom Design',
        description: 'We create a personalized itinerary just for you.'
      },
      {
        step: '03',
        title: 'Booking',
        description: 'We handle all reservations and confirmations.'
      },
      {
        step: '04',
        title: 'Enjoy',
        description: 'Experience your journey with our ongoing support.'
      }
    ],
    stats: [
      { value: '500+', label: 'Happy Travelers' },
      { value: '30+', label: 'Destinations' },
      { value: '4.9★', label: 'Customer Rating' },
      { value: '24/7', label: 'Support' }
    ],
    cta: {
      title: 'Ready for Your Next Adventure?',
      description: 'Let us create a personalized travel experience for you',
      buttonText: 'Plan Your Trip',
      buttonLink: '/contact?service=travel'
    }
  },
  dhl: {
    title: 'DHL Franchised Logistics',
    headline: 'Global shipping and localized logistics services powered by our official DHL franchise partnership.',
    bannerImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop',
    overview: 'As an authorized DHL franchise partner, we offer courier and international parcel services. This includes handling document and package shipments, offering tracking support, and providing clients with a secure and efficient logistics solution. Including Hotel Reservations: We provide reliable hotel booking support for travelers, both domestic and international.',
    features: [
      {
        icon: '📦',
        title: 'Courier Services',
        description: 'Fast and reliable document and package shipping locally and internationally.'
      },
      {
        icon: '🌍',
        title: 'International Parcel',
        description: 'Global shipping to over 220 countries with full tracking capabilities.'
      },
      {
        icon: '🔍',
        title: 'Tracking Support',
        description: 'Real-time tracking and proactive notifications for all your shipments.'
      },
      {
        icon: '🏨',
        title: 'Hotel Reservations',
        description: 'Verified accommodations for travelers, both domestic and international.'
      },
      {
        icon: '📄',
        title: 'Document Handling',
        description: 'Secure processing of important documents with delivery confirmation.'
      },
      {
        icon: '⚡',
        title: 'Express Services',
        description: 'Time-critical deliveries with guaranteed delivery windows.'
      }
    ],
    benefits: [
      'Official DHL franchise partner with direct access to DHL systems',
      'Competitive rates through our partnership',
      'Secure and efficient logistics solutions',
      'Comprehensive tracking and support',
      'Integrated hotel booking services'
    ],
    process: [
      {
        step: '01',
        title: 'Request Quote',
        description: 'Contact us with your shipping needs for a competitive quote.'
      },
      {
        step: '02',
        title: 'Prepare Shipment',
        description: 'We guide you on packaging and documentation requirements.'
      },
      {
        step: '03',
        title: 'Ship & Track',
        description: 'We handle pickup and provide real-time tracking information.'
      },
      {
        step: '04',
        title: 'Delivery',
        description: 'Receive confirmation once your shipment reaches its destination.'
      }
    ],
    stats: [
      { value: '220+', label: 'Countries' },
      { value: '24/7', label: 'Tracking' },
      { value: '1000+', label: 'Shipments' },
      { value: '15+', label: 'Years' }
    ],
    cta: {
      title: 'Need to Ship Something?',
      description: 'Get a quote or schedule a pickup today',
      buttonText: 'Request Quote',
      buttonLink: '/contact?service=logistics'
    }
  },
  admissions: {
    title: 'Speedy Admission Processing',
    headline: 'Expert guidance for students seeking admission to international educational institutions.',
    bannerImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2070&auto=format&fit=crop',
    overview: 'We offer advisory services for students seeking admission to international educational institutions. This includes academic counseling and course matching. We do not provide immigration or visa representation services. Our focus is on helping you find the right educational path and successfully navigate the admission process.',
    features: [
      {
        icon: '🎓',
        title: 'Academic Counseling',
        description: 'Personalized guidance to help you choose the right academic path.'
      },
      {
        icon: '🎯',
        title: 'Course Matching',
        description: 'Finding the perfect courses that align with your goals and interests.'
      },
      {
        icon: '📝',
        title: 'Application Support',
        description: 'Assistance with applications, personal statements, and requirements.'
      },
      {
        icon: '🏛️',
        title: 'University Selection',
        description: 'Help identifying institutions that best fit your academic profile.'
      },
      {
        icon: '📚',
        title: 'Document Preparation',
        description: 'Guidance on preparing transcripts, recommendations, and portfolios.'
      },
      {
        icon: '⏱️',
        title: 'Timeline Management',
        description: 'Keeping track of deadlines and requirements throughout the process.'
      }
    ],
    benefits: [
      'Personalized academic counseling',
      'Expert course matching services',
      'Streamlined application process',
      'Access to partner institutions',
      'Ongoing support and guidance'
    ],
    process: [
      {
        step: '01',
        title: 'Initial Consultation',
        description: 'We discuss your academic goals and preferences.'
      },
      {
        step: '02',
        title: 'Course Matching',
        description: 'We identify programs that align with your interests.'
      },
      {
        step: '03',
        title: 'Application Help',
        description: 'We assist with applications and required documents.'
      },
      {
        step: '04',
        title: 'Follow-Up',
        description: 'We track applications and provide updates.'
      }
    ],
    stats: [
      { value: '95%', label: 'Success Rate' },
      { value: '50+', label: 'Partner Schools' },
      { value: '1000+', label: 'Students' },
      { value: '10+', label: 'Countries' }
    ],
    cta: {
      title: 'Ready to Study Abroad?',
      description: 'Book a consultation with our education advisors',
      buttonText: 'Book Consultation',
      buttonLink: '/contact?service=education'
    }
  }
};

export default function ServiceDetailPage({ service }: ServiceDetailPageProps) {
  const data = serviceData[service];

  const getServiceType = () => {
    switch(service) {
      case 'travel': return 'Travel';
      case 'dhl': return 'Logistics';
      case 'admissions': return 'Education';
      default: return '';
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Banner Section */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        <Image
          src={data.bannerImage}
          alt={data.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001f3f]/90 to-[#002b4f]/80" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
            <span className="inline-block px-4 py-2 bg-[#33a8da]/20 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm">
              {getServiceType()}
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 max-w-4xl">
              {data.title}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl leading-relaxed">
              {data.headline}
            </p>
          </div>
        </div>
      </section>

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center text-sm text-gray-500">
          <Link href="/" className="hover:text-[#33a8da] transition">Home</Link>
          <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/services" className="hover:text-[#33a8da] transition">Services</Link>
          <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700 font-medium">{data.title}</span>
        </div>
      </div>

      {/* Overview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            Overview
          </span>
          <p className="text-xl text-gray-600 leading-relaxed">
            {data.overview}
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {data.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-[#33a8da] mb-2">{stat.value}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            What We Offer
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#001f3f] mb-6">
            Key Features
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.features.map((feature, index) => (
            <div 
              key={index}
              className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100"
            >
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-[#001f3f] mb-3 group-hover:text-[#33a8da] transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
              How It Works
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#001f3f] mb-6">
              Simple 4-Step Process
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {data.process.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-lg text-center h-full">
                  <span className="inline-block text-4xl font-black text-[#33a8da] mb-4">{step.step}</span>
                  <h3 className="text-xl font-bold text-[#001f3f] mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < data.process.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <svg className="w-8 h-8 text-[#33a8da]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-[#001f3f] to-[#002b4f] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-semibold mb-4 backdrop-blur-sm">
              Why Choose Us
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Benefits You'll Enjoy
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {data.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="w-8 h-8 bg-[#33a8da] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-gray-100">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center border-2 border-gray-100">
          <h3 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-4">
            {data.cta.title}
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            {data.cta.description}
          </p>
          <Link
            href={data.cta.buttonLink}
            className="inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-[#001f3f] to-[#002b4f] text-white font-semibold rounded-full hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-lg"
          >
            {data.cta.buttonText}
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}