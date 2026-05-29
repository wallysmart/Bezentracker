import React from "react";

export default function Logo({ size = "normal" }: { size?: "normal" | "compact" }) {
  const svgClass = size === "compact" ? "w-44 sm:w-52 h-auto" : "w-64 sm:w-72 h-auto";

  return (
    <div className="flex flex-col items-center justify-center select-none py-1">
      {/* Hand-drawn style SVG echoing the Bezenhof logo with modern line-art precision */}
      <svg
        className={svgClass}
        viewBox="0 0 400 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          
          {/* LEFT OUTER LEAF (similar to the hand-drawn leaf on the left) */}
          <path d="M140 100 C110 80, 80 85, 45 95 C62 110, 68 120, 80 135 C100 145, 125 140, 140 125" />
          {/* Leaf center vein */}
          <path d="M45 95 C75 105, 110 112, 140 112" strokeWidth="1.5" />
          {/* Leaf small veins */}
          <path d="M70 102 C65 92, 58 87, 58 87" strokeWidth="1.2" />
          <path d="M85 108 C80 96, 73 90, 73 90" strokeWidth="1.2" />
          <path d="M105 111 C102 98, 95 92, 95 92" strokeWidth="1.2" />
          <path d="M125 112 C125 100, 120 95, 120 95" strokeWidth="1.2" />
          <path d="M60 101 C65 111, 72 118, 72 118" strokeWidth="1.2" />
          <path d="M78 110 C85 122, 92 128, 92 128" strokeWidth="1.2" />
          <path d="M96 112 C105 125, 112 131, 112 131" strokeWidth="1.2" />
          <path d="M115 112 C125 124, 131 128, 131 128" strokeWidth="1.2" />

          {/* RIGHT OUTER LEAF (similar to the hand-drawn leaf on the right) */}
          <path d="M260 100 C290 80, 320 85, 355 95 C338 110, 332 120, 320 135 C300 145, 275 140, 260 125" />
          {/* Leaf center vein */}
          <path d="M355 95 C325 105, 290 112, 260 112" strokeWidth="1.5" />
          {/* Leaf small veins */}
          <path d="M330 102 C335 92, 342 87, 342 87" strokeWidth="1.2" />
          <path d="M315 108 C320 96, 327 90, 327 90" strokeWidth="1.2" />
          <path d="M295 111 C298 98, 305 92, 305 92" strokeWidth="1.2" />
          <path d="M275 112 C275 100, 280 95, 280 95" strokeWidth="1.2" />
          <path d="M340 101 C335 111, 328 118, 328 118" strokeWidth="1.2" />
          <path d="M322 110 C315 122, 308 128, 308 128" strokeWidth="1.2" />
          <path d="M304 112 C295 125, 288 131, 288 131" strokeWidth="1.2" />
          <path d="M285 112 C275 124, 269 128, 269 128" strokeWidth="1.2" />

          {/* STRAWBERRY 1 (Left-Center) */}
          <g transform="translate(141, 88) rotate(-5)">
            {/* Strawberry outline shape */}
            <path d="M10 5 C5 15, 4 25, 12 32 C18 36, 24 34, 26 28 C29 20, 25 10, 18 5 L10 5 Z" fill="#FFFFFF" />
            {/* Seed dots */}
            <circle cx="10" cy="12" r="1" fill="#1E293B" />
            <circle cx="14" cy="18" r="1" fill="#1E293B" />
            <circle cx="11" cy="24" r="1" fill="#1E293B" />
            <circle cx="18" cy="24" r="1" fill="#1E293B" />
            <circle cx="19" cy="14" r="1" fill="#1E293B" />
            <circle cx="23" cy="20" r="1" fill="#1E293B" />
            {/* Leafy Cap */}
            <path d="M7 5 C11 7, 14 6, 17 4 C15 7, 18 10, 21 6 C17 10, 12 9, 8 7" strokeWidth="1.8" />
          </g>

          {/* STRAWBERRY 2 (Center-Left small) */}
          <g transform="translate(168, 93) scale(0.85) rotate(10)">
            <path d="M10 5 C5 15, 4 25, 12 32 C18 36, 24 34, 26 28 C29 20, 25 10, 18 5 L10 5 Z" fill="#FFFFFF" />
            <circle cx="10" cy="12" r="1" fill="#1E293B" />
            <circle cx="14" cy="18" r="1" fill="#1E293B" />
            <circle cx="11" cy="24" r="1" fill="#1E293B" />
            <circle cx="18" cy="24" r="1" fill="#1E293B" />
            <circle cx="19" cy="14" r="1" fill="#1E293B" />
            <circle cx="23" cy="20" r="1" fill="#1E293B" />
            <path d="M7 5 C11 7, 14 6, 17 4 C15 7, 18 10, 21 6 C17 10, 12 9, 8 7" strokeWidth="1.8" />
          </g>

          {/* STRAWBERRY 3 (Center-Right) */}
          <g transform="translate(187, 85) rotate(-1)">
            <path d="M12 5 C6 16, 5 26, 13 33 C19 37, 25 35, 27 29 C30 21, 26 11, 20 5 L12 5 Z" fill="#FFFFFF" />
            <circle cx="12" cy="12" r="1" fill="#1E293B" />
            <circle cx="16" cy="18" r="1" fill="#1E293B" />
            <circle cx="13" cy="25" r="1" fill="#1E293B" />
            <circle cx="20" cy="25" r="1" fill="#1E293B" />
            <circle cx="21" cy="14" r="1" fill="#1E293B" />
            <circle cx="24" cy="20" r="1" fill="#1E293B" />
            <path d="M9 5 C13 7, 16 6, 19 4 C17 7, 20 10, 23 6 C19 10, 14 9, 10 7" strokeWidth="1.8" />
          </g>

          {/* STRAWBERRY 4 (Center-Right extra-small) */}
          <g transform="translate(225, 96) scale(0.7) rotate(-15)">
            <path d="M10 5 C5 15, 4 25, 12 32 C18 36, 24 34, 26 28 C29 20, 25 10, 18 5 L10 5 Z" fill="#FFFFFF" />
            <circle cx="10" cy="12" r="1" fill="#1E293B" />
            <circle cx="14" cy="18" r="1" fill="#1E293B" />
            <circle cx="19" cy="14" r="1" fill="#1E293B" />
            <path d="M7 5 C11 7, 14 6, 17 4 C15 7, 18 10, 21 6" strokeWidth="1.8" />
          </g>

          {/* STRAWBERRY 5 (Right-Center) */}
          <g transform="translate(248, 91) scale(0.9) rotate(8)">
            <path d="M10 5 C5 15, 4 25, 12 32 C18 36, 24 34, 26 28 C29 20, 25 10, 18 5 L10 5 Z" fill="#FFFFFF" />
            <circle cx="10" cy="12" r="1" fill="#1E293B" />
            <circle cx="14" cy="18" r="1" fill="#1E293B" />
            <circle cx="11" cy="24" r="1" fill="#1E293B" />
            <circle cx="18" cy="24" r="1" fill="#1E293B" />
            <circle cx="19" cy="14" r="1" fill="#1E293B" />
            <circle cx="23" cy="20" r="1" fill="#1E293B" />
            <path d="M7 5 C11 7, 14 6, 17 4 C15 7, 18 10, 21 6 C17 10, 12 9, 8 7" strokeWidth="1.8" />
          </g>

          {/* SMALL FLOWER BLOSSOM 1 (Left Side of Center Cluster) */}
          <g transform="translate(212, 104) scale(0.8)">
            <path d="M10 5 C10 1, 14 1, 14 5 C18 5, 18 9, 14 9 C14 13, 10 13, 10 9 C6 9, 6 5, 10 5 Z" fill="#FFFFFF" />
            <circle cx="12" cy="7" r="2.5" fill="#1E293B" />
          </g>

          {/* SMALL FLOWER BLOSSOM 2 (Right Side of Center Cluster) */}
          <g transform="translate(262, 88) scale(0.7)">
            <path d="M10 5 C10 1, 14 1, 14 5 C18 5, 18 9, 14 9 C14 13, 10 13, 10 9 C6 9, 6 5, 10 5 Z" fill="#FFFFFF" />
            <circle cx="12" cy="7" r="2.5" fill="#1E293B" />
          </g>

          {/* SMALL DECORATIVE EXTRA LEAF UNDER RIGHT FLOWER */}
          <path d="M268 105 C275 106, 288 116, 290 125 C281 124, 271 115, 268 105" strokeWidth="1.8" />
          <path d="M268 105 C275 111, 282 117, 290 125" strokeWidth="1.2" />

        </g>

        {/* BEZENTRACKER TYPOGRAPHY in exact same Tall, slender, rustic handwritten feel of the uploaded logo */}
        <text
          x="50%"
          y="222"
          textAnchor="middle"
          fill="#BE123C"
          style={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontSize: "46px",
            fontWeight: "950",
            letterSpacing: "0.15em"
          }}
        >
          BezenTracker
        </text>
      </svg>
    </div>
  );
}
