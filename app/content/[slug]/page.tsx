'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pageContentMap } from '@/lib/content';
import ContentPage from '@/components/ContentPage';
export default function ContentSlugPage() {
    const { slug } = useParams<{
        slug: string;
    }>();
    const router = useRouter();
    const content = pageContentMap[decodeURIComponent(slug)];
    if (!content) {
        return (<div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-8">The page &quot;{decodeURIComponent(slug)}&quot; does not exist.</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg">Go Home</button>
      </div>);
    }
    return <ContentPage content={content} onBack={() => router.push('/')}/>;
}
