import React from 'react';
import {
  PainFace0,
  PainFace1,
  PainFace2,
  PainFace3,
  PainFace4,
  PainFace5,
  PainFace6,
  PainFace7,
  PainFace8,
  PainFace9,
  PainFace10,
} from './PainScaleFaces';

interface PainFaceProps {
  size?: number;
  className?: string;
}

// Function to get the appropriate face component based on pain level
export const getPainFace = (level: number, props: PainFaceProps = {}) => {
  switch (level) {
    case 0:
      return <PainFace0 {...props} />;
    case 1:
      return <PainFace1 {...props} />;
    case 2:
      return <PainFace2 {...props} />;
    case 3:
      return <PainFace3 {...props} />;
    case 4:
      return <PainFace4 {...props} />;
    case 5:
      return <PainFace5 {...props} />;
    case 6:
      return <PainFace6 {...props} />;
    case 7:
      return <PainFace7 {...props} />;
    case 8:
      return <PainFace8 {...props} />;
    case 9:
      return <PainFace9 {...props} />;
    case 10:
      return <PainFace10 {...props} />;
    default:
      return <PainFace0 {...props} />;
  }
};
