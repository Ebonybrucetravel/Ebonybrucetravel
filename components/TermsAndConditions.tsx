"use client";

import React from "react";

interface TermsAndConditionsProps {
  onBack: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-6 py-6 border-b border-gray-100 flex items-center bg-white sticky top-0 z-10 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-base font-semibold text-gray-700 hover:text-[#2D97C4] transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
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

      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-[#001f3f] to-[#003366] text-white py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1600"
            alt="Global travel routes"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-5 md:mb-6">
            Ebony Bruce Travels{" "}
            <span className="text-[#33a8da]">
              <br />
              Terms Of Service
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            Your agreement with the best travel booking app – clear rules for
            safe, smooth bookings of flights, hotels, cars, activities & more.
          </p>
        </div>
      </section>

      {/* Main Legal Content – wider, headers in #2D97C4 */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 xl:px-10 py-10 md:py-12 lg:py-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 sm:p-8 md:p-12 lg:p-14 xl:p-16 prose prose-lg md:prose-xl max-w-none leading-relaxed">
            <p className="text-gray-700 leading-relaxed mb-10 text-lg md:text-xl font-medium">
              Welcome to{" "}
              <span className="font-bold text-[#2D97C4]">
                Ebony Bruce Travels Limited
              </span>{" "}
              — where your next journey begins with confidence and ease.
            </p>

            <p className="text-gray-600 leading-relaxed mb-10 text-base md:text-lg">
              These Terms and Conditions outline the rules that apply when you
              use our platform to search, compare, book or manage flights,
              hotels, car rentals, airport transfers, holiday packages,
              activities, visa support, and any other travel services we provide
              as your booking facilitator.
            </p>

            <p className="text-gray-700 mb-10 text-base md:text-lg">
              By accessing, browsing or using the Platform in any way, you agree
              to be bound by these Terms. If you do not agree, you must not use
              our services.
            </p>

            <hr className="my-10 md:my-12 border-gray-200" />

            <h2 className="text-2xl md:text-3xl lg:text-4xl mb-6 text-[#2D97C4]">
              1. Who We Are & Our Role
            </h2>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              We act solely as an <strong>intermediary / facilitator</strong>{" "}
              between you and third-party travel suppliers (airlines, hotels,
              car rental companies, tour operators, activity providers, etc.).
            </p>
            <p className="text-gray-700 text-base md:text-lg">
              We do not own, operate or control any travel services. All
              bookings are governed by the individual terms, conditions,
              cancellation policies, baggage rules and liability limitations of
              the relevant supplier.
            </p>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              2. Eligibility & Account
            </h2>
            <ul className="list-disc pl-6 space-y-4 text-gray-700 mb-8 text-base md:text-lg">
              <li>
                You must be at least 18 years old and legally capable of
                entering binding contracts.
              </li>
              <li>
                All information you provide must be accurate, current and
                complete.
              </li>
              <li>
                You are fully responsible for all activity under your account
                and for safeguarding your login credentials.
              </li>
              <li>
                We reserve the right to suspend or terminate accounts for
                violations of these Terms or suspected fraudulent activity.
              </li>
            </ul>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              3. Bookings, Payments & Cancellations
            </h2>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              All displayed prices include applicable taxes and fees where
              shown, but additional charges (resort fees, service fees, baggage,
              fuel surcharges, etc.) may apply per supplier policy.
            </p>
            <ul className="list-disc pl-6 space-y-4 text-gray-700 mb-8 text-base md:text-lg">
              <li>
                Bookings are confirmed only upon receipt of full or partial
                payment and supplier confirmation.
              </li>
              <li>
                Cancellations, changes, refunds and no-shows are subject to the
                supplier’s own rules – we act only as the booking channel.
              </li>
              <li>
                Some bookings are non-refundable or have strict penalties – read
                all terms before confirming.
              </li>
              <li>
                We are not responsible for supplier cancellations, overbookings,
                schedule changes, strikes, weather, or force majeure events.
              </li>
            </ul>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              4. Travel Risks, Health & Documentation
            </h2>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              Travel involves risks including but not limited to illness,
              injury, natural disasters, political instability, flight
              delays/cancellations and loss of property.
            </p>
            <p className="text-gray-700 text-base md:text-lg">
              You are solely responsible for obtaining passports, visas,
              vaccinations, travel insurance, and complying with all entry/exit
              requirements. We provide information as a convenience only and are
              not liable for denial of entry, health issues or travel
              disruptions.
            </p>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              5. Limitation of Liability & Disclaimer
            </h2>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              To the maximum extent permitted by law, we provide the Platform
              “as is” and disclaim all warranties (express or implied),
              including merchantability, fitness for purpose and
              non-infringement.
            </p>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              We shall not be liable for any indirect, incidental, special,
              consequential or punitive damages, including lost profits, data
              loss, travel disruptions, injuries, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 space-y-4 text-gray-700 mb-8 text-base md:text-lg">
              <li>Use of or inability to use the Platform</li>
              <li>Supplier acts/omissions, errors, delays or cancellations</li>
              <li>
                Inaccurate information, pricing errors (which we may correct),
                or third-party content
              </li>
              <li>
                Force majeure, pandemics, government restrictions or travel
                advisories
              </li>
            </ul>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              6. Governing Law & Disputes
            </h2>
            <p className="text-gray-700 text-base md:text-lg">
              These Terms are governed by the laws of the Federal Republic of
              Nigeria. Any disputes shall be resolved exclusively in the courts
              of Lagos, Nigeria.
            </p>

            {/* Contact CTA – updated color */}
            <div className="mt-16 p-8 bg-blue-50 rounded-2xl text-center border border-blue-100">
              <h3 className="text-2xl md:text-3xl font-extrabold text-[#2D97C4] mb-4">
                Questions?
              </h3>
              <p className="text-gray-700 mb-6 text-base md:text-lg">
                Contact our support team – we’re here to help 24/7.
              </p>
              <a
                href="/contact"
                className="inline-block bg-[#2D97C4] text-white font-bold px-10 py-5 md:px-14 md:py-6 rounded-xl hover:bg-[#257cab] transition shadow-md text-base md:text-lg w-full sm:w-auto min-w-[240px] text-center"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsAndConditions;
