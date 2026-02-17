import ServiceDetailPage from '@/components/services/ServiceDetailPage';

export const metadata = {
  title: 'Speedy Admission Processing | Ebony Bruce Travels',
  description: 'Advisory services for students seeking admission to international educational institutions. Academic counseling and course matching.',
};

export default function AdmissionProcessingPage() {
  return <ServiceDetailPage service="admissions" />;
}