import * as React from 'react';
import Svg, { Path, SvgProps } from 'react-native-svg';

interface BackArrowIconProps extends SvgProps {
  size?: number;
  color?: string;
}

export function BackArrowIcon({
  size = 24,
  color = '#000000',
  ...props
}: BackArrowIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <Path
        d="M16 12H8M8 12L11.5 15.5M8 12L11.5 8.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
