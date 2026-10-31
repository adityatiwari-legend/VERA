'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export const PrintButton: React.FC = () => {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary !px-4 !py-2 !text-xs uppercase tracking-wider"
    >
      <Printer className="h-4 w-4" />
      Print / Save as PDF
    </button>
  );
};
