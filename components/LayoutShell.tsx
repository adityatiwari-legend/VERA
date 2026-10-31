'use client';

import React from 'react';
import { DashboardShell } from './DashboardShell';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

export default LayoutShell;
