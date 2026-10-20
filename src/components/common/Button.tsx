import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'pill';
  size?: 'sm' | 'md';
  active?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  active = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}) => {
  const sizeClasses =
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm';

  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#D5A653]/20 text-[#F3EFE5] border border-[#D5A653]/65 hover:bg-[#D5A653]/30 hover:border-[#D5A653]',
    secondary: active
      ? 'bg-elevated text-text-primary border border-[#D5A653]/75 shadow-glow'
      : 'bg-recess/80 text-text-secondary border border-border-subtle hover:bg-elevated hover:border-[#7CA3C7]/45 hover:text-text-primary',
    ghost: active
      ? 'bg-[#D5A653]/15 text-[#E6C27A] border border-[#D5A653]/50'
      : 'bg-transparent text-text-secondary border border-transparent hover:bg-elevated/60 hover:text-text-primary',
    pill: active
      ? 'rounded-sm bg-[#D5A653]/20 text-[#F3EFE5] border border-[#D5A653]/70'
      : 'rounded-sm bg-recess/80 text-text-secondary border border-border-subtle hover:border-[#7CA3C7]/45 hover:text-text-primary',
  };

  const radiusClass = variant === 'pill' ? 'rounded-sm' : 'rounded';

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${radiusClass} ${sizeClasses} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
