import React from 'react';

/** Props for the generic inline SVG `Icon` component. */
interface IconProps {
  type: 'generate' | 'download' | 'loading' | 'upload' | 'sun' | 'moon' | 'search' | 'sidebar-close' | 'sidebar-open';
  className?: string;
}

/**
 * Small collection of inlined SVGs keyed by `type`.
 * Tailwind classes can be passed via `className` for sizing/coloring.
 */
export const Icon: React.FC<IconProps> = ({ type, className = 'w-6 h-6' }) => {
  switch (type) {
    case 'generate':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 S0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case 'download':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      );
    case 'upload':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      );
    case 'loading':
      return (
        // Arc spinner: 10 dots along a 270° arc with trailing fade, leaving a gap
        <svg xmlns="http://www.w3.org/2000/svg" className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
          {/* angles used: 300°, 330°, 0°, 30°, 60°, 90°, 120°, 150°, 180°, 210° */}
          <circle cx="16" cy="5.072" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="1" />
          <circle cx="18.928" cy="8" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.92" />
          <circle cx="20" cy="12" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.82" />
          <circle cx="18.928" cy="16" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.72" />
          <circle cx="16" cy="18.928" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.62" />
          <circle cx="12" cy="20" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.52" />
          <circle cx="8" cy="18.928" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.42" />
          <circle cx="5.072" cy="16" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.32" />
          <circle cx="4" cy="12" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.22" />
          <circle cx="5.072" cy="8" r="1.8" className="text-brand-accent" fill="currentColor" fillOpacity="0.14" />
        </svg>
      );
    case 'sun':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 12a5 5 0 100-10 5 5 0 000 10z" />
        </svg>
      );
    case 'moon':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    case 'search':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'sidebar-close':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'sidebar-open':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      );
    default:
      return null;
  }
};