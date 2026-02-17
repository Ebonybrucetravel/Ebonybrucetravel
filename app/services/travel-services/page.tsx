import ServiceDetailPage from '@/components/services/ServiceDetailPage';

export const metadata = {
  title: 'Travel Services (Non-Flight) | Ebony Bruce Travels',
  description: 'Specialized in organizing and managing tours, excursions, and event ticketing. Tailored travel experiences for local and international clients.',
};

export default function TravelServicesPage() {
  return <ServiceDetailPage service="travel" />;
}