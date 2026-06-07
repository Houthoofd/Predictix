import React from 'react';
import { 
  Dribbble, 
  Target,
  Activity,
  Zap,
  Timer,
  Crosshair,
  Circle
} from 'lucide-react';

export const SoccerBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="12,7 16,10 14.5,15 9.5,15 8,10" fill="currentColor" fillOpacity="0.2" />
    <line x1="12" y1="2" x2="12" y2="7" />
    <line x1="2" y1="9.5" x2="8" y2="10" />
    <line x1="5.5" y1="19.5" x2="9.5" y2="15" />
    <line x1="18.5" y1="19.5" x2="14.5" y2="15" />
    <line x1="22" y1="9.5" x2="16" y2="10" />
  </svg>
);

export const RugbyBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M5,19 C5,10 10,5 19,5 C19,14 14,19 5,19 Z" fill="currentColor" fillOpacity="0.2" />
    <line x1="5" y1="19" x2="19" y2="5" />
    <line x1="9" y1="13" x2="11" y2="15" />
    <line x1="11" y1="11" x2="13" y2="13" />
    <line x1="13" y1="9" x2="15" y2="11" />
  </svg>
);

export const HandballBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M6,6 C9,9 15,9 18,6" />
    <path d="M6,18 C9,15 15,15 18,18" />
    <path d="M6,6 C9,9 9,15 6,18" />
    <path d="M18,6 C15,9 15,15 18,18" />
  </svg>
);

export const VolleyballBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12,2 C12,12 2,12 2,12" />
    <path d="M12,12 C12,22 22,12 22,12" />
    <path d="M12,12 C22,12 12,2 12,2" />
    <path d="M2.5,9 C7,11 11,7 9,2.5" />
    <path d="M15,21.5 C13,17 17,13 21.5,15" />
    <path d="M9,21.5 C11,17 7,13 2.5,15" />
    <path d="M15,2.5 C17,7 13,11 21.5,9" />
  </svg>
);

export const HockeyIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M19,3 L7,15 L4,15 C3,15 2.5,16 3,17 L4.5,20 C5,21 6,21 7,20 L7,17 L19,5" />
    <path d="M14,18 C14,19 16.5,20 19,20 C21.5,20 24,19 24,18 C24,17 21.5,16 19,16 C16.5,16 14,17 14,18 Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M14,18 L14,19.5 C14,20.5 16.5,21.5 19,21.5 C21.5,21.5 24,20.5 24,19.5 L24,18" />
  </svg>
);

export const BaseballBallIcon = ({ size = 13, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M6,6 C9,9 9,15 6,18" />
    <path d="M18,6 C15,9 15,15 18,18" />
    <line x1="7.5" y1="8" x2="8.5" y2="7.5" />
    <line x1="8.5" y1="11" x2="9.5" y2="11" />
    <line x1="7.5" y1="14" x2="8.5" y2="14.5" />
    <line x1="16.5" y1="8" x2="15.5" y2="7.5" />
    <line x1="15.5" y1="11" x2="14.5" y2="11" />
    <line x1="16.5" y1="14" x2="15.5" y2="14.5" />
  </svg>
);

export const sportIcons = {
  football: SoccerBallIcon,
  basketball: Dribbble,
  tennis: Target,
  rugby: RugbyBallIcon,
  handball: HandballBallIcon,
  volleyball: VolleyballBallIcon,
  hockey: HockeyIcon,
  baseball: BaseballBallIcon,
  'american-football': RugbyBallIcon,
  'table-tennis': Circle,
  badminton: Zap,
  cricket: Timer,
  snooker: Crosshair,
  futsal: SoccerBallIcon
};
