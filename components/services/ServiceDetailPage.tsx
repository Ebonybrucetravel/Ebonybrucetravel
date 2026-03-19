"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

interface ServiceDetailPageProps {
  service: "travel" | "dhl" | "admissions";
}

export default function ServiceDetailPage({ service }: ServiceDetailPageProps) {
  const { t } = useLanguage();

  const getServiceType = () => {
    switch (service) {
      case "travel":
        return t("serviceDetail.travel.type");
      case "dhl":
        return t("serviceDetail.dhl.type");
      case "admissions":
        return t("serviceDetail.admissions.type");
      default:
        return "";
    }
  };

  // Helper to get nested translations
  const getServiceKey = (key: string) => {
    return t(`serviceDetail.${service}.${key}`);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Banner Section */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        <Image
          src={(() => {
            switch (service) {
              case "travel": return "https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=1968&auto=format&fit=crop";
              case "dhl": return "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop";
              case "admissions": return "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2070&auto=format&fit=crop";
            }
          })()}
          alt={getServiceKey("title")}
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
              {getServiceKey("title")}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl leading-relaxed">
              {getServiceKey("headline")}
            </p>
          </div>
        </div>
      </section>

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center text-sm text-gray-500">
          <Link href="/" className="hover:text-[#33a8da] transition">
            {t("nav.home")}
          </Link>
          <svg
            className="w-4 h-4 mx-2"
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
          <Link href="/services" className="hover:text-[#33a8da] transition">
            {t("nav.services")}
          </Link>
          <svg
            className="w-4 h-4 mx-2"
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
          <span className="text-gray-700 font-medium">{getServiceKey("title")}</span>
        </div>
      </div>

      {/* Overview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            {t("serviceDetail.overview.label")}
          </span>
          <p className="text-xl text-gray-600 leading-relaxed">
            {getServiceKey("overview")}
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-[#33a8da] mb-2">
                  {getServiceKey(`stats.${index}.value`)}
                </div>
                <div className="text-gray-600 font-medium">
                  {getServiceKey(`stats.${index}.label`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-[#33a8da]/10 text-[#33a8da] rounded-full text-sm font-semibold mb-4">
            {t("serviceDetail.features.label")}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#001f3f] mb-6">
            {t("serviceDetail.features.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 w-full max-w-md"
            >
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {getServiceKey(`features.${index}.icon`)}
              </div>
              <h3 className="text-2xl font-bold text-[#001f3f] mb-3 group-hover:text-[#33a8da] transition-colors">
                {getServiceKey(`features.${index}.title`)}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {getServiceKey(`features.${index}.description`)}
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
              {t("serviceDetail.process.label")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#001f3f] mb-6">
              {t("serviceDetail.process.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-lg text-center h-full">
                  <span className="inline-block text-4xl font-black text-[#33a8da] mb-4">
                    {getServiceKey(`process.${index}.step`)}
                  </span>
                  <h3 className="text-xl font-bold text-[#001f3f] mb-3">
                    {getServiceKey(`process.${index}.title`)}
                  </h3>
                  <p className="text-gray-600">
                    {getServiceKey(`process.${index}.description`)}
                  </p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <svg
                      className="w-8 h-8 text-[#33a8da]/30"
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
              {t("serviceDetail.benefits.label")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("serviceDetail.benefits.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <div className="w-8 h-8 bg-[#33a8da] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-lg text-gray-100">
                  {getServiceKey(`benefits.${index}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center border-2 border-gray-100">
          <h3 className="text-3xl md:text-4xl font-bold text-[#001f3f] mb-4">
            {getServiceKey("cta.title")}
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            {getServiceKey("cta.description")}
          </p>
          <Link
            href={getServiceKey("cta.buttonLink")}
            className="inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-[#001f3f] to-[#002b4f] text-white font-semibold rounded-full hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-lg"
          >
            {getServiceKey("cta.buttonText")}
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
        </div>
      </section>
    </main>
  );
}