interface ChainIconProps {
  className?: string;
}

export default function ChainIcon({ className }: ChainIconProps) {
  return (
    <svg
      className={className}
      viewBox='0 0 128 36'
      role='img'
      aria-label='Chain icon'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g fill='currentColor'>
        <circle cx='20' cy='18' r='14' />
        <circle cx='44' cy='18' r='14' />
        <rect x='20' y='4' width='24' height='28' rx='14' />

        <path d='M58 12 L70 12 L66 18 L70 24 L58 24 L62 18 Z' />

        <circle cx='84' cy='18' r='14' />
        <circle cx='108' cy='18' r='14' />
        <rect x='84' y='4' width='24' height='28' rx='14' />
      </g>

      <g fill='var(--background)'>
        <circle cx='20' cy='18' r='5' />
        <circle cx='44' cy='18' r='5' />
        <circle cx='84' cy='18' r='5' />
        <circle cx='108' cy='18' r='5' />
      </g>
    </svg>
  );
}
