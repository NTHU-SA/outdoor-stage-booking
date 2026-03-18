import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to format date in Taipei time (UTC+8) for server-side rendering
// This ensures that server-side formatting matches the user's local time (Taipei)
// regardless of the server's actual timezone (e.g. UTC on Vercel)
export function toTaipeiTime(dateInput: Date | string): Date {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const part = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  return new Date(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second')
  );
}

const SOCKET_TAG = "\n(需要使用插座)"

/** Check if a booking purpose includes the socket usage tag */
export function hasSocketUsage(purpose: string | null): boolean {
  return !!purpose?.includes(SOCKET_TAG)
}

/** Strip the socket usage tag from the purpose text for display */
export function stripSocketTag(purpose: string | null): string {
  return (purpose || '').replace(SOCKET_TAG, '')
}
