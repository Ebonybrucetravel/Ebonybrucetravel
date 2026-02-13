'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const imageCache = new Map<string, string>();

const FALLBACK_HOTEL =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600';

interface HotelListImageProps {
  hotelId: string;
  hotelName?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
}

export function HotelListImage({
  hotelId,
  hotelName,
  fallbackSrc = FALLBACK_HOTEL,
  alt,
  className,
}: HotelListImageProps) {
  const [src, setSrc] = useState<string>(() => imageCache.get(hotelId) || fallbackSrc);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imageCache.has(hotelId)) {
      setSrc(imageCache.get(hotelId)!);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || loaded) return;
        setLoaded(true);

        api.bookingApi
          .getHotelImages(hotelId, { hotelName: hotelName || undefined })
          .then((res) => {
            const list = res?.data?.images ?? res?.images ?? [];
            const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
            const url = first && (typeof first === 'string' ? first : (first as { url?: string }).url);
            if (url) {
              imageCache.set(hotelId, url);
              setSrc(url);
            }
          })
          .catch(() => {});
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hotelId, hotelName, loaded]);

  return (
    <div ref={ref} className={className ? `block ${className}` : 'block w-full h-full'}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
      />
    </div>
  );
}
