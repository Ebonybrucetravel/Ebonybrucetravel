'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const imageCache = new Map<string, string>();
const FALLBACK_HOTEL = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600';

interface HotelListImageProps {
    hotelId: string;
    hotelName?: string;
    initialSrc?: string;
    fallbackSrc?: string;
    alt: string;
    className?: string;
}

export function HotelListImage({
    hotelId,
    hotelName,
    initialSrc,
    fallbackSrc = FALLBACK_HOTEL,
    alt,
    className = '',
}: HotelListImageProps) {
    const [src, setSrc] = useState<string>(() => {
        const cached = imageCache.get(hotelId);
        if (cached) return cached;
        if (initialSrc && !initialSrc.includes('placehold.co')) return initialSrc;
        return fallbackSrc;
    });
    const [loaded, setLoaded] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (imageCache.has(hotelId)) {
            setSrc(imageCache.get(hotelId)!);
            return;
        }

        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (!entry?.isIntersecting || loaded) return;

            setLoaded(true);

            api.paymentApi
                .getHotelImages(hotelId, { hotelName: hotelName || undefined })
                .then((res: {
                    data?: {
                        images?: any[];
                    };
                    images?: any[];
                }) => {
                    const list = res?.data?.images ?? res?.images ?? [];
                    // Filter out placeholders from placehold.co
                    const filteredList = Array.isArray(list)
                        ? list.filter((img: any) => {
                            const url = typeof img === 'string' ? img : img?.url;
                            return url && !url.includes('placehold.co');
                        })
                        : [];

                    const first = filteredList.length > 0 ? filteredList[0] : null;
                    const url: string | undefined = first === null || first === undefined
                        ? undefined
                        : typeof first === 'string'
                            ? first
                            : (first as {
                                url?: string;
                            }).url;

                    if (typeof url === 'string' && url) {
                        imageCache.set(hotelId, url);
                        setSrc(url);
                    }
                })
                .catch(() => { });
        }, { rootMargin: '100px', threshold: 0.01 });

        observer.observe(el);
        return () => observer.disconnect();
    }, [hotelId, hotelName, loaded]);

    return (
        <div ref={ref} className={className || 'block w-full h-0 pb-[75%] relative'}>
            <img
                src={src}
                alt={alt}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-500"
            />
        </div>
    );
}