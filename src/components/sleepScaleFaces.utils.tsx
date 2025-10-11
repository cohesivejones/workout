import React from 'react';
import { SleepFace1, SleepFace2, SleepFace3, SleepFace4, SleepFace5 } from './SleepScaleFaces';

interface SleepFaceProps {
  size?: number;
  className?: string;
}

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
