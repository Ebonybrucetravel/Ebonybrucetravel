"use client";

import React from "react";

interface JobOpening {
  id: number;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Remote" | "Contract";
  salary?: string;
}

interface CareersProps {
  onBack: () => void;
}

const jobOpenings: JobOpening[] = [
  {
    id: 1,
    title: "Flight Logistics Specialist",
    department: "Operations",
    location: "Remote",
    type: "Full-time",
    salary: "$4k - $6k",
  },
  {
    id: 2,
    title: "Senior Travel Consultant",
    department: "Sales",
    location: "London, UK",
    type: "Full-time",
    salary: "$5k - $8k",
  },
  {
    id: 3,
    title: "Travel App UI/UX Designer",
    department: "Product",
    location: "Remote",
    type: "Contract",
    salary: "$60/hr",
  },
];

const Careers: React.FC<CareersProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar – EXACT MATCH */}
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

      {/* Hero Banner – UNTOUCHED (Exact Match to Privacy Policy) */}
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
              Careers
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            Join the team revolutionizing global flight travel. We are looking
            for passionate individuals to help our clients fly higher.
          </p>
        </div>
      </section>

      {/* Main Content – ENHANCED */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 xl:px-10 py-10 md:py-16">
        {/* Value Cards Section - Adds Premium Feel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 -mt-24 relative z-20">
          {[
            {
              title: "Global Impact",
              desc: "Help thousands of travelers reach their destinations daily.",
              icon: "🌎",
            },
            {
              title: "Innovation",
              desc: "Build the next generation of flight management technology.",
              icon: "🚀",
            },
            {
              title: "Travel Perks",
              desc: "Exclusive industry rates and credits for your own journeys.",
              icon: "🎫",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-50 hover:translate-y-[-4px] transition-transform"
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="text-xl font-bold text-[#001f3f] mb-2">
                {card.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 sm:p-8 md:p-12 lg:p-14">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-[#001f3f]">
                  Open Opportunities
                </h2>
                <p className="text-[#2D97C4] font-semibold mt-2">
                  Find your seat on our next flight
                </p>
              </div>
              <div className="text-sm font-bold bg-blue-50 text-[#2D97C4] px-4 py-2 rounded-full w-fit">
                {jobOpenings.length} Positions Available
              </div>
            </div>

            {/* Job Listings List - Premium Card Layout */}
            <div className="space-y-6">
              {jobOpenings.map((job) => (
                <div
                  key={job.id}
                  className="group relative flex flex-col md:flex-row md:items-center justify-between p-8 bg-gray-50 border border-gray-100 rounded-[2rem] hover:bg-white hover:border-[#2D97C4] hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
                >
                  <div className="mb-6 md:mb-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#2D97C4] shadow-sm">
                        {job.department}
                      </span>
                      <span className="text-gray-400 text-xs font-bold uppercase tracking-tighter">
                        {job.type}
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 group-hover:text-[#2D97C4] transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-3 text-gray-500 font-semibold text-sm">
                      <span className="flex items-center gap-1">
                        📍 {job.location}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-[#2D97C4]">{job.salary}</span>
                    </div>
                  </div>

                  <button className="bg-[#001f3f] text-white font-bold px-10 py-5 rounded-2xl group-hover:bg-[#2D97C4] transition-all shadow-md active:scale-95 text-center">
                    Apply Now
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom Contact Section */}
            <div className="mt-20 p-10 bg-gradient-to-br from-blue-50 to-white rounded-[2.5rem] text-center border border-blue-100">
              <h3 className="text-2xl md:text-3xl font-extrabold text-[#001f3f] mb-4">
                Can't find the right role?
              </h3>
              <p className="text-gray-600 mb-8 text-base md:text-lg max-w-xl mx-auto">
                We are always looking for exceptional flight coordinators,
                developers, and travel enthusiasts to join our global network.
              </p>
              <a
                href="mailto:careers@ebonybrucetravels.com"
                className="inline-block bg-[#2D97C4] text-white font-bold px-12 py-5 rounded-2xl hover:bg-[#257cab] transition shadow-xl text-lg"
              >
                Send General Application
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Careers;
