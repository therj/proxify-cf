import React from 'react';

/** Theme-aware empty-state illustration (uses currentColor). */
export const AuditEmptyIllustration: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="160"
    height="140"
    viewBox="0 0 160 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <path
      d="M40 28h80c4 0 8 3 9 7l8 28c1 4-2 8-6 9l-2 1H31l-2-1c-4-1-7-5-6-9l8-28c1-4 5-7 9-7Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      opacity="0.35"
    />
    <path
      d="M52 46h56M52 58h40"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.25"
    />
    <circle cx="118" cy="88" r="28" stroke="var(--accent-primary)" strokeWidth="2" opacity="0.45" />
    <path
      d="M106 88h24M118 76v24"
      stroke="var(--accent-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M28 112h104"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.15"
    />
  </svg>
);
