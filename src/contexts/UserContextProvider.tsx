import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};
interface User {
  id: number;
  name: string;
}

export type UserContext = {
  user: User | null;
  login: (user: User) => void;
};

export const UserContext = createContext<UserContext>({} as UserContext);

export const UserContextProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const login = (user: User) => {
    setUser(user);
    navigate("/workouts");
  };

  return (
    <UserContext.Provider value={{ user, login }}>
      {children}
    </UserContext.Provider>
  );
};
