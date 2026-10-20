import React from 'react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'aside' | 'div' | 'article';
  ariaLabel?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
  as: Component = 'section',
  ariaLabel,
}) => {
  return (
    <Component
      aria-label={ariaLabel ?? title}
      className={`rounded-md border border-border-subtle bg-panel shadow-panel ${className}`}
    >
      {(title || badge || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border-subtle bg-elevated/40 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {title && (
                <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
                  {title}
                </h2>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </Component>
  );
};
