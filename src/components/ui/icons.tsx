import type { NavIcon } from '@/features/app-shell/navigation';

type ExtraIcon =
  | 'plus'
  | 'pencil'
  | 'in'
  | 'out'
  | 'search'
  | 'leaf'
  | 'clock'
  | 'check'
  | 'x'
  | 'camera'
  | 'pin'
  | 'phone'
  | 'mail'
  | 'flame'
  | 'trash'
  | 'trophy'
  | 'chevron';

const paths: Record<NavIcon | ExtraIcon, string> = {
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm-6 9c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2 .7 3.5 3 3.5 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3 2',
  check: 'M5 12.5 10 17.5 19 7',
  x: 'M6 6l12 12M18 6 6 18',
  camera: 'M4 8h3l1.5-2.5h7L17 8h3v11H4zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  phone:
    'M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M3.5 6h17v12h-17zm0 0 8.5 7 8.5-7',
  flame:
    'M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 3-5.8 3.6-9.3 2.4 1.6 3.7 3.8 3.9 6.3 1-.8 1.6-2 1.7-3.3 2.1 1.8 3.8 4.1 3.8 6.6C18.5 18.4 16 21 12 21z',
  trash: 'M4.5 7h15M10 11v6m4-6v6M6.5 7l1 13h9l1-13M9.5 7V4h5v3',
  trophy:
    'M8 4h8v5a4 4 0 0 1-8 0zm0 1.5H4.5a3.5 3.5 0 0 0 3.6 4M16 5.5h3.5a3.5 3.5 0 0 1-3.6 4M12 13v4m-4 3h8l-1-3H9z',
  chevron: 'm9 6 6 6-6 6',
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
