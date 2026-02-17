// app/services/[slug]/page.tsx
import { pageContentMap } from '@/lib/content';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface ServicePageProps {
  params: {
    slug: string;
  };
}

export function generateMetadata({ params }: ServicePageProps): Metadata {
  const services = pageContentMap['Services'].sections.slice(1, 7);
  const service = services.find(
    s => s.title.toLowerCase().replace(/\s+/g, '-') === params.slug
  );

  if (!service) {
    return {
      title: 'Service Not Found | Ebony Bruce Travels',
    };
  }

  return {
    title: `${service.title} | Ebony Bruce Travels`,
    description: service.body.substring(0, 160),
  };
}

export default function ServiceDetailPage({ params }: ServicePageProps) {
  const services = pageContentMap['Services'].sections.slice(1, 7);
  const service = services.find(
    s => s.title.toLowerCase().replace(/\s+/g, '-') === params.slug
  );

  if (!service) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] w-full">
        <div className="absolute inset-0">
          <Image
            src={service.image || pageContentMap['Services'].image}
            alt={service.title}
            fill
            className="object-cover brightness-50"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="text-white">
            <Link 
              href="/services" 
              className="inline-flex items-center text-gray-300 hover:text-white mb-6 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Services
            </Link>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">{service.title}</h1>
            <p className="text-xl md:text-2xl text-gray-200 leading-relaxed max-w-3xl">
              {service.body}
            </p>
          </div>
        </div>
      </section>

      {/* Service Details */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="prose prose-lg max-w-none">
          <h2>About This Service</h2>
          <p>
            At Ebony Bruce Travels, we deliver this service with the highest standards of 
            professionalism and care, guided by our core values of integrity, excellence, 
            and customer satisfaction.
          </p>
          
          <h3>Key Features</h3>
          <ul>
            <li>Expert consultants with years of industry experience</li>
            <li>Personalized solutions tailored to your needs</li>
            <li>24/7 support and assistance</li>
            <li>Competitive pricing and transparent fees</li>
            <li>Seamless integration with our other services</li>
          </ul>

          <h3>Why Choose Our {service.title} Service</h3>
          <p>
            Our {service.title.toLowerCase()} service is designed to provide you with 
            the highest level of convenience and peace of mind. We handle all the details 
            so you can focus on what matters most.
          </p>

          <div className="bg-gray-50 p-8 rounded-2xl mt-8 not-prose">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Ready to Get Started?</h3>
            <p className="text-gray-600 mb-6">
              Contact our team today to learn more about our {service.title} service 
              and how we can help you achieve your goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#B11E43] text-white font-semibold rounded-full hover:bg-[#8f1836] transition-colors"
              >
                Contact Us
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-[#B11E43] text-[#B11E43] font-semibold rounded-full hover:bg-[#B11E43] hover:text-white transition-colors"
              >
                Make a Booking
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}