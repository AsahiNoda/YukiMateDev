import * as React from 'react';
import Svg, { Path, SvgProps } from 'react-native-svg';

interface BookmarkIconProps extends SvgProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

export function BookmarkIcon({
  size = 24,
  color = '#000000',
  filled = false,
  ...props
}: BookmarkIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      {...props}
    >
      <Path
        d="M5 21V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21L13.0815 17.1953C12.4227 16.7717 11.5773 16.7717 10.9185 17.1953L5 21Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}
