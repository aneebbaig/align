interface Props {
  size?: number;
  className?: string;
}

export function AlignLogo({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 4 21 C 4 14.37 9.37 9 16 9 C 22.63 9 28 14.37 28 21"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      />
      <path
        d="M 8 21 C 8 16.58 11.58 13 16 13 C 20.42 13 24 16.58 24 21"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      />
      <path
        d="M 11.5 21 C 11.5 18.51 13.51 16.5 16 16.5 C 18.49 16.5 20.5 18.51 20.5 21"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      />
      <circle cx="16" cy="21" r="1.6" fill="#f59e0b" />
    </svg>
  );
}
