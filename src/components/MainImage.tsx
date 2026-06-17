import Image from 'next/image';
import { memo } from 'react';

function MainImage() {
  return (
    <Image
      src='/images/gearlife_logo.svg'
      width={223}
      height={227}
      alt='Imagem inicial do GearLife'
      aria-hidden='true'
      unoptimized
      priority
    />
  );
}

export default memo(MainImage);
