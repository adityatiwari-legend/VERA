import React from 'react';

export default function AuditLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-20 sm:px-6 lg:px-8">
      {/* Header Skeleton */}
      <div className="card flex h-32 flex-col justify-between rounded-xl p-6">
        <div className="space-y-2">
          <div className="vera-skeleton h-3 w-36 rounded" />
          <div className="vera-skeleton h-7 w-80 rounded" />
        </div>
        <div className="vera-skeleton h-3 w-48 rounded" />
      </div>

      {/* 6 Financial Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card space-y-2 rounded-xl p-3.5">
            <div className="vera-skeleton h-2.5 w-16 rounded" />
            <div className="vera-skeleton h-6 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Fund Trail Timeline Skeleton */}
      <div className="card space-y-4 rounded-xl p-6">
        <div className="vera-skeleton h-4 w-40 rounded" />
        <div className="grid grid-cols-3 gap-2 pt-2 sm:grid-cols-5 lg:grid-cols-9">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div
              key={i}
              className="flex h-24 flex-col items-center justify-center space-y-1.5 rounded-lg border border-line bg-mist p-2"
            >
              <div className="vera-skeleton h-5 w-5 rounded-full" />
              <div className="vera-skeleton h-2.5 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
