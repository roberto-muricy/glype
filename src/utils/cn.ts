import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combina classes condicionalmente e remove duplicatas/conflitos do Tailwind.
// Permite override do consumidor: <Button className="px-8" /> sobrescreve
// o px da variant.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
