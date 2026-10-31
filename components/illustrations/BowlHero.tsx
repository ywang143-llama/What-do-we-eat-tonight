import { cn } from "@/lib/utils";

export function BowlHero({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 236"
      role="img"
      aria-label="一碗热腾腾的汤，冒着热气"
      className={cn("h-auto w-full", className)}
    >
      <defs>
        <linearGradient id="bowl-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="100%" stopColor="#EFDCC2" />
        </linearGradient>
        <linearGradient id="bowl-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFCF4" />
          <stop offset="100%" stopColor="#F6E6CD" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#F8DFB4" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F8DFB4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="180" cy="112" r="104" fill="url(#hero-glow)" />
      <circle
        cx="180"
        cy="112"
        r="88"
        fill="none"
        stroke="#E9CEA6"
        strokeWidth="1.5"
        strokeDasharray="3 9"
        opacity="0.7"
      />

      {/* steam */}
      <g
        stroke="#D9B98E"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      >
        <path d="M138 96c-10-12 8-18 0-30s4-20 4-20" />
        <path d="M180 88c-11-13 9-21 0-34s5-22 5-22" />
        <path d="M222 96c-10-12 8-18 0-30s4-20 4-20" />
      </g>

      {/* chopsticks */}
      <g stroke="#A9683F" strokeWidth="6" strokeLinecap="round">
        <path d="M252 44l62 62" />
        <path d="M264 35l62 62" />
      </g>

      {/* bowl */}
      <ellipse cx="180" cy="205" rx="88" ry="10" fill="#C9A87E" opacity="0.22" />
      <path
        d="M76 112h208c-5 55-44 84-104 84s-99-29-104-84Z"
        fill="url(#bowl-body)"
        stroke="#E5C7A0"
        strokeWidth="2"
      />
      <ellipse
        cx="180"
        cy="112"
        rx="105"
        ry="19"
        fill="url(#bowl-rim)"
        stroke="#E5C7A0"
        strokeWidth="2"
      />
      <ellipse cx="180" cy="112" rx="90" ry="13" fill="#EFB35C" />
      <ellipse cx="180" cy="111" rx="90" ry="13" fill="#F4C274" opacity="0.55" />

      {/* soup garnish */}
      <circle cx="142" cy="108" r="7" fill="#D96B4A" />
      <circle cx="161" cy="114" r="5.5" fill="#D96B4A" opacity="0.85" />
      <circle cx="208" cy="108" r="6.5" fill="#7F9A72" />
      <circle cx="225" cy="114" r="4.5" fill="#7F9A72" opacity="0.8" />
      <ellipse cx="187" cy="108" rx="10" ry="5" fill="#FFF3D8" opacity="0.9" />
      <circle cx="122" cy="115" r="4" fill="#7F9A72" opacity="0.7" />

      {/* little heart on the bowl */}
      <path
        d="M180 165c-8-9-22-2-22 8 0 10 13 16 22 23 9-7 22-13 22-23 0-10-14-17-22-8Z"
        fill="#C26A4A"
        opacity="0.9"
      />
      <path
        d="M180 165c-8-9-22-2-22 8 0 10 13 16 22 23 9-7 22-13 22-23 0-10-14-17-22-8Z"
        fill="none"
        stroke="#A9553A"
        strokeWidth="1"
        opacity="0.35"
      />

      {/* garnish around */}
      <g opacity="0.8">
        <circle cx="58" cy="76" r="4" fill="#E5A13C" />
        <circle cx="304" cy="155" r="5" fill="#E5A13C" opacity="0.6" />
        <path
          d="M62 150c8-8 18-8 24 0-8 8-17 8-24 0Z"
          fill="#9DB48D"
          opacity="0.7"
        />
        <path
          d="M292 62c7-7 16-7 21 0-7 7-15 7-21 0Z"
          fill="#9DB48D"
          opacity="0.55"
        />
      </g>
    </svg>
  );
}
