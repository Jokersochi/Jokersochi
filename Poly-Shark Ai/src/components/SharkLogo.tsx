"use client";
import { motion } from "framer-motion";

export function SharkLogo({ size = 40 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="sharkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#glow)">
        <path
          d="M6 34 C 14 18, 36 12, 50 22 L 58 16 L 56 28 C 60 32, 60 36, 56 40 L 58 52 L 50 46 C 36 56, 14 50, 6 34 Z"
          fill="url(#sharkGrad)"
        />
        <circle cx="44" cy="28" r="2.5" fill="#050d1c" />
        <circle cx="44.7" cy="27.3" r="0.8" fill="#fff" />
        <path d="M30 36 L 38 36 L 36 40 L 32 40 Z" fill="#050d1c" opacity="0.6" />
      </g>
    </motion.svg>
  );
}
