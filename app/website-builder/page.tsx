'use client';

import { Suspense } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import WebsiteBuilderContent from '@/components/WebsiteBuilder';
import { Loader2 } from 'lucide-react';

export default function WebsiteBuilderPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        }>
            <SidebarLayout>
                <WebsiteBuilderContent />
            </SidebarLayout>
        </Suspense>
    );
}
