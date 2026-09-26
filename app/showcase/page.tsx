import type { Metadata } from 'next';
import { Cormorant_Garamond } from 'next/font/google';
import LuxuryScrollExperience from '@/components/showcase/LuxuryScrollExperience';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Maison Lumen — Lumière Captive',
  description: 'A scroll-driven, real-time 3D product reveal built with Three.js, GSAP and Lenis.',
};

export default function ShowcasePage() {
  return (
    <div className={display.variable}>
      <LuxuryScrollExperience />
    </div>
  );
}
