import { createContext } from 'react';

export interface User {
  id: number;
  name: string;
  email?: string;
}

export type UserContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

export const UserContext = createContext<UserContextType>({} as UserContextType);
