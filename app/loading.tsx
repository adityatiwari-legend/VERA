import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 pt-4">
      {/* Header Skeleton */}
      <div className="card space-y-3 p-6">
        <div className="vera-skeleton h-3 w-28 rounded" />
        <div className="vera-skeleton h-7 w-72 max-w-full rounded" />
        <div className="vera-skeleton h-4 w-96 max-w-full rounded" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card space-y-3 p-5">
            <div className="vera-skeleton h-3 w-24 rounded" />
            <div className="vera-skeleton h-8 w-32 rounded" />
            <div className="vera-skeleton h-3 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="card space-y-4 p-6">
        <div className="vera-skeleton h-5 w-48 rounded" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-line px-4 py-3"
            >
              <div className="vera-skeleton h-4 w-40 rounded" />
              <div className="vera-skeleton h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
