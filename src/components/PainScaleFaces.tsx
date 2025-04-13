import React from 'react';

interface PainFaceProps {
  size?: number;
  className?: string;
}

// Pain level 0: Pain free - Happy face
export const PainFace0: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#4caf50" stroke="#388e3c" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 65 Q50 80 70 65" stroke="#fff" strokeWidth="4" fill="none" />
  </svg>
);

// Pain level 1: Very mild pain - Slightly less happy face
export const PainFace1: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#8bc34a" stroke="#689f38" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 65 Q50 78 70 65" stroke="#fff" strokeWidth="4" fill="none" />
  </svg>
);

// Pain level 2: Minor pain - Neutral-happy face
export const PainFace2: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#8bc34a" stroke="#689f38" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 65 Q50 75 70 65" stroke="#fff" strokeWidth="4" fill="none" />
  </svg>
);

// Pain level 3: Noticeable pain - Neutral face
export const PainFace3: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#8bc34a" stroke="#689f38" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <line x1="30" y1="65" x2="70" y2="65" stroke="#fff" strokeWidth="4" />
  </svg>
);

// Pain level 4: Moderate pain - Slightly concerned face
export const PainFace4: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#ffc107" stroke="#ffa000" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 68 Q50 63 70 68" stroke="#fff" strokeWidth="4" fill="none" />
  </svg>
);

// Pain level 5: Moderately strong pain - Concerned face
export const PainFace5: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#ffc107" stroke="#ffa000" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 70 Q50 62 70 70" stroke="#fff" strokeWidth="4" fill="none" />
  </svg>
);

// Pain level 6: Interfering pain - Sad face
export const PainFace6: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#ff9800" stroke="#f57c00" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 75 Q50 65 70 75" stroke="#fff" strokeWidth="4" fill="none" />
  </svg>
);

// Pain level 7: Severe pain - Very sad face with single tear
export const PainFace7: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#ff9800" stroke="#f57c00" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 80 Q50 68 70 80" stroke="#fff" strokeWidth="4" fill="none" />
    {/* Left teardrop */}
    <path d="M35 45 Q33 50 35 55 Q37 50 35 45" fill="#fff" stroke="#fff" strokeWidth="1" />
    {/* Right teardrop */}
    <path d="M65 45 Q63 50 65 55 Q67 50 65 45" fill="#fff" stroke="#fff" strokeWidth="1" />
  </svg>
);

// Pain level 8: Intense pain - Extremely sad face with single tear
export const PainFace8: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#f44336" stroke="#d32f2f" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 85 Q50 70 70 85" stroke="#fff" strokeWidth="4" fill="none" />
    {/* Left teardrop - slightly larger */}
    <path d="M35 45 Q32 52 35 60 Q38 52 35 45" fill="#fff" stroke="#fff" strokeWidth="1" />
    {/* Right teardrop - slightly larger */}
    <path d="M65 45 Q62 52 65 60 Q68 52 65 45" fill="#fff" stroke="#fff" strokeWidth="1" />
  </svg>
);

// Pain level 9: Excruciating pain - Crying face with two tears
export const PainFace9: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#f44336" stroke="#d32f2f" strokeWidth="2" />
    <circle cx="35" cy="40" r="5" fill="#fff" />
    <circle cx="65" cy="40" r="5" fill="#fff" />
    <path d="M30 85 Q50 70 70 85" stroke="#fff" strokeWidth="4" fill="none" />
    {/* Left teardrops */}
    <path d="M35 45 Q32 52 35 60 Q38 52 35 45" fill="#fff" stroke="#fff" strokeWidth="1" />
    <path d="M30 50 Q27 60 30 70 Q33 60 30 50" fill="#fff" stroke="#fff" strokeWidth="1" />
    {/* Right teardrops */}
    <path d="M65 45 Q62 52 65 60 Q68 52 65 45" fill="#fff" stroke="#fff" strokeWidth="1" />
    <path d="M70 50 Q67 60 70 70 Q73 60 70 50" fill="#fff" stroke="#fff" strokeWidth="1" />
  </svg>
);

// Pain level 10: Unspeakable pain - Extreme distress face with multiple tears
export const PainFace10: React.FC<PainFaceProps> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <circle cx="50" cy="50" r="45" fill="#d32f2f" stroke="#b71c1c" strokeWidth="2" />
    {/* X eyes for extreme pain */}
    <path d="M35 40 L 25 30 M 25 40 L 35 30" stroke="#fff" strokeWidth="3" />
    <path d="M65 40 L 75 30 M 75 40 L 65 30" stroke="#fff" strokeWidth="3" />
    <path d="M30 85 Q50 65 70 85" stroke="#fff" strokeWidth="4" fill="none" />
    {/* Left teardrops - multiple */}
    <path d="M35 45 Q32 52 35 60 Q38 52 35 45" fill="#fff" stroke="#fff" strokeWidth="1" />
    <path d="M30 50 Q27 60 30 70 Q33 60 30 50" fill="#fff" stroke="#fff" strokeWidth="1" />
    <path d="M25 45 Q22 60 25 75 Q28 60 25 45" fill="#fff" stroke="#fff" strokeWidth="1" />
    {/* Right teardrops - multiple */}
    <path d="M65 45 Q62 52 65 60 Q68 52 65 45" fill="#fff" stroke="#fff" strokeWidth="1" />
    <path d="M70 50 Q67 60 70 70 Q73 60 70 50" fill="#fff" stroke="#fff" strokeWidth="1" />
    <path d="M75 45 Q72 60 75 75 Q78 60 75 45" fill="#fff" stroke="#fff" strokeWidth="1" />
  </svg>
);

// Function to get the appropriate face component based on pain level
export const getPainFace = (level: number, props: PainFaceProps = {}) => {
  switch (level) {
    case 0: return <PainFace0 {...props} />;
    case 1: return <PainFace1 {...props} />;
    case 2: return <PainFace2 {...props} />;
    case 3: return <PainFace3 {...props} />;
    case 4: return <PainFace4 {...props} />;
    case 5: return <PainFace5 {...props} />;
    case 6: return <PainFace6 {...props} />;
    case 7: return <PainFace7 {...props} />;
    case 8: return <PainFace8 {...props} />;
    case 9: return <PainFace9 {...props} />;
    case 10: return <PainFace10 {...props} />;
    default: return <PainFace0 {...props} />;
  }
};
