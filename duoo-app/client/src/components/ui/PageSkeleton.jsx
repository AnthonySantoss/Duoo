import React from 'react';

const SkeletonBlock = ({ className = '' }) => (
    <div className={`animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800 ${className}`} aria-hidden="true" />
);

const PageSkeleton = () => (
    <div className="space-y-6" role="status" aria-label="Carregando conteúdo">
        <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
                <SkeletonBlock className="h-4 w-28 rounded-lg" />
                <SkeletonBlock className="h-8 w-56 rounded-xl" />
            </div>
            <SkeletonBlock className="h-11 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28 sm:col-span-2 lg:col-span-1" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <SkeletonBlock className="h-72" />
            <SkeletonBlock className="h-72" />
        </div>
        <SkeletonBlock className="h-40" />
        <span className="sr-only">Carregando conteúdo</span>
    </div>
);

export default PageSkeleton;
