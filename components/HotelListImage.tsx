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
  const [imageError, setImageError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If already in cache, use cached image
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

        // Fetch hotel images when component becomes visible
        api.paymentApi
          .getHotelImages(hotelId, { hotelName: hotelName || undefined })
          .then((res) => {
            // ✅ FIX: Images are nested inside data.images
            const images = res?.data?.images;
            
            if (images && Array.isArray(images) && images.length > 0) {
              const firstImage = images[0];
              // Check if the image is a string or an object with url property
              const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.url;
              
              if (imageUrl) {
                imageCache.set(hotelId, imageUrl);
                setSrc(imageUrl);
                setImageError(false);
              }
            }
          })
          .catch((error) => {
            console.error(`Failed to load image for hotel ${hotelId}:`, error);
            setImageError(true);
          });
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hotelId, hotelName, loaded]);

  // Determine the image source (cached, fetched, or fallback)
  const imageSrc = imageError ? fallbackSrc : src;

  return (
    <div ref={ref} className={className ? `block ${className}` : 'block w-full h-full'}>
      <img
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
        onError={() => {
          // If image fails to load, use fallback
          if (!imageError) {
            setImageError(true);
          }
        }}
        loading="lazy"
      />
    </div>
  );
}