import React from 'react';

export default function CampaignsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 pb-20 sm:px-6 lg:px-8">
      {/* Header Skeleton */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="vera-skeleton h-3 w-32 rounded" />
          <div className="vera-skeleton h-7 w-64 rounded" />
          <div className="vera-skeleton h-3 w-48 rounded" />
        </div>
        <div className="vera-skeleton h-9 w-32 rounded-lg" />
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="card flex items-center justify-between gap-4 rounded-xl p-3">
        <div className="vera-skeleton h-8 w-64 rounded-lg" />
        <div className="vera-skeleton h-8 w-48 rounded-lg" />
      </div>

      {/* Campaign Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card flex h-64 flex-col justify-between space-y-4 rounded-xl p-5">
            <div className="space-y-2">
              <div className="vera-skeleton h-3 w-20 rounded" />
              <div className="vera-skeleton h-5 w-4/5 rounded" />
              <div className="vera-skeleton h-3 w-full rounded" />
            </div>
            <div className="space-y-2">
              <div className="vera-skeleton h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <div className="vera-skeleton h-3 w-16 rounded" />
                <div className="vera-skeleton h-3 w-16 rounded" />
              </div>
            </div>
            <div className="vera-skeleton h-8 rounded-lg border border-line bg-mist" />
          </div>
        ))}
      </div>
    </div>
  );
}
