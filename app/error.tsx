'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-4 p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-bad/20 bg-bad-soft text-bad">
          <AlertCircle className="h-6 w-6" />
        </span>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            System Exception Encountered
          </h2>
          <p className="text-sm leading-relaxed text-mute">
            {error.message || 'An unexpected error occurred while processing this request.'}
          </p>
        </div>

        {error.digest && (
          <div className="break-all rounded-lg border border-line bg-mist p-2 font-mono text-[10px] text-mute">
            Digest: {error.digest}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => reset()} className="btn-primary !px-4 !py-2 !text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Try Again
          </button>
          <Link href="/" className="btn-secondary !px-4 !py-2 !text-xs">
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
