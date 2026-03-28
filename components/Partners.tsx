"use client";

import React from "react";
import { useLanguage } from "../context/LanguageContext";

const Partners: React.FC = () => {
  const { t } = useLanguage();

  const partners = [
    { name: "DHL", logo: "/logos/DHL-Logo-500x281.png" },
    { name: "IATA", logo: "/logos/IATA_logo.svg.png" },
    {
      name: "Apply Board",
      logo: "/logos/interior-third-applyboard-logo.jpg.png",
    },
    { name: "Nanta", logo: "/logos/nanta.png" },
    { name: "Ncaa", logo: "/logos/Ncaa.png", isWider: true },
  ];

  return (
    <section className="pt-0 pb-0 md:pt-1 md:pb-0 w-full">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            {t('partners.title')}
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            {t('partners.subtitle')}
          </p>
        </div>

        {/* Single horizontal line - fixed for mobile */}
        <div className="flex items-center justify-start md:justify-center space-x-6 md:space-x-12 lg:space-x-16 overflow-x-auto px-2 pb-2 hide-scrollbar">
          {partners.map((partner) => (
            <div key={partner.name} className="flex-shrink-0">
              <img
                src={partner.logo}
                alt={`${partner.name} logo`}
                className={`object-contain transition-transform duration-300 hover:scale-110 ${
                  partner.isWider 
                    ? "h-10 md:h-14 w-auto" 
                    : "h-14 md:h-20 w-auto"
                }`}
                style={{ maxWidth: 'none' }}
              />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default Partners;