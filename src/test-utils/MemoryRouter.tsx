import { useState, ReactNode } from 'react';
import { Router } from 'wouter';

interface MemoryRouterProps {
  initialPath: string;
  children: ReactNode;
}

export function MemoryRouter({ initialPath, children }: MemoryRouterProps) {
  const [location, setLocation] = useState(initialPath);
  return <Router hook={() => [location, setLocation]}>{children}</Router>;
}
