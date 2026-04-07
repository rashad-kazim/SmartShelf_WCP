import React from 'react';

export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Right column */}
      <rect x="44" y="12" width="36" height="12" rx="3" fill="#3282c9" />
      <rect x="44" y="28" width="26" height="12" rx="3" fill="#42a3e1" />
      <rect x="44" y="44" width="16" height="12" rx="3" fill="#6bd0f8" />
      <rect x="44" y="60" width="26" height="12" rx="3" fill="#6bd0f8" />
      <rect x="44" y="76" width="36" height="12" rx="3" fill="#6bd0f8" />
      
      {/* Left column */}
      <rect x="30" y="28" width="10" height="12" rx="3" fill="#14539a" />
      <rect x="20" y="44" width="20" height="12" rx="3" fill="#14539a" />
      <rect x="30" y="60" width="10" height="12" rx="3" fill="#14539a" />
    </svg>
  );
}
