import Image from 'next/image';
import { memo } from 'react';

function VeloIcon() {
  return (
    <Image
      src='/velo.gif'
      width={156}
      height={104}
      alt=''
      aria-hidden='true'
      unoptimized
      priority
    />
  );
}

export default memo(VeloIcon);
