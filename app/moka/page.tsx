import type { Metadata } from 'next';
import { Reem_Kufi } from 'next/font/google';
import MokaExperience from '@/components/moka/MokaExperience';

const kufi = Reem_Kufi({ subsets: ['arabic', 'latin'], weight: ['400', '500', '700'], variable: '--font-kufi', display: 'swap' });

export const metadata: Metadata = {
  title: 'موكا — كوبٌ واحد',
  description: 'نموذج أولي لتجربة ثلاثية الأبعاد لكوب موكا.',
};

export default function MokaPage() {
  return (
    <div className={kufi.variable}>
      <MokaExperience />
    </div>
  );
}
