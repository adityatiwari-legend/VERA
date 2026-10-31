import React from 'react';
import Link from 'next/link';
import { Compass, Home } from 'lucide-react';

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-6 p-8 text-center sm:p-10">
        <div className="space-y-3">
          <span className="block font-mono text-6xl font-bold leading-none tracking-tighter text-ink sm:text-7xl">
            4<span className="text-accent">0</span>4
          </span>
          <div className="flex justify-center">
            <span className="eyebrow">Resource Not Found</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Record Does Not Exist</h2>
          <p className="text-sm leading-relaxed text-mute">
            The requested campaign, donation, audit trail, or resource could not be located in the
            VERA ledger.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link href="/campaigns" className="btn-primary !px-4 !py-2 !text-xs">
            <Compass className="h-3.5 w-3.5" />
            Explore Campaigns
          </Link>
          <Link href="/" className="btn-secondary !px-4 !py-2 !text-xs">
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
