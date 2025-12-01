// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// Import SVG icons
import BookmarkIcon from '../../../assets/images/icons/bookmark.svg';
import CalendarIcon from '../../../assets/images/icons/calendar.svg';
import ChatIcon from '../../../assets/images/icons/chat-lines.svg';
import CheckCircleIcon from '../../../assets/images/icons/check-circle.svg';
import CompassIcon from '../../../assets/images/icons/compass.svg';
import EditIcon from '../../../assets/images/icons/edit.svg';
import FeedIcon from '../../../assets/images/icons/feed.svg';
import FilterIcon from '../../../assets/images/icons/filter-list.svg';
import GroupIcon from '../../../assets/images/icons/group.svg';
import HomeIcon from '../../../assets/images/icons/home.svg';
import InfoCircleIcon from '../../../assets/images/icons/info-circle.svg';
import LevelIcon from '../../../assets/images/icons/level.svg';
import MapPinIcon from '../../../assets/images/icons/map-pin.svg';
import MountainIcon from '../../../assets/images/icons/mountain.svg';
import PostIcon from '../../../assets/images/icons/post.svg';
import ProfileIcon from '../../../assets/images/icons/profile.svg';
import SearchIcon from '../../../assets/images/icons/search.svg';
import SettingsIcon from '../../../assets/images/icons/settings.svg';
import SortIcon from '../../../assets/images/icons/sort.svg';
import XMarkIcon from '../../../assets/images/icons/xmark.svg';
import YenIcon from '../../../assets/images/icons/yen.svg';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type SvgIconMapping = Record<string, React.FC<any>>;
type IconSymbolName = keyof typeof MAPPING | keyof typeof SVG_MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',
  'exclamationmark.triangle': 'warning',
  'exclamationmark.triangle.fill': 'warning',
  'photo': 'image',
  'snow': 'ac-unit',
  'wind': 'air',
  'eye': 'visibility',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'text.bubble': 'comment',
  'square.and.arrow.up': 'share',
  'star.fill': 'star',
  'hand.thumbsup.fill': 'thumb-up',
  'person.crop.circle.badge.checkmark': 'verified-user',
} as IconMapping;

/**
 * SF Symbols to SVG icon mappings
 */
const SVG_MAPPING: SvgIconMapping = {
  'house.fill': HomeIcon,
  'magnifyingglass': SearchIcon,
  'message.fill': ChatIcon,
  'message': ChatIcon,
  'person.fill': ProfileIcon,
  'calendar': CalendarIcon,
  'mountain.2.fill': MountainIcon,
  'mountain.2': MountainIcon,
  'mappin.circle.fill': MapPinIcon,
  'mappin': MapPinIcon,
  'yensign.circle.fill': YenIcon,
  'yensign': YenIcon,
  'line.3.horizontal.decrease.circle': FilterIcon,
  'arrow.up.arrow.down': SortIcon,
  'xmark': XMarkIcon,
  'xmark.circle.fill': XMarkIcon,
  'checkmark': CheckCircleIcon,
  'checkmark.circle': CheckCircleIcon,
  'pencil': EditIcon,
  'info.circle.fill': InfoCircleIcon,
  'info.circle': InfoCircleIcon,
  'person.3.fill': GroupIcon,
  'person.2.fill': GroupIcon,
  'safari': CompassIcon,
  'plus.circle': PostIcon,
  'plus.circle.fill': PostIcon,
  'square.and.pencil': PostIcon,
  'gearshape': SettingsIcon,
  'gearshape.fill': SettingsIcon,
  'list.bullet': FeedIcon,
  'newspaper': FeedIcon,
  'tray.fill': FeedIcon,
  'bookmark': BookmarkIcon,
  'bookmark.fill': BookmarkIcon,
  'cube.fill': LevelIcon,
  'cube': LevelIcon,
};

/**
 * An icon component that uses native SF Symbols on iOS, and custom SVG/Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons or SVG.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // Check if SVG icon exists
  const SvgIcon = SVG_MAPPING[name];
  if (SvgIcon) {
    return <SvgIcon width={size} height={size} color={color} style={style} />;
  }

  // Fallback to Material Icons
  const materialIconName = MAPPING[name as keyof typeof MAPPING];
  if (materialIconName) {
    return <MaterialIcons color={color} size={size} name={materialIconName} style={style} />;
  }

  // If no mapping found, return null or a placeholder
  return null;
}
