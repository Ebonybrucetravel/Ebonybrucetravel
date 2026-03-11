"use client";

import React from "react";

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white animate-in fade-in duration-500">
      {/* 1. Top Navigation Bar - Exact Match to About Us */}
      <div className="max-w-7xl mx-auto px-6 py-6 border-b border-gray-50 flex items-center bg-white sticky top-0 z-50 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#33a8da] transition group"
        >
          <svg
            className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </button>
      </div>

      {/* 2. Banner Section - Bold High-Contrast Matched to About Us */}
      <section className="relative bg-gradient-to-br from-[#001f3f] to-[#002b4f] text-white py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1600"
            alt="Security Background"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            Ebony Bruce Travels
            <span className="text-[#33a8da]">
              <br />
              Privacy Policy
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Your trust is our greatest asset. Learn how we collect, use, and
            safeguard your personal data with global security standards.
          </p>
        </div>
      </section>

      {/* 3. Main Content Section */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Privacy Summary Grid - High Impact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 -mt-24 relative z-20">
          {[
            {
              title: "Data Protection",
              desc: "Military-grade encryption for all your travel and identity documents.",
              icon: "🔐",
            },
            {
              title: "Transparency",
              desc: "We never sell your data. We only share it with confirmed travel suppliers.",
              icon: "💎",
            },
            {
              title: "Your Rights",
              desc: "Total control over your data, including the right to delete your profile.",
              icon: "⚙️",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 hover:translate-y-[-4px] transition-transform"
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="text-xl font-black text-[#001f3f] mb-2">
                {card.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed font-bold">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] overflow-hidden">
          <div className="p-6 sm:p-8 md:p-12 lg:p-16 max-w-none leading-relaxed">
            <p className="text-[#001f3f] leading-relaxed mb-12 text-xl md:text-2xl font-black">
              At{" "}
              <span className="text-[#33a8da]">
                Ebony Bruce Travels Limited
              </span>
              , we are committed to global data compliance (NDPR/GDPR).
            </p>

            <div className="space-y-16">
              {/* Section 1: Information Collection */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  1. Information We Collect
                </h2>
                <h3 className="text-3xl font-black text-[#001f3f] tracking-tight mb-8">
                  What Data We Manage
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 p-6 rounded-2xl border-l-4 border-[#33a8da]">
                    <h4 className="font-black text-[#001f3f] mb-2">
                      Personal Identity
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Full name, email, phone number, passport details,
                      nationality, and emergency contacts.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border-l-4 border-[#33a8da]">
                    <h4 className="font-black text-[#001f3f] mb-2">
                      Booking & Payment
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Flight/hotel details, travel dates, billing address, and
                      partial payment info (last 4 digits).
                    </p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border-l-4 border-[#33a8da]">
                    <h4 className="font-black text-[#001f3f] mb-2">
                      Technical Data
                    </h4>
                    <p className="text-gray-600 text-sm">
                      IP addresses, browser type, device ID, and usage analytics
                      through cookies.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border-l-4 border-[#33a8da]">
                    <h4 className="font-black text-[#001f3f] mb-2">
                      Communications
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Customer support tickets, chat logs, and marketing
                      preference data.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2: Collection Methods */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  2. How We Collect Information
                </h2>
                <h3 className="text-3xl font-black text-[#001f3f] tracking-tight mb-6">
                  Direct and Indirect Channels
                </h3>
                <ul className="space-y-4 text-gray-700 text-lg font-medium">
                  <li className="flex gap-3">
                    <span className="text-[#33a8da] font-black">•</span>{" "}
                    Directly from you during account registration or booking.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#33a8da] font-black">•</span>{" "}
                    Automatically via cookies, pixels, and web beacons.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#33a8da] font-black">•</span> From
                    third-party suppliers (Airlines/Hotels) and payment
                    processors.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#33a8da] font-black">•</span> Social
                    login providers (Google, Apple, Facebook) upon your consent.
                  </li>
                </ul>
              </section>

              {/* Section 3: Usage */}
              <section className="bg-gray-50 p-10 rounded-[2.5rem] border-l-8 border-[#33a8da]">
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  3. Purpose of Processing
                </h2>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                  We process your information to{" "}
                  <span className="font-black">fulfill bookings</span>, provide
                  world-class customer support, send service updates,
                  personalize your travel offers, and comply with international
                  aviation and immigration laws.
                </p>
              </section>

              {/* Section 4: Sharing */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  4. Sharing Your Information
                </h2>
                <h3 className="text-3xl font-black text-[#001f3f] tracking-tight mb-6">
                  Controlled Disclosure
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  We only share your data with{" "}
                  <span className="text-[#001f3f] font-bold">
                    verified partners
                  </span>{" "}
                  including travel suppliers (Airlines/Hotels), payment
                  gateways, and regulatory authorities when legally required.
                  All third-party service providers are bound by strict
                  confidentiality agreements.
                </p>
              </section>

              {/* Section 5: Security */}
              <section className="bg-[#001f3f] p-10 rounded-[2.5rem] text-white">
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  5. Security Infrastructure
                </h2>
                <h3 className="text-3xl font-black tracking-tight mb-6">
                  Proactive Protection
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  We implement robust technical and organizational measures to
                  prevent unauthorized access, loss, or alteration. Our systems
                  are periodically audited to ensure your data remains protected
                  against emerging cyber threats.
                </p>
              </section>

              {/* Section 6: Rights */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  6. Your Privacy Rights
                </h2>
                <p className="text-gray-700 text-lg mb-8 font-medium">
                  You have the following rights regarding your data:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[#001f3f] font-black uppercase text-xs tracking-widest">
                  <div className="border border-gray-100 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-[#33a8da] text-xl">🔘</span> Right to
                    Access
                  </div>
                  <div className="border border-gray-100 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-[#33a8da] text-xl">🔘</span> Right to
                    Correction
                  </div>
                  <div className="border border-gray-100 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-[#33a8da] text-xl">🔘</span> Right to
                    Deletion
                  </div>
                  <div className="border border-gray-100 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-[#33a8da] text-xl">🔘</span> Data
                    Portability
                  </div>
                </div>
              </section>

              {/* Section 7: Children */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  7. Children's Privacy
                </h2>
                <p className="text-gray-600 text-lg">
                  Our services are not directed at individuals under 18. We do
                  not knowingly collect personal data from minors. If such data
                  is discovered, it is immediately purged from our servers.
                </p>
              </section>
            </div>

            {/* Final CTA - Dark Mode Matched to About Us */}
            <div className="mt-24 p-12 bg-[#121212] rounded-[3rem] text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <img
                  src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200"
                  className="w-full h-full object-cover grayscale"
                  alt=""
                />
              </div>
              <div className="relative z-10">
                <h3 className="text-4xl font-black mb-6 tracking-tight">
                  Privacy Questions?
                </h3>
                <p className="text-gray-400 mb-10 text-xl max-w-2xl mx-auto font-medium">
                  Our Data Protection Officer is ready to assist you with any
                  inquiries regarding your personal information.
                </p>
                <a
                  href="mailto:privacy@ebonybrucetravels.com"
                  className="inline-block bg-[#33a8da] text-white font-black px-16 py-6 rounded-2xl hover:bg-[#2c98c7] transition shadow-2xl text-lg uppercase tracking-widest active:scale-95"
                >
                  Contact Privacy Team
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
