"use client";

// 21st.dev-style preview file — NOT routed in the app.
// The tunnel hero ships on the real landing page (app/(public)/page.tsx);
// this demo renders it standalone for component-preview purposes.

import PerspectiveTunnelHero from "@/components/ui/perspective-tunnel-hero";

export default function Demo() {
  return (
    <main className="min-h-screen w-full bg-night">
      <PerspectiveTunnelHero />
    </main>
  );
}
