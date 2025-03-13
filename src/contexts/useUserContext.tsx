import { useContext } from "react";
import { UserContext } from "./UserContextProvider";

export const useUserContext = () => {
  const context = useContext(UserContext);

  if (!context)
    throw new Error(
      "UserContext must be called from within the UserContextProvider"
    );

  return context;
};
