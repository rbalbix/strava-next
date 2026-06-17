import Image from 'next/image';

interface MountainBikeIconProps {
  className?: string;
  color?: string;
  title?: string;
}

export default function MountainBikeIcon({
  className,
  color,
  title,
}: MountainBikeIconProps) {
  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  return (
    <Image
      src='/images/cyclist.png'
      alt='[icone de um ciclista de mountain bike]'
      width={36}
      height={36}
      priority={true}
      placeholder='blur'
      blurDataURL={BLUR_DATA_URL}
      sizes='(max-width: 480px) 90vw, 240px'
    />
  );
}
