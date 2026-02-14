'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import AboutUs from '@/components/AboutUs';
export default function AboutPage() {
    const router = useRouter();
    return <AboutUs onBack={() => router.push('/')}/>;
}
