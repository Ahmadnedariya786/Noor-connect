import React from 'react';

/**
 * Ornamental Manuscript Divider (Batch 1 & 2 Ref Image 9)
 * Renders between Arabic script and translation / commentary blocks.
 * Strictly consumes existing CSS custom-property tokens (--border, --accent, --accent-text).
 */
export function ManuscriptDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 w-full my-2.5 select-none ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '10px 0',
        width: '100%',
        boxSizing: 'border-box',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--border), var(--accent), var(--border), transparent)',
          opacity: 0.65,
        }}
      />
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="currentColor"
        style={{ color: 'var(--accent-text)', flexShrink: 0 }}
      >
        <path d="M4 0 L8 4 L4 8 L0 4 Z" />
      </svg>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--border), var(--accent), var(--border), transparent)',
          opacity: 0.65,
        }}
      />
    </div>
  );
}

export default ManuscriptDivider;
