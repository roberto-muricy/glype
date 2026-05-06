import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

// Mini-conjunto de ícones usado pelos componentes UI.
// Substituir por SVGs próprios se quiser mais controle visual.

interface IconProps {
  size?: number;
  color?: string;
}

const make = (name: ComponentProps<typeof Ionicons>['name']) =>
  function Icon({ size = 16, color = '#fff' }: IconProps) {
    return <Ionicons name={name} size={size} color={color} />;
  };

export const SearchIcon = make('search');
export const CloseIcon = make('close');
export const HeartIcon = make('heart');
export const HeartOutlineIcon = make('heart-outline');
export const CheckIcon = make('checkmark');
export const InfoIcon = make('information-circle');
export const WarningIcon = make('alert-circle');
export const HomeIcon = make('home-outline');
export const HomeFilledIcon = make('home');
export const SearchTabIcon = make('search-outline');
export const LibraryIcon = make('library-outline');
export const LibraryFilledIcon = make('library');
export const PersonIcon = make('person-outline');
export const PersonFilledIcon = make('person');
export const PlusIcon = make('add');
export const StarIcon = make('star');
export const StarHalfIcon = make('star-half');
export const StarOutlineIcon = make('star-outline');
