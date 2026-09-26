import type { Metadata } from 'next';
import { Amiri, Aref_Ruqaa, Reem_Kufi } from 'next/font/google';
import DarAlHajarExperience from '@/components/dar-alhajar/DarAlHajarExperience';

const ruqaa = Aref_Ruqaa({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-ruqaa', display: 'swap' });
const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-amiri', display: 'swap' });
const kufi = Reem_Kufi({ subsets: ['arabic'], weight: ['400', '500'], variable: '--font-kufi', display: 'swap' });

export const metadata: Metadata = {
  title: 'دار الحجر — قصرٌ نبت من الصخر',
  description: 'إعلان تراثي ثلاثي الأبعاد لدار الحجر في وادي ظهر، صنعاء.',
};

export default function DarAlHajarPage() {
  return (
    <div className={`${ruqaa.variable} ${amiri.variable} ${kufi.variable}`}>
      <DarAlHajarExperience />
    </div>
  );
}
