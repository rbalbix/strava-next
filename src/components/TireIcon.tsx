import Image from 'next/image';
import { memo } from 'react';

function TireIcon() {
  return (
    <Image src='/tire.svg' width={200} height={200} alt='Ícone de pneu' priority />
  );
}

export default memo(TireIcon);
