export interface ContentSection {
    title: string;
    body: string;
    icon?: string;
  }
  
  export interface PageContent {
    title: string;
    subtitle: string;
    image: string;
    sections: ContentSection[];
  }
  
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
      title: 'Beyond Just Bookings',
      subtitle: 'Comprehensive travel and logistics solutions tailored for the elite.',
      image: 'https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'DHL Logistics', body: 'Through our exclusive franchise partnership, we offer global courier and freight services with real-time tracking.', icon: '📦' },
        { title: 'Educational Admissions', body: 'Fast-track your international study goals with our expert university placement team.', icon: '🎓' },
        { title: 'Curated Tours', body: 'Bespoke itineraries designed by local experts to show you the hidden gems of any destination.', icon: '🗺️' }
      ]
    },
    'DHL Logistics': {
      title: 'Global Logistics Excellence',
      subtitle: 'Official DHL Franchise Partner providing world-class shipping solutions.',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Franchise Reliability', body: 'As an authorized DHL partner, we provide the full suite of international shipping services with the reliability of a global leader and the personal touch of a local agent.', icon: '🏢' },
        { title: 'Real-Time Intelligence', body: 'Our integrated platform allows you to track shipments across 220+ countries with millisecond precision, ensuring your cargo is always visible.', icon: '📡' },
        { title: 'Customs Mastery', body: 'We handle all complex documentation and customs clearance processes, minimizing delays and ensuring compliance with international trade laws.', icon: '⚖️' }
      ]
    },
    'Admission Processing': {
      title: 'Your Global Education Journey',
      subtitle: 'Unprecedented speed and precision in international university placements.',
      image: 'https://images.unsplash.com/photo-1523050338192-067307066a70?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Elite University Network', body: 'We maintain direct relationships with top-tier universities across the UK, USA, Canada, and Europe, giving our applicants a strategic advantage.', icon: '🏛️' },
        { title: 'Speedy Processing', body: 'Our specialized team utilizes optimized workflows to secure admission offers in record time, often cutting standard waiting periods by half.', icon: '⚡' },
        { title: 'Scholarship Guidance', body: 'We don\'t just find you a seat; we help you find funding. Our consultants identify and assist with high-value scholarship applications.', icon: '💎' }
      ]
    },
    'Curated Tours': {
      title: 'Bespoke Travel Chronicles',
      subtitle: 'Authentic cultural immersion and leisure experiences designed specifically for you.',
      image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Expert Local Guides', body: 'Avoid the tourist traps. Our tours are led by local historians, chefs, and artisans who show you the heartbeat of every destination.', icon: '🎭' },
        { title: 'Luxury Logistics', body: 'From private jet transfers to boutique villas, every element of your tour is handled with extreme attention to comfort and privacy.', icon: '🥂' },
        { title: 'Unique Itineraries', body: 'No two tours are the same. We build your experience from the ground up based on your personal interests, dietary needs, and pace.', icon: '🎨' }
      ]
    },
    'Career': {
      title: 'Join the Elite Team',
      subtitle: 'Build the future of travel with Ebony Bruce.',
      image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Why Us?', body: 'Work in a fast-paced, innovative environment with global impact and unlimited growth potential.', icon: '🚀' },
        { title: 'Open Roles', body: 'We are currently hiring for Travel Consultants, Software Engineers, and Logistics Managers.', icon: '💼' }
      ]
    },
    'Sustainability': {
      title: 'Travel with a Conscience',
      subtitle: 'Protecting the destinations we love for generations to come.',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Carbon Offsetting', body: 'Every booking made through Ebony Bruce contributes to global reforestation projects.', icon: '🌱' },
        { title: 'Local Empowerment', body: 'We prioritize local vendors and eco-certified hotels in all our travel packages.', icon: '🤝' }
      ]
    },
    'Help Center': {
      title: 'Here to Assist You',
      subtitle: 'Everything you need to know about your travel plans.',
      image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Booking Management', body: 'How to change, cancel, or upgrade your existing reservations.', icon: '🛠️' },
        { title: 'Refund Policies', body: 'Clear, transparent guidelines on how and when you receive your money back.', icon: '💳' },
        { title: 'Contact Support', body: 'Our dedicated team is available 24/7 via live chat, email, or phone.', icon: '📞' }
      ]
    },
    'Terms of Service': {
      title: 'Terms of Service',
      subtitle: 'Legal framework for using our premium platform.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Acceptance', body: 'By accessing this platform, you agree to comply with our global terms of use.', icon: '📝' },
        { title: 'Liabilities', body: 'Ebony Bruce acts as an intermediary between travelers and service providers.', icon: '⚖️' }
      ]
    },
    'Privacy Policy': {
      title: 'Privacy Policy',
      subtitle: 'How we protect your identity and travel data.',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Data Encryption', body: 'We use 256-bit SSL encryption to ensure your data never falls into the wrong hands.', icon: '🛡️' },
        { title: 'Usage', body: 'Your information is only used to facilitate bookings and improve your travel experience.', icon: '📊' }
      ]
    },
    'Travel Articles': {
      title: 'Ebony Chronicles',
      subtitle: 'Inspiration for your next great adventure.',
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200',
      sections: [
        { title: 'Winter in Japan', body: 'Discover why Hokkaido is the must-visit destination this December.', icon: '❄️' },
        { title: 'Luxury on a Budget', body: 'How to experience 5-star comfort without the 5-star price tag.', icon: '💰' }
      ]
    }
  };