"use client";

import React from "react";

interface TermsAndConditionsProps {
  onBack: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white animate-in fade-in duration-500">
      {/* 1. Header Navigation - Matched to About Us */}
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
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1600"
            alt="Aviation background"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
            Ebony Bruce Travels{" "}
            <span className="text-[#33a8da]">
              <br />
              Terms Of Service
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Your legal agreement with Ebony Bruce Travels Limited—ensuring
            transparency, safety, and excellence in every booking.
          </p>
        </div>
      </section>

      {/* 3. Main Content Section */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Quick Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 -mt-24 relative z-20">
          {[
            {
              title: "Service Role",
              desc: "We act as a professional facilitator between you and global travel suppliers.",
              icon: "🌍",
            },
            {
              title: "Legal Safety",
              desc: "All bookings are governed by strict international supplier and safety policies.",
              icon: "⚖️",
            },
            {
              title: "Commitment",
              desc: "We prioritize accurate documentation and secure payment processing.",
              icon: "💎",
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
              Welcome to{" "}
              <span className="text-[#33a8da]">
                Ebony Bruce Travels Limited
              </span>{" "}
              — where transparency meets world-class travel logistics.
            </p>

            <div className="space-y-16">
              {/* Section 1 */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  1. Our Role as Facilitators
                </h2>
                <h3 className="text-3xl font-black text-[#001f3f] tracking-tight mb-6">
                  Connecting You to the World
                </h3>
                <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                  We act solely as an{" "}
                  <strong className="text-[#001f3f]">intermediary</strong>{" "}
                  between you and third-party travel suppliers (airlines,
                  hotels, car rental companies, and tour operators). We do not
                  own or operate these services; therefore, your booking is
                  subject to the specific terms and conditions of the relevant
                  supplier.
                </p>
              </section>

              {/* Section 2 - Boxed for Emphasis */}
              <section className="bg-gray-50 p-10 rounded-[2.5rem] border-l-8 border-[#33a8da]">
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  2. User Eligibility & Accounts
                </h2>
                <p className="text-[#001f3f] font-black text-lg mb-6">
                  By using this platform, you certify that:
                </p>
                <ul className="space-y-4 text-gray-700 text-lg font-medium">
                  <li className="flex gap-3 items-start">
                    <span className="text-[#33a8da] font-black">✔</span> You are
                    at least 18 years of age and possess the legal authority to
                    create a binding legal obligation.
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-[#33a8da] font-black">✔</span> You
                    will use this Platform in accordance with these Terms.
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-[#33a8da] font-black">✔</span> All
                    information supplied by you is true, accurate, current, and
                    complete.
                  </li>
                </ul>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  3. Payments & Confirmations
                </h2>
                <h3 className="text-3xl font-black text-[#001f3f] tracking-tight mb-6">
                  Securing Your Reservation
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  Prices displayed include applicable taxes unless stated
                  otherwise.
                  <span className="font-black text-[#001f3f]">
                    {" "}
                    Bookings are only finalized upon receipt of full payment
                  </span>{" "}
                  and issuance of a confirmation from the supplier. We reserve
                  the right to cancel bookings in the event of pricing errors or
                  fraudulent activity.
                </p>
              </section>

              {/* NEW SECTION 4 - Added Content */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  4. Intellectual Property
                </h2>
                <h3 className="text-3xl font-black text-[#001f3f] tracking-tight mb-6">
                  Protecting Our Brand
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  All content, logos, designs, and software on this Platform are
                  the property of{" "}
                  <span className="text-[#001f3f] font-bold">
                    Ebony Bruce Travels Limited
                  </span>{" "}
                  or its licensors. You may not copy, modify, distribute, or use
                  any part of our intellectual property for commercial purposes
                  without our express written consent.
                </p>
              </section>

              {/* NEW SECTION 5 - Added Content */}
              <section className="bg-red-50/50 p-10 rounded-[2.5rem] border-l-8 border-red-500">
                <h2 className="text-sm font-black text-red-500 uppercase tracking-widest mb-4">
                  5. Prohibited Activities
                </h2>
                <h3 className="text-3xl font-black text-[#001f3f] tracking-tight mb-6">
                  Safe Usage Policy
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 text-base font-bold">
                  <li className="flex gap-2">
                    ✕ No fraudulent bookings or speculative reservations.
                  </li>
                  <li className="flex gap-2">
                    ✕ No use of robots or scrapers to access content.
                  </li>
                  <li className="flex gap-2">
                    ✕ No bypassing of security or "deep-linking" to our site.
                  </li>
                  <li className="flex gap-2">
                    ✕ No violation of any local or international laws.
                  </li>
                </ul>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  6. Liability & Force Majeure
                </h2>
                <h3 className="text-3xl font-black text-[#001f3f] tracking-tight mb-6">
                  Understanding Travel Risks
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Ebony Bruce Travels is not liable for any injury, loss, claim,
                  damage, or any special, exemplary, or punitive damages arising
                  from supplier errors or{" "}
                  <span className="font-black text-[#001f3f]">
                    Force Majeure events
                  </span>{" "}
                  (including but not limited to weather, strikes, pandemics, or
                  government travel advisories).
                </p>
              </section>

              {/* NEW SECTION 7 - Added Content */}
              <section>
                <h2 className="text-sm font-black text-[#33a8da] uppercase tracking-widest mb-4">
                  7. Termination of Use
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed">
                  We reserve the right, in our sole discretion, to terminate
                  your access to all or part of the Platform, with or without
                  notice, for any reason, including violation of these Terms or
                  behavior that we believe is harmful to other users or Ebony
                  Bruce Travels Limited.
                </p>
              </section>
            </div>

            {/* 4. Final CTA Section - Dark Mode Matched to About Us Section 4 */}
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
                  Need Legal Clarification?
                </h3>
                <p className="text-gray-400 mb-10 text-xl max-w-2xl mx-auto">
                  Our team is dedicated to ensuring you have a clear
                  understanding of your travel rights and responsibilities.
                </p>
                <a
                  href="/contact"
                  className="inline-block bg-[#33a8da] text-white font-black px-16 py-6 rounded-2xl hover:bg-[#2c98c7] transition shadow-2xl text-lg uppercase tracking-widest active:scale-95"
                >
                  Contact Legal Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsAndConditions;
