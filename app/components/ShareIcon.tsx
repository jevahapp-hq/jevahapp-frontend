import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface ShareIconProps {
  size?: number;
  color?: string;
}

export default function ShareIcon({ size = 24, color = "#6B7280" }: ShareIconProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08264 9.26727C7.54305 8.48822 6.60487 8 5.5 8C4.11929 8 3 9.11929 3 10.5C3 11.8807 4.11929 13 5.5 13C6.60487 13 7.54305 12.5118 8.08264 11.7327L15.0227 15.6294C15.0077 15.7508 15 15.8745 15 16C15 17.6569 16.3431 19 18 19C19.6569 19 21 17.6569 21 16C21 14.3431 19.6569 13 18 13C16.8951 13 15.9569 13.4882 15.4174 14.2673L8.47736 10.3706C8.49232 10.2492 8.5 10.1255 8.5 10C8.5 9.87452 8.49232 9.75083 8.47736 9.62939L15.4174 5.73273C15.9569 6.51178 16.8951 7 18 7C18.5523 7 19 7.44772 19 8C19 8.55228 18.5523 9 18 9C17.4477 9 17 8.55228 17 8C17 7.44772 17.4477 7 18 7Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}




