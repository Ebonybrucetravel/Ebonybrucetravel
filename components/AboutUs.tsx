"use client";
import React from "react";
import { useLanguage } from "../context/LanguageContext";

interface AboutUsProps {
  onBack: () => void;
  onNavigateToBlog?: (slug: string) => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onBack, onNavigateToBlog }) => {
  const { t } = useLanguage();

  const team = [
    {
      name: "Bruce Ayobami Benjamin",
      title: t("about.team.bruceTitle"),
      img: "/images/bruce.png",
    },
    {
      name: "Ojo Afolabi Sunday",
      title: t("about.team.ojoTitle"),
      img: "/images/Ojo.png",
    },
    {
      name: "ADETUNMBI Yetunde Oluwafunto",
      title: t("about.team.adeTitle"),
      img: "/images/ade.png",
    },
    {
      name: "James Olabisi Ogundele",
      title: t("about.team.jamesTitle"),
      img: "/images/James.jpg",
    },
  ];

  const blogPosts = [
    {
      slug: "hotel-booking-comfortable-stay",
      title: t("about.blogPost1.title"),
      img: "https://plus.unsplash.com/premium_photo-1682089290752-2bd553508b29?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      slug: "speedy-admission-processing",
      title: t("about.blogPost2.title"),
      img: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ];

  const handleBlogClick = (slug: string) => {
    if (onNavigateToBlog) {
      onNavigateToBlog(slug);
    } else {
      window.location.href = `/blog/${slug}`;
    }
  };

  return (
    <div className="bg-white min-h-screen animate-in fade-in duration-500">
      {/* 1. Header Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-6 border-b border-gray-50 flex items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#33a8da] transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
          {t("about.backToHome")}
        </button>
      </div>

      {/* Banner Section */}
      <section className="relative bg-gradient-to-br from-[#001f3f] to-[#002b4f] text-white py-24">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200"
            alt={t("about.bannerAlt")}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            Ebony Bruce Travels
            <span className="text-[#33a8da]">
              <br />
              {t("about.bannerTitle")}
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {t("about.bannerSubtitle")}
          </p>
        </div>
      </section>

      {/* 2. Our Story Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Image Grid with Timeline */}
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="space-y-4">
              <div className="h-64 rounded-xl overflow-hidden shadow-lg">
                <img
                  src="/images/about.jpg"
                  className="w-full h-full object-cover"
                  alt={t("about.story.imgAlt1")}
                />
              </div>
              <div className="h-[400px] rounded-xl overflow-hidden shadow-lg relative">
                <img
                  src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=600"
                  className="w-full h-full object-cover"
                  alt={t("about.story.imgAlt2")}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/95 backdrop-blur p-8 rounded-xl shadow-2xl text-center transform translate-y-24">
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">
                      12+
                    </p>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {t("about.story.yearsOfExcellence")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-12">
              <div className="h-80 rounded-xl overflow-hidden shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=600"
                  className="w-full h-full object-cover"
                  alt={t("about.story.imgAlt3")}
                />
              </div>
            </div>

            {/* Timeline Badge */}
            <div className="absolute -bottom-6 left-4 bg-[#001f3f] text-white px-6 py-3 rounded-xl shadow-xl">
              <p className="text-sm font-bold tracking-wide">
                {t("about.story.timeline")}
              </p>
            </div>
          </div>

          {/* Story Content */}
          <div className="space-y-8">
            <div>
              <h4 className="text-[#33a8da] font-black text-sm uppercase tracking-widest mb-4">
                {t("about.story.ourJourney")}
              </h4>
              <h1 className="text-4xl lg:text-5xl font-black text-[#001f3f] tracking-tighter leading-tight mb-8">
                {t("about.story.title")}
              </h1>
            </div>

            <div className="space-y-6 text-gray-600 leading-relaxed">
              <p className="text-lg font-medium">
                <span className="text-[#001f3f] font-black">
                  Ebony Bruce Travels Ltd
                </span>{" "}
                {t("about.story.paragraph1")}
              </p>

              <div className="bg-gray-50 p-6 rounded-xl border-l-4 border-[#33a8da] my-8">
                <p className="italic text-gray-700">
                  "{t("about.story.quote")}"
                </p>
              </div>

              <p>{t("about.story.paragraph2")}</p>

              <p>{t("about.story.paragraph3")}</p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {[
                  t("about.story.service1"),
                  t("about.story.service2"),
                  t("about.story.service3"),
                  t("about.story.service4"),
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#33a8da]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="font-bold text-[#001f3f]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Our Impact/Welcome Section */}
      <section className="bg-gradient-to-br from-[#001f3f] to-[#002b4f] py-24 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-8 tracking-tight">
            {t("about.welcome.title")}
          </h2>
          <div className="w-20 h-1 bg-[#33a8da] mx-auto mb-10"></div>
          <p className="text-xl text-gray-200 leading-relaxed mb-8">
            {t("about.welcome.paragraph1")}
          </p>
          <p className="text-gray-300 leading-relaxed">
            {t("about.welcome.paragraph2")}
          </p>
        </div>
      </section>

      {/* 4. Why Choose Us Section */}
      <section className="bg-[#121212] py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200"
            className="w-full h-full object-cover grayscale"
            alt=""
          />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <p className="text-[#33a8da] font-bold uppercase tracking-widest text-sm mb-4">
              {t("about.whyChooseUs.sectionTitle")}
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              {t("about.whyChooseUs.title")}
            </h2>
            <p className="text-gray-400 mt-6 max-w-2xl mx-auto">
              {t("about.whyChooseUs.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: t("about.whyChooseUs.item1Title"),
                desc: t("about.whyChooseUs.item1Desc"),
              },
              {
                title: t("about.whyChooseUs.item2Title"),
                desc: t("about.whyChooseUs.item2Desc"),
              },
              {
                title: t("about.whyChooseUs.item3Title"),
                desc: t("about.whyChooseUs.item3Desc"),
              },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className="w-20 h-20 bg-[#33a8da]/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition border border-[#33a8da]/20">
                  <span className="text-3xl font-black text-[#33a8da]">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mb-4">
                  {item.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Team Section */}
      <section className="max-w-7xl mx-auto px-6 py-32 text-center">
        <p className="text-[#33a8da] font-bold uppercase tracking-widest text-sm mb-4">
          {t("about.team.sectionTitle")}
        </p>
        <h2 className="text-4xl md:text-5xl font-black text-[#001f3f] tracking-tighter mb-4">
          {t("about.team.title")}
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto mb-12">
          {t("about.team.subtitle")}
        </p>
        <div className="w-16 h-1 bg-[#33a8da] mx-auto mb-20 rounded-full"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {team.map((member) => (
            <div key={member.name} className="group">
              <div className="aspect-square rounded-2xl overflow-hidden mb-6 shadow-md transition-all duration-500 group-hover:shadow-2xl">
                <img
                  src={member.img}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                  alt={member.name}
                />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight px-4">
                {member.name}
              </h3>
              <p className="text-gray-400 font-bold italic text-sm mt-2">
                {member.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Blog Section */}
      <section className="bg-gray-50/50 py-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[#33a8da] font-bold uppercase tracking-widest text-sm mb-4">
            {t("about.blog.sectionTitle")}
          </p>
          <h2 className="text-4xl font-black text-[#001f3f] tracking-tighter mb-4">
            {t("about.blog.title")}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-16">
            {t("about.blog.subtitle")}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left">
            {blogPosts.map((post) => (
              <div
                key={post.title}
                className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 group"
              >
                <div className="h-80 overflow-hidden">
                  <img
                    src={post.img}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                    alt={post.title}
                  />
                </div>
                <div className="p-10 space-y-8">
                  <h3 className="text-2xl font-black text-[#001f3f] tracking-tight leading-tight">
                    {post.title}
                  </h3>
                  <button
                    onClick={() => handleBlogClick(post.slug)}
                    className="bg-[#33a8da] text-white font-black px-10 py-4 rounded-xl hover:bg-[#2c98c7] transition active:scale-95 text-sm uppercase tracking-widest shadow-lg"
                  >
                    {t("about.blog.readMore")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;