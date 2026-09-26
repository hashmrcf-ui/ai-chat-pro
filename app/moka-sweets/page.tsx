import type { Metadata } from 'next';
import { Lalezar } from 'next/font/google';
import MokaSweetsExperience from '@/components/mokaSweets/MokaSweetsExperience';

const display = Lalezar({ subsets: ['arabic', 'latin'], weight: '400', variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'حلويات موكا — كلّ الحبّ منذ ١٩٩١',
  description: 'مقترح تصميمي تفاعلي لحلويات موكا.',
};

export default function MokaSweetsPage() {
  return (
    <div className={display.variable}>
      <MokaSweetsExperience />
    </div>
  );
}
