import React from "react";

interface SleepFaceProps {
  size?: number;
  className?: string;
}

// Sleep level 1: Very Poor - Exhausted face
export const SleepFace1: React.FC<SleepFaceProps> = ({
  size = 40,
  className,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle
      cx="50"
      cy="50"
      r="45"
      fill="#f44336"
      stroke="#d32f2f"
      strokeWidth="2"
    />
    {/* Tired eyes (half closed) */}
    <path
      d="M30 40 Q35 45 40 40"
      stroke="#fff"
      strokeWidth="3"
      fill="none"
    />
    <path
      d="M60 40 Q65 45 70 40"
      stroke="#fff"
      strokeWidth="3"
      fill="none"
    />
    {/* Frowning mouth */}
    <path d="M30 70 Q50 60 70 70" stroke="#fff" strokeWidth="4" fill="none" />
    {/* Dark circles under eyes */}
    <path
      d="M25 45 Q35 50 45 45"
      stroke="#d32f2f"
      strokeWidth="2"
      fill="none"
      opacity="0.5"
    />
    <path
      d="M55 45 Q65 50 75 45"
      stroke="#d32f2f"
      strokeWidth="2"
      fill="none"
      opacity="0.5"
    />
  </svg>
);

// Sleep level 2: Poor - Tired face
export const SleepFace2: React.FC<SleepFaceProps> = ({
  size = 40,
  className,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle
      cx="50"
      cy="50"
      r="45"
      fill="#ff9800"
      stroke="#f57c00"
      strokeWidth="2"
    />
    {/* Slightly tired eyes */}
    <path
      d="M30 40 Q35 43 40 40"
      stroke="#fff"
      strokeWidth="3"
      fill="none"
    />
    <path
      d="M60 40 Q65 43 70 40"
      stroke="#fff"
      strokeWidth="3"
      fill="none"
    />
    {/* Slightly frowning mouth */}
    <path d="M30 65 Q50 60 70 65" stroke="#fff" strokeWidth="4" fill="none" />
    {/* Light circles under eyes */}
    <path
      d="M30 45 Q35 48 40 45"
      stroke="#f57c00"
      strokeWidth="2"
      fill="none"
      opacity="0.3"
    />
    <path
      d="M60 45 Q65 48 70 45"
      stroke="#f57c00"
      strokeWidth="2"
      fill="none"
      opacity="0.3"
    />
  </svg>
);

// Sleep level 3: Fair - Neutral face
export const SleepFace3: React.FC<SleepFaceProps> = ({
  size = 40,
  className,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle
      cx="50"
      cy="50"
      r="45"
      fill="#ffc107"
      stroke="#ffa000"
      strokeWidth="2"
    />
    {/* Neutral eyes */}
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    {/* Neutral mouth */}
    <line x1="30" y1="65" x2="70" y2="65" stroke="#fff" strokeWidth="4" />
  </svg>
);

// Sleep level 4: Good - Mostly rested face
export const SleepFace4: React.FC<SleepFaceProps> = ({
  size = 40,
  className,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle
      cx="50"
      cy="50"
      r="45"
      fill="#8bc34a"
      stroke="#689f38"
      strokeWidth="2"
    />
    {/* Alert eyes */}
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    {/* Slight smile */}
    <path d="M30 65 Q50 75 70 65" stroke="#fff" strokeWidth="4" fill="none" />
  </svg>
);

// Sleep level 5: Excellent - Well-rested, happy face
export const SleepFace5: React.FC<SleepFaceProps> = ({
  size = 40,
  className,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle
      cx="50"
      cy="50"
      r="45"
      fill="#4caf50"
      stroke="#388e3c"
      strokeWidth="2"
    />
    {/* Wide awake eyes */}
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    {/* Big smile */}
    <path d="M30 65 Q50 85 70 65" stroke="#fff" strokeWidth="4" fill="none" />
  </svg>
);

// Function to get the appropriate face component based on sleep level
export const getSleepFace = (level: number, props: SleepFaceProps = {}) => {
  switch (level) {
    case 1:
      return <SleepFace1 {...props} />;
    case 2:
      return <SleepFace2 {...props} />;
    case 3:
      return <SleepFace3 {...props} />;
    case 4:
      return <SleepFace4 {...props} />;
    case 5:
      return <SleepFace5 {...props} />;
    default:
      return <SleepFace3 {...props} />; // Default to neutral face
  }
};
