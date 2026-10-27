import type { NavIcon } from '@/features/app-shell/navigation';

const paths: Record<NavIcon | 'plus' | 'pencil' | 'in' | 'out' | 'search' | 'leaf', string> = {
  home: 'M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  boxes: 'M3 8.5 12 4l9 4.5-9 4.5zM3 8.5V16l9 4.5 9-4.5V8.5M12 13v7.5',
  arrows: 'M7 7h13m0 0-3.5-3.5M20 7l-3.5 3.5M17 17H4m0 0 3.5 3.5M4 17l3.5-3.5',
  clipboard: 'M9 4h6v3H9zM7 5.5H5.5V21h13V5.5H17M8.5 12h7M8.5 16h5',
  truck:
    'M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5h4',
  plus: 'M12 5v14M5 12h14',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  in: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  out: 'M12 15V4m0 0L8 8m4-4 4 4M5 20h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 2-4-4',
  leaf: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14zm0 0 7-7',
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 fill-none stroke-current stroke-[1.8] ${className}`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
