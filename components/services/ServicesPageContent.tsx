"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { PageContent } from "@/lib/types";

interface ServicesPageContentProps {
  content: PageContent;
}

export default function ServicesPageContent({
  content,
}: ServicesPageContentProps) {
  const { t } = useLanguage();

  // Split sections into groups based on your content
  const serviceSections = content.sections.slice(1, 4); // 3 core sectors
  const valuesSections = content.sections.slice(8, 13); // 5 core values
  const whyChooseSections = content.sections.slice(13); // Why choose us items

  return (
    <main className="min-h-screen bg-white">
      {/* Banner Section */}
      <section className="relative bg-gradient-to-br from-[#001f3f] to-[#002b4f] text-white py-24">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200"
            alt={t("services.banner.alt")}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            Ebony Bruce Travels <span className="text-[#33a8da]">{t("services.banner.title")}</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {t("services.banner.subtitle")}
          </p>
        </div>
      </section>

      {/* Core Sectors Section */}
      <section
        id="services"
        className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            {t("services.coreSectors.label")}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#001f3f] mb-6">
            {content.sections[0].title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t("services.coreSectors.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Travel Services */}
          <div className="group relative bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            <div className="relative h-48 w-full overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=1968&auto=format&fit=crop"
                alt={t("services.travel.alt")}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001f3f]/80 to-transparent" />
              <div className="absolute bottom-4 left-4 text-4xl bg-white/20 backdrop-blur-sm w-16 h-16 rounded-2xl flex items-center justify-center">
                ✈️
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-bold text-[#001f3f] mb-4">
                {t("services.travel.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {t("services.travel.desc1")}
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                {t("services.travel.desc2")}
              </p>
              <Link
                href="/services/travel-services"
                className="inline-flex items-center text-[#33a8da] font-semibold group-hover:gap-2 transition-all"
              >
                {t("services.travel.learnMore")}
                <svg
                  className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Logistics - DHL - FIXED: Changed from services.logistics.* to services.logisticsDetail.* */}
          <div className="group relative bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            <div className="relative h-48 w-full overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
                alt={t("services.logisticsDetail.alt")}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001f3f]/80 to-transparent" />
              <div className="absolute bottom-4 left-4 text-4xl bg-white/20 backdrop-blur-sm w-16 h-16 rounded-2xl flex items-center justify-center">
                📦
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-bold text-[#001f3f] mb-4">
                {t("services.logisticsDetail.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {t("services.logisticsDetail.desc1")}
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
               
              </p>
              <Link
                href="/services/dhl-logistics"
                className="inline-flex items-center text-[#33a8da] font-semibold group-hover:gap-2 transition-all"
              >
                {t("services.logisticsDetail.learnMore")}
                <svg
                  className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Educational Consulting - FIXED: Changed from services.admission.* to services.admissionDetail.* */}
          <div className="group relative bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            <div className="relative h-48 w-full overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2070&auto=format&fit=crop"
                alt={t("services.admissionDetail.alt")}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001f3f]/80 to-transparent" />
              <div className="absolute bottom-4 left-4 text-4xl bg-white/20 backdrop-blur-sm w-16 h-16 rounded-2xl flex items-center justify-center">
                🎓
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-bold text-[#001f3f] mb-4">
                {t("services.admissionDetail.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {t("services.admissionDetail.desc1")}
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
             
              </p>
              <Link
                href="/services/admission-processing"
                className="inline-flex items-center text-[#33a8da] font-semibold group-hover:gap-2 transition-all"
              >
                {t("services.admissionDetail.learnMore")}
                <svg
                  className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement Section */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            {t("services.mission.label")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-6">
            {content.sections[7]?.title || t("services.mission.title")}
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            {content.sections[7]?.body || t("services.mission.body")}
          </p>
          <div className="bg-[#33a8da] text-white p-6 rounded-2xl">
            <p className="text-xl italic">
              {t("services.mission.quote")}
            </p>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop"
            alt={t("services.values.alt")}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#001f3f]/95 to-[#002b4f]/95" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-white font-semibold mb-4 backdrop-blur-sm">
              {t("services.values.foundation")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("services.values.title")}
            </h2>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              {t("services.values.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "⚡",
                title: t("services.values.integrity.title"),
                desc: t("services.values.integrity.desc"),
              },
              {
                icon: "⭐",
                title: t("services.values.excellence.title"),
                desc: t("services.values.excellence.desc"),
              },
              {
                icon: "❤️",
                title: t("services.values.customerSatisfaction.title"),
                desc: t("services.values.customerSatisfaction.desc"),
              },
              {
                icon: "💡",
                title: t("services.values.innovation.title"),
                desc: t("services.values.innovation.desc"),
              },
              {
                icon: "🤝",
                title: t("services.values.teamwork.title"),
                desc: t("services.values.teamwork.desc"),
              },
            ].map((value, index) => (
              <div
                key={index}
                className="group relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:transform hover:-translate-y-2"
              >
                <div className="text-5xl mb-4 text-[#33a8da]">{value.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#33a8da] transition-colors">
                  {value.title}
                </h3>
                <p className="text-gray-100 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            {t("services.whyUs.label")}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#001f3f] mb-6">
            {t("services.whyUs.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t("services.whyUs.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: "🌍",
              title: t("services.whyUs.globalReach.title"),
              body: t("services.whyUs.globalReach.body"),
              image:
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
            },
            {
              icon: "🤝",
              title: t("services.whyUs.personalizedService.title"),
              body: t("services.whyUs.personalizedService.body"),
              image:
                "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop",
            },
            {
              icon: "✓",
              title: t("services.whyUs.trustedPartner.title"),
              body: t("services.whyUs.trustedPartner.body"),
              image:
                "https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=2073&auto=format&fit=crop",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-3xl overflow-hidden border border-gray-200 hover:border-[#33a8da] transition-all duration-500 hover:shadow-2xl"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001f3f]/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-5xl bg-white/20 backdrop-blur-sm w-16 h-16 rounded-2xl flex items-center justify-center">
                  {item.icon}
                </div>
              </div>
              <div className="p-8 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#33a8da] transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
            alt={t("services.stats.alt")}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#001f3f]/90 to-[#002b4f]/90" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "500+", label: t("stats.customers") },
              { number: "50+", label: t("services.stats.countries") },
              { number: "50+", label: t("stats.partners") },
              { number: "24/7", label: t("stats.support") },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-white/80 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-4xl overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2074&auto=format&fit=crop"
              alt={t("services.cta.alt")}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#001f3f] to-[#002b4f] mix-blend-multiply" />
          </div>

          <div className="relative p-16 text-center text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <h3 className="text-4xl md:text-5xl font-bold mb-6">
                {t("services.cta.title")}
              </h3>
              <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto leading-relaxed">
                {t("services.cta.subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-10 py-5 bg-white text-[#001f3f] font-semibold rounded-full hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-xl text-lg"
                >
                  {t("services.cta.contact")}
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>

                <Link
                  href="/book"
                  className="inline-flex items-center justify-center px-10 py-5 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-[#001f3f] transform hover:scale-105 transition-all duration-300 shadow-xl text-lg"
                >
                  {t("services.cta.book")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}