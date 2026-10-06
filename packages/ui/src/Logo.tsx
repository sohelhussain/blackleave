import React from 'react';

export interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  variant?: 'dark' | 'white';
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'white',
  size = 32,
  className = '',
  alt = 'blackLeave logo',
  ...props
}) => {
  const src = variant === 'white' ? '/logo-white.png' : '/logo.png';
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      {...props}
    />
  );
};
