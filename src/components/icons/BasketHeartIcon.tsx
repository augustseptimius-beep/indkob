import { SVGProps } from 'react';

export function BasketHeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Basket body */}
      <path
        d="M8 24h48l-5 28H13L8 24z"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Basket rim nubs */}
      <path
        d="M14 24v-2M50 24v-2"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Handle */}
      <path
        d="M20 24c0-12 8-18 12-18s12 6 12 18"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Heart */}
      <path
        d="M32 46c-1.5-1.5-10-8-10-14a5.5 5.5 0 0 1 10-3.2 5.5 5.5 0 0 1 10 3.2c0 6-8.5 12.5-10 14z"
        fill="currentColor"
      />
    </svg>
  );
}
