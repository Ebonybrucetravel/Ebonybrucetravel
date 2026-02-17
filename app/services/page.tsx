// app/services/page.tsx
import { pageContentMap } from '@/lib/content';
import ServicesPageContent from '@/components/services/ServicesPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Services | Ebony Bruce Travels',
  description: 'Explore our premium travel and logistics services including DHL shipping, educational admissions, curated tours, and corporate travel solutions.',
};

export default function ServicesPage() {
  const content = pageContentMap['Services'];
  
  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Content Not Found</h1>
          <p className="text-gray-600">Unable to load services page content.</p>
        </div>
      </div>
    );
  }

  return <ServicesPageContent content={content} />;
}