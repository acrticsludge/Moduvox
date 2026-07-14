import React from 'react';
import { theme } from '../styles/theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  asChild?: boolean;
}

const variantStyles = {
  primary: {
    background: theme.colors.charcoal,
    color: '#FFFFFF',
    border: `1px solid ${theme.colors.charcoal}B3`, // 70% opacity
    hoverBg: theme.colors.charcoalHover,
    hoverBorder: theme.colors.charcoal,
    activeScale: 0.98,
    spring: true,
  },
  secondary: {
    background: theme.colors.secondary || 'oklch(0.965 0 0)',
    color: theme.colors.charcoal,
    border: `1px solid ${theme.colors.border || 'oklch(0.922 0 0)'}`,
    hoverBg: 'oklch(0.922 0 0)',
    activeScale: 0.98,
    spring: false,
  },
  destructive: {
    background: 'oklch(0.577 0.245 27.325)',
    color: '#FFFFFF',
    border: 'none',
    hoverBg: 'oklch(0.5 0.2 27.325)',
    activeScale: 0.98,
    spring: false,
  },
  outline: {
    background: 'transparent',
    color: theme.colors.charcoal,
    border: `1px solid ${theme.colors.zinc300 || '#D4D4D8'}`,
    hoverBg: theme.colors.zinc50 || '#FAFAFA',
    activeScale: 0.98,
    spring: false,
  },
  ghost: {
    background: 'transparent',
    color: theme.colors.mutedSteel,
    border: 'none',
    hoverBg: theme.colors.zinc100 || '#F4F4F5',
    activeScale: 0.98,
    spring: false,
  },
  link: {
    background: 'transparent',
    color: theme.colors.charcoal,
    border: 'none',
    hoverBg: 'transparent',
    textDecoration: 'underline',
    activeScale: 1,
    spring: false,
  },
};

const sizeStyles = {
  default: { height: 40, padding: '0 16px', fontSize: 14, gap: 8 },
  md: { height: 40, padding: '0 16px', fontSize: 14, gap: 8 },
  sm: { height: 32, padding: '0 12px', fontSize: 12, gap: 6 },
  lg: { height: 44, padding: '0 20px', fontSize: 14, gap: 8 },
  icon: { height: 40, width: 40, padding: 0, fontSize: 14, gap: 0 },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'default',
      loading = false,
      className,
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    const v = variantStyles[variant];
    const s = sizeStyles[size];
    const isDisabled = disabled || loading;

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: size === 'icon' ? 0 : s.padding,
      fontSize: s.fontSize,
      fontWeight: 500,
      fontFamily: theme.fonts.sans,
      borderRadius: theme.radius.md,
      border: v.border,
      background: v.background,
      color: v.color,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      textDecoration: v.textDecoration || 'none',
      opacity: isDisabled ? 0.5 : 1,
      pointerEvents: isDisabled ? 'none' : 'auto',
      transition: v.spring
        ? `transform ${theme.animation.fast}ms ${theme.animation.spring}, background ${theme.animation.fast}ms, border-color ${theme.animation.fast}ms`
        : `background ${theme.animation.fast}ms, transform ${theme.animation.fast}ms, border-color ${theme.animation.fast}ms`,
      ...style,
    };

    const hoverStyle: React.CSSProperties = {
      background: v.hoverBg,
      borderColor: v.hoverBorder || v.border,
      transform: `scale(${v.hoverScale || 1.02})`,
    };

    const activeStyle: React.CSSProperties = {
      transform: `scale(${v.activeScale})`,
    };

    return (
      <button
        ref={ref}
        style={baseStyle}
        onMouseEnter={(e) => {
          if (!isDisabled) Object.assign(e.currentTarget.style, hoverStyle);
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) Object.assign(e.currentTarget.style, baseStyle);
        }}
        onMouseDown={(e) => {
          if (!isDisabled) Object.assign(e.currentTarget.style, activeStyle);
        }}
        onMouseUp={(e) => {
          if (!isDisabled) Object.assign(e.currentTarget.style, hoverStyle);
        }}
        {...props}
      >
        {loading && (
          <svg
            style={{
              width: s.height * 0.5,
              height: s.height * 0.5,
              animation: 'spin 1s linear infinite',
              color: v.color,
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        )}
        {!loading && children}
      </button>
    )
  }
);

Button.displayName = 'Button';