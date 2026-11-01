import Image from "next/image";

/**
 * The VERA brand mark (logo tile) used everywhere the old blue "V" square was:
 * navbar, dashboard/console sidebars, auth screens. The artwork is a rounded
 * app-icon style tile on a near-white ground, so it sits cleanly on both the
 * light header and the dark `.sidebar-night` panels.
 */
export function BrandMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/vera-logo.png"
      alt="VERA logo"
      width={size}
      height={size}
      className={`shrink-0 rounded-lg ${className}`}
    />
  );
}

export default BrandMark;
