'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorTitle: string;
  authorImage: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  tags: string[];
  featured?: boolean;
}

const BlogPage: React.FC = () => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sample blog posts data - replace with your actual data source
  const blogPosts: BlogPost[] = [
    {
      id: '1',
      slug: 'hotel-booking-comfortable-stay',
      title: 'Hotel Booking: Your Comfortable Stay, Every Time',
      excerpt: 'Discover expert tips and tricks for securing the perfect hotel accommodation, ensuring your comfort and satisfaction wherever you travel.',
      content: 'Full content here...',
      author: 'Ebony Bruce',
      authorTitle: 'Admin',
      authorImage: '/images/logo1.png',
      date: '2026-01-15',
      readTime: '5 min read',
      category: 'Travel Tips',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200',
      tags: ['hotels', 'accommodation', 'travel tips'],
      featured: true
    },
    {
      id: '2',
      slug: 'speedy-admission-processing',
      title: 'Speedy Admission Processing: Your Fast-Track to Studying Abroad',
      excerpt: 'Learn how our accelerated admission processing can help you achieve your dream of studying abroad without the usual waiting times.',
      content: 'Full content here...',
      author: 'Ebony Bruce',
      authorTitle: 'Admin',
      authorImage: '/images/logo1.png',
      date: '2026-01-30',
      readTime: '4 min read',
      category: 'Education',
      image: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      tags: ['study abroad', 'admissions', 'education'],
      featured: true
    },
    {
      id: '3',
      slug: 'dhl-logistics-guide',
      title: 'Mastering International Shipping with DHL Franchised Services',
      excerpt: 'A comprehensive guide to understanding our DHL logistics services and how they can streamline your international shipping needs.',
      content: 'Full content here...',
      author: 'Ebony Bruce',
      authorTitle: 'Admin',
      authorImage: '/images/logo1.png',
      date: '2026-02-11',
      readTime: '6 min read',
      category: 'Logistics',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200',
      tags: ['dhl', 'shipping', 'logistics']
    },
    {
      id: '4',
      slug: 'cultural-tours-uk',
      title: 'Exploring the UK: A Guide to Cultural Tours and Hidden Gems',
      excerpt: 'From historic landmarks to hidden local favorites, discover the best cultural experiences the United Kingdom has to offer.',
      content: 'Full content here...',
      author: 'Ebony Bruce',
      authorTitle: 'Admin',
      authorImage: '/images/logo1.png',
      date: '2026-02-05',
      readTime: '7 min read',
      category: 'Destination Guides',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1200',
      tags: ['uk travel', 'cultural tours', 'europe']
    },
    {
      id: '5',
      slug: 'study-abroad-essentials',
      title: '10 Essential Steps for a Successful Study Abroad Journey',
      excerpt: 'Everything you need to know before embarking on your international education adventure, from visa requirements to cultural adaptation.',
      content: 'Full content here...',
      author: 'Ebony Bruce',
      authorTitle: 'Admin',
      authorImage: '/images/logo1.png',
      date: '2026-02-19',
      readTime: '8 min read',
      category: 'Education',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200',
      tags: ['study abroad', 'student guide', 'preparation']
    },
    {
      id: '6',
      slug: 'budget-travel-tips',
      title: 'Smart Budget Travel: Making the Most of Your Adventure',
      excerpt: 'Learn how to explore the world without breaking the bank with our expert budget travel tips and money-saving strategies.',
      content: 'Full content here...',
      author: 'Ebony Bruce',
      authorTitle: 'Admin',
      authorImage: '/images/logo1.png',
      date: '2026-01-29',
      readTime: '5 min read',
      category: 'Travel Tips',
      image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=1200',
      tags: ['budget travel', 'money saving', 'tips']
    }
  ];

  const categories = [
    { id: 'all', name: 'All Posts', count: blogPosts.length },
    { id: 'Travel Tips', name: 'Travel Tips', count: blogPosts.filter(p => p.category === 'Travel Tips').length },
    { id: 'Education', name: 'Education', count: blogPosts.filter(p => p.category === 'Education').length },
    { id: 'Logistics', name: 'Logistics', count: blogPosts.filter(p => p.category === 'Logistics').length },
    { id: 'Destination Guides', name: 'Destination Guides', count: blogPosts.filter(p => p.category === 'Destination Guides').length },
  ];

  const featuredPosts = blogPosts.filter(post => post.featured);
  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleReadMore = (slug: string) => {
    router.push(`/blog/${slug}`);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#001f3f] to-[#002b4f] text-white py-24">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200" 
            alt="Blog background" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            Ebony Bruce <span className="text-[#33a8da]">Blog</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Insights, guides, and stories from your trusted partner in travel, logistics, and education
          </p>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="w-full md:w-96 relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 outline-none transition"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === category.id
                      ? 'bg-[#33a8da] text-white shadow-lg shadow-blue-500/25'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name} ({category.count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {selectedCategory === 'all' && searchQuery === '' && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-black text-[#001f3f] mb-10 tracking-tight">Featured Stories</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {featuredPosts.map((post) => (
              <div key={post.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300">
                <div className="h-72 overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-[#33a8da] text-white px-4 py-1 rounded-full text-sm font-bold">
                    Featured
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-semibold text-[#33a8da] uppercase tracking-wider">{post.category}</span>
                    <span className="text-sm text-gray-400">{post.readTime}</span>
                  </div>
                  <h3 className="text-2xl font-black text-[#001f3f] mb-4 group-hover:text-[#33a8da] transition">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mb-6 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={post.authorImage} alt={post.author} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-gray-900">{post.author}</p>
                        <p className="text-sm text-gray-500">{post.authorTitle}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleReadMore(post.slug)}
                      className="bg-[#33a8da] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#2c98c7] transition text-sm"
                    >
                      Read More
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Posts Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-[#001f3f] mb-10 tracking-tight">
          {selectedCategory === 'all' ? 'Latest Articles' : selectedCategory}
        </h2>
        
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <article key={post.id} className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="h-56 overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-[#33a8da] uppercase tracking-wider">{post.category}</span>
                    <span className="text-xs text-gray-400">{post.readTime}</span>
                  </div>
                  <h3 className="text-xl font-black text-[#001f3f] mb-3 group-hover:text-[#33a8da] transition line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <img src={post.authorImage} alt={post.author} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-sm font-semibold text-gray-900">{post.author}</span>
                    </div>
                    <button 
                      onClick={() => handleReadMore(post.slug)}
                      className="text-[#33a8da] font-bold text-sm hover:gap-2 flex items-center gap-1 transition-all"
                    >
                      Read <span>→</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-2xl font-bold text-gray-400 mb-2">No articles found</h3>
            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </section>

      {/* Newsletter Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-[#001f3f] mb-4 tracking-tight">Stay Updated</h2>
          <p className="text-gray-600 mb-8">
            Subscribe to our newsletter for the latest travel tips, educational insights, and exclusive offers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-xl border border-gray-200 focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 outline-none"
            />
            <button className="bg-[#33a8da] text-white px-8 py-4 rounded-xl font-black hover:bg-[#2c98c7] transition whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;