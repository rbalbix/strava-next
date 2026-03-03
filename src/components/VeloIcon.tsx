import Image from 'next/image';
import { memo } from 'react';

function VeloIcon() {
  return (
    <Image
      src='/velo.gif'
      width={156}
      height={104}
      alt='Ícone de bicicleta'
      unoptimized
      priority
    />
  );
}

export default memo(VeloIcon);
