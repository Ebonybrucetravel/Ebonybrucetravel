// lib/content.ts
import { PageContent } from '../lib/types';

export const pageContentMap: Record<string, PageContent> = {
  'About Us': {
    title: 'Redefining the Art of Travel',
    subtitle: 'Ebony Bruce Travels is not just a booking agency; we are architects of global experiences.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { 
        title: 'Who We Are', 
        body: 'Ebony Bruce Travels Limited is a premium, full-service travel management company dedicated to providing seamless, luxury, and professional travel solutions. Based in Nigeria with a global footprint, we cater to discerning travelers who value precision, comfort, and personalized service.', 
        icon: '💎' 
      },
      { 
        title: 'Our Mission', 
        body: 'To transform the way people experience the world by providing innovative, stress-free, and high-quality travel services that exceed expectations, every single time.', 
        icon: '🎯' 
      },
      { 
        title: 'Global Accreditation', 
        body: 'As a fully accredited IATA agent and partner with world-leading airlines like Lufthansa, Air France-KLM, and Qatar Airways, we offer our clients exclusive access to the best fares and priority services globally.', 
        icon: '🌍' 
      },
      { 
        title: 'The Ebony Standard', 
        body: 'We believe in transparency, integrity, and excellence. Whether it is a corporate mission, a family vacation, or specialized logistics through our DHL franchise, we apply the same rigorous standard of quality.', 
        icon: '👑' 
      },
      { 
        title: 'Why Choose Us', 
        body: 'Our team of expert consultants combines years of industry experience with the latest travel technology to provide real-time support, bespoke itineraries, and proactive problem-solving for every client.', 
        icon: '✅' 
      }
    ]
  },
  'Services': {
    title: 'Premium Travel & Logistics Solutions',
    subtitle: 'Experience world-class service backed by integrity, excellence, and a commitment to your satisfaction.',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200',
    sections: [
      // Header Section
      { 
        title: 'Our Services', 
        body: 'Comprehensive travel and logistics solutions tailored for the discerning traveler.',
        icon: '✨',
        image: 'https://images.unsplash.com/photo-1606768666852-3f4b0c5b5b5b?auto=format&fit=crop&q=80&w=800'
      },
      
      // Services Grid - Row 1
      { 
        title: 'DHL Logistics', 
        body: 'Global courier and freight services with real-time tracking and customs clearance assistance. Official DHL franchise partner ensuring worldwide delivery excellence.',
        icon: '📦',
        image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800',
        highlight: true
      },
      { 
        title: 'Educational Admissions', 
        body: 'End-to-end university placement services including course selection, application processing, visa guidance, and scholarship opportunities.',
        icon: '🎓',
        image: 'https://images.unsplash.com/photo-1523050338192-067307066a70?auto=format&fit=crop&q=80&w=800',
        highlight: true
      },
      { 
        title: 'Curated Tours', 
        body: 'Bespoke itineraries designed by local experts. From luxury safaris to cultural immersions, every journey is uniquely tailored to your preferences.',
        icon: '🗺️',
        image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800',
        highlight: true
      },
      
      // Services Grid - Row 2
      { 
        title: 'Corporate Travel', 
        body: 'Streamlined business travel solutions including priority booking, expense management, and 24/7 executive support.',
        icon: '🏢',
        image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=800',
        highlight: true
      },
      { 
        title: 'Luxury Concierge', 
        body: 'VIP services including private jet charters, yacht rentals, and exclusive access to high-end events and experiences.',
        icon: '👑',
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
        highlight: true
      },
      { 
        title: 'Visa Assistance', 
        body: 'Expert guidance through complex visa applications with document preparation and interview coaching.',
        icon: '🛂',
        image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&q=80&w=800',
        highlight: true
      },
      
      // Core Values Section Header
      { 
        title: 'Our Core Values', 
        body: 'The principles that guide every interaction, every booking, and every journey we curate.',
        icon: '⭐',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800'
      },
      
      // Core Values Grid - Row 1
      { 
        title: 'Integrity', 
        body: 'We build trust through honesty and transparency, ensuring every interaction is fair and clear. No hidden fees, no fine print—just straightforward, ethical service.',
        icon: '🤝',
        image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800'
      },
      { 
        title: 'Excellence', 
        body: 'We deliver services of the highest quality, always striving for perfection. From flight bookings to complex logistics, every detail meets our rigorous standards.',
        icon: '🏆',
        image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=800'
      },
      { 
        title: 'Customer Satisfaction', 
        body: 'Our clients come first. We listen, serve, and support to make their experience exceptional. Your journey is our priority, from first inquiry to safe return.',
        icon: '😊',
        image: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=800'
      },
      
      // Core Values Grid - Row 2
      { 
        title: 'Innovation', 
        body: 'We embrace change and seek smarter, better ways to serve our clients. Leveraging cutting-edge technology and industry insights to enhance every aspect of your travel experience.',
        icon: '💡',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800'
      },
      { 
        title: 'Teamwork', 
        body: 'We grow and win together, collaborating across departments to achieve your goals. Our integrated approach ensures seamless service delivery at every touchpoint.',
        icon: '👥',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800'
      },
      
      // Why Choose Us Section
      { 
        title: 'Why Choose Ebony Bruce Travels', 
        body: 'Experience the difference that comes with unparalleled expertise, global accreditation, and a personal touch that sets us apart.',
        icon: '✨',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800'
      },
      { 
        title: 'IATA Accredited', 
        body: 'Fully accredited IATA agent with access to exclusive fares and priority services globally.',
        icon: '🌍',
        image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800'
      },
      { 
        title: '24/7 Support', 
        body: 'Round-the-clock assistance from our dedicated team of travel experts, anytime, anywhere.',
        icon: '🕐',
        image: 'https://images.unsplash.com/photo-1573497491765-dccce02b29df?auto=format&fit=crop&q=80&w=800'
      }
    ]
  },
  'DHL Logistics': {
    title: 'Global Logistics Excellence',
    subtitle: 'Official DHL Franchise Partner providing world-class shipping solutions.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Franchise Reliability', body: 'As an authorized DHL partner, we provide the full suite of international shipping services with the reliability of a global leader and the personal touch of a local agent.', icon: '🏢' },
      { title: 'Real-Time Intelligence', body: 'Our integrated platform allows you to track shipments across 220+ countries with millisecond precision, ensuring your cargo is always visible.', icon: '📡' },
      { title: 'Customs Mastery', body: 'We handle all complex documentation and customs clearance processes, minimizing delays and ensuring compliance with international trade laws.', icon: '⚖️' },
      { title: 'Express Shipping', body: 'Time-critical deliveries handled with priority, featuring dedicated courier services and guaranteed delivery windows.', icon: '⚡' },
      { title: 'Freight Services', body: 'Comprehensive air and ocean freight solutions for businesses of all sizes, with flexible pricing and scheduling options.', icon: '🚢' }
    ]
  },
  'Admission Processing': {
    title: 'Your Global Education Journey',
    subtitle: 'Unprecedented speed and precision in international university placements.',
    image: 'https://images.unsplash.com/photo-1523050338192-067307066a70?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Elite University Network', body: 'We maintain direct relationships with top-tier universities across the UK, USA, Canada, and Europe, giving our applicants a strategic advantage.', icon: '🏛️' },
      { title: 'Speedy Processing', body: 'Our specialized team utilizes optimized workflows to secure admission offers in record time, often cutting standard waiting periods by half.', icon: '⚡' },
      { title: 'Scholarship Guidance', body: 'We don\'t just find you a seat; we help you find funding. Our consultants identify and assist with high-value scholarship applications.', icon: '💎' },
      { title: 'Visa Support', body: 'Expert guidance through the complex student visa application process, with document preparation and interview coaching.', icon: '🛂' },
      { title: 'Pre-Departure Services', body: 'Comprehensive support including accommodation arrangements, travel booking, and cultural orientation sessions.', icon: '✈️' }
    ]
  },
  'Curated Tours': {
    title: 'Bespoke Travel Chronicles',
    subtitle: 'Authentic cultural immersion and leisure experiences designed specifically for you.',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Expert Local Guides', body: 'Avoid the tourist traps. Our tours are led by local historians, chefs, and artisans who show you the heartbeat of every destination.', icon: '🎭' },
      { title: 'Luxury Logistics', body: 'From private jet transfers to boutique villas, every element of your tour is handled with extreme attention to comfort and privacy.', icon: '🥂' },
      { title: 'Unique Itineraries', body: 'No two tours are the same. We build your experience from the ground up based on your personal interests, dietary needs, and pace.', icon: '🎨' },
      { title: 'Group Experiences', body: 'Curated journeys for families, friends, and corporate groups featuring exclusive access and VIP treatment throughout.', icon: '👪' },
      { title: 'Adventure Travel', body: 'Off-the-beaten-path expeditions for the intrepid traveler, combining luxury comfort with authentic experiences.', icon: '🏔️' }
    ]
  },
  'Career': {
    title: 'Join the Elite Team',
    subtitle: 'Build the future of travel with Ebony Bruce.',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Why Us?', body: 'Work in a fast-paced, innovative environment with global impact and unlimited growth potential.', icon: '🚀' },
      { title: 'Open Roles', body: 'We are currently hiring for Travel Consultants, Software Engineers, and Logistics Managers.', icon: '💼' },
      { title: 'Our Culture', body: 'Join a team that values integrity, excellence, and collaboration. We invest in our people and celebrate diverse perspectives.', icon: '🌟' },
      { title: 'Benefits', body: 'Competitive compensation, professional development opportunities, and exclusive travel perks for our team members.', icon: '🎁' }
    ]
  },
  'Sustainability': {
    title: 'Travel with a Conscience',
    subtitle: 'Protecting the destinations we love for generations to come.',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Carbon Offsetting', body: 'Every booking made through Ebony Bruce contributes to global reforestation projects.', icon: '🌱' },
      { title: 'Local Empowerment', body: 'We prioritize local vendors and eco-certified hotels in all our travel packages.', icon: '🤝' },
      { title: 'Responsible Tourism', body: 'Educating travelers on preserving cultural heritage and minimizing environmental impact.', icon: '🌍' },
      { title: 'Community Support', body: 'Partnering with local communities to ensure tourism benefits flow directly to those who need it most.', icon: '🏘️' }
    ]
  },
  'Help Center': {
    title: 'Here to Assist You',
    subtitle: 'Everything you need to know about your travel plans.',
    image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Booking Management', body: 'How to change, cancel, or upgrade your existing reservations.', icon: '🛠️' },
      { title: 'Refund Policies', body: 'Clear, transparent guidelines on how and when you receive your money back.', icon: '💳' },
      { title: 'Contact Support', body: 'Our dedicated team is available 24/7 via live chat, email, or phone.', icon: '📞' },
      { title: 'FAQs', body: 'Quick answers to commonly asked questions about our services and policies.', icon: '❓' },
      { title: 'Travel Advisories', body: 'Stay informed with the latest travel alerts and destination-specific guidance.', icon: '⚠️' }
    ]
  },
  'Terms of Service': {
    title: 'Terms of Service',
    subtitle: 'Legal framework for using our premium platform.',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Acceptance', body: 'By accessing this platform, you agree to comply with our global terms of use.', icon: '📝' },
      { title: 'Liabilities', body: 'Ebony Bruce acts as an intermediary between travelers and service providers.', icon: '⚖️' },
      { title: 'Payment Terms', body: 'Information about deposits, final payments, and accepted payment methods.', icon: '💰' },
      { title: 'Cancellation Policy', body: 'Detailed guidelines on cancellation procedures and applicable fees.', icon: '📅' }
    ]
  },
  'Privacy Policy': {
    title: 'Privacy Policy',
    subtitle: 'How we protect your identity and travel data.',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Data Encryption', body: 'We use 256-bit SSL encryption to ensure your data never falls into the wrong hands.', icon: '🛡️' },
      { title: 'Usage', body: 'Your information is only used to facilitate bookings and improve your travel experience.', icon: '📊' },
      { title: 'Data Retention', body: 'How long we keep your information and your rights to request deletion.', icon: '⏱️' },
      { title: 'Third-Party Sharing', body: 'When and how we share your data with trusted partners to fulfill your bookings.', icon: '🔄' }
    ]
  },
  'Travel Articles': {
    title: 'Ebony Chronicles',
    subtitle: 'Inspiration for your next great adventure.',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200',
    sections: [
      { title: 'Winter in Japan', body: 'Discover why Hokkaido is the must-visit destination this December.', icon: '❄️' },
      { title: 'Luxury on a Budget', body: 'How to experience 5-star comfort without the 5-star price tag.', icon: '💰' },
      { title: 'Hidden Gems of Italy', body: 'Beyond Rome and Venice: exploring Italy\'s best-kept secrets.', icon: '🇮🇹' },
      { title: 'Business Travel Tips', body: 'Maximize productivity and comfort on your next corporate journey.', icon: '💼' }
    ]
  }
};