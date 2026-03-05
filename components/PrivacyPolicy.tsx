"use client";

import React from "react";

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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

      {/* Hero Banner – consistent with Terms page */}
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
            Ebony Bruce Travels
            <span className="text-[#33a8da]">
              <br />
              Privacy Policy
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            How Ebony Bruce Travels collects, uses, protects and shares your
            personal information.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 xl:px-10 py-10 md:py-12 lg:py-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 sm:p-8 md:p-12 lg:p-14 xl:p-16 prose prose-lg md:prose-xl max-w-none leading-relaxed">
            <p className="text-gray-700 leading-relaxed mb-10 text-lg md:text-xl font-medium">
              At{" "}
              <span className="font-bold text-[#2D97C4]">
                Ebony Bruce Travels Limited
              </span>
              , we value your trust and are committed to protecting your
              privacy.
            </p>

            <p className="text-gray-600 mb-10 text-base md:text-lg">
              This Privacy Policy explains how we collect, use, disclose, store,
              and protect your personal information when you use our website,
              mobile application, booking services, customer support,
              newsletters, and any other services we provide (collectively, the
              “Platform”).
            </p>

            <hr className="my-10 md:my-12 border-gray-200" />

            <h2 className="text-2xl md:text-3xl lg:text-4xl mb-6 text-[#2D97C4]">
              1. Information We Collect
            </h2>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              We may collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-gray-700 mb-8 text-base md:text-lg">
              <li>
                <strong>Personal Information</strong>: full name, email address,
                phone number, date of birth, passport/ID details, nationality,
                gender, emergency contact
              </li>
              <li>
                <strong>Booking & Travel Information</strong>: flight/hotel/car
                details, travel dates, payment information (card type & last 4
                digits – we do not store full card numbers), billing address
              </li>
              <li>
                <strong>Device & Usage Data</strong>: IP address, browser type,
                device ID, operating system, pages visited, time spent, referral
                source, cookies & similar technologies
              </li>
              <li>
                <strong>Communication Data</strong>: messages sent via chat,
                email support tickets, call recordings (where permitted by law)
              </li>
              <li>
                <strong>Marketing & Preference Data</strong>: newsletter
                subscriptions, marketing preferences, survey responses
              </li>
            </ul>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              2. How We Collect Information
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-700 mb-8 text-base md:text-lg">
              <li>
                Directly from you when you create an account, make a booking,
                contact support, subscribe to newsletters, or fill forms
              </li>
              <li>
                Automatically through cookies, pixels, web beacons, device
                identifiers, and analytics tools
              </li>
              <li>
                From third parties: travel suppliers (airlines/hotels), payment
                processors, identity verification services, fraud prevention
                providers
              </li>
              <li>
                From social login providers (Google, Facebook, Apple) if you
                choose to sign in that way
              </li>
            </ul>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-gray-700 mb-8 text-base md:text-lg">
              <li>Process and confirm your bookings</li>
              <li>
                Provide customer support and communicate with you about your
                reservations
              </li>
              <li>
                Send important service messages (booking confirmations, changes,
                cancellations)
              </li>
              <li>
                Personalize your experience and show relevant offers (if you
                consented)
              </li>
              <li>Prevent fraud, abuse, and unauthorized access</li>
              <li>
                Comply with legal obligations (tax, immigration, aviation
                security)
              </li>
              <li>
                Improve our services, analyze usage trends, and conduct research
              </li>
            </ul>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              4. Sharing Your Information
            </h2>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              We share your information only when necessary:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-gray-700 mb-8 text-base md:text-lg">
              <li>
                With travel suppliers (airlines, hotels, car companies, tour
                operators) to fulfill your booking
              </li>
              <li>With payment processors and fraud detection partners</li>
              <li>
                With service providers (cloud hosting, analytics, email
                marketing, customer support tools) under strict confidentiality
                agreements
              </li>
              <li>
                When required by law, court order, regulatory authority, or to
                protect our rights
              </li>
              <li>
                In the event of merger, acquisition, or sale of assets (your
                data would be transferred under similar protections)
              </li>
            </ul>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              5. International Transfers
            </h2>
            <p className="text-gray-700 text-base md:text-lg">
              Your information may be transferred to and processed in countries
              outside Nigeria (including the UK, EU, US, UAE, and other
              countries where our suppliers or partners operate). We ensure
              appropriate safeguards are in place (e.g., Standard Contractual
              Clauses, adequacy decisions, or binding corporate rules) to
              protect your data in line with applicable laws.
            </p>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              6. Your Rights
            </h2>
            <p className="text-gray-700 mb-6 text-base md:text-lg">
              Depending on your location and applicable law, you may have the
              right to:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-gray-700 mb-8 text-base md:text-lg">
              <li>
                Access, correct, update or delete your personal information
              </li>
              <li>Object to or restrict certain processing</li>
              <li>Withdraw consent (where processing is based on consent)</li>
              <li>Request data portability</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="text-gray-700 text-base md:text-lg">
              To exercise these rights, contact us at{" "}
              <a href="/contact" className="text-[#2D97C4] hover:underline">
                privacy@ebonybrucetravels.com
              </a>
              .
            </p>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              7. Security
            </h2>
            <p className="text-gray-700 text-base md:text-lg">
              We implement reasonable technical and organizational measures to
              protect your information from unauthorized access, loss, misuse,
              or alteration. However, no method of transmission over the
              internet or electronic storage is 100% secure.
            </p>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              8. Cookies & Tracking Technologies
            </h2>
            <p className="text-gray-700 text-base md:text-lg">
              We use cookies, pixels, and similar technologies to enhance your
              experience, analyze usage, and deliver personalized content/ads.
              You can manage preferences via our Cookie Settings or your
              browser.
            </p>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              9. Children's Privacy
            </h2>
            <p className="text-gray-700 text-base md:text-lg">
              Our services are not directed to individuals under 18. We do not
              knowingly collect personal information from children under 18. If
              we become aware that we have collected such data, we will delete
              it.
            </p>

            <h2 className="text-2xl md:text-3xl lg:text-4xl mt-14 mb-6 text-[#2D97C4]">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-700 text-base md:text-lg">
              We may update this Privacy Policy from time to time. Changes will
              be posted on this page with an updated “Last updated” date. We
              encourage you to review it periodically.
            </p>

            {/* Contact CTA */}
            <div className="mt-16 p-8 bg-blue-50 rounded-2xl text-center border border-blue-100">
              <h3 className="text-2xl md:text-3xl font-extrabold text-[#2D97C4] mb-4">
                Questions or Requests?
              </h3>
              <p className="text-gray-700 mb-6 text-base md:text-lg">
                Contact our Data Protection team if you have any concerns about
                your privacy.
              </p>
              <a
                href="/contact"
                className="inline-block bg-[#2D97C4] text-white font-bold px-10 py-5 md:px-14 md:py-6 rounded-xl hover:bg-[#257cab] transition shadow-md text-base md:text-lg w-full sm:w-auto min-w-[240px] text-center"
              >
                Contact Privacy Team
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
