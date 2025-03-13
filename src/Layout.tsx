import { Outlet } from "react-router-dom";
import { UserContextProvider } from "./contexts/UserContextProvider";
import { useUserContext } from "./contexts/useUserContext";
import LoginPage from "./pages/LoginPage";

const AuthenticatedApp = () => {
  const { user } = useUserContext();

  if (!user) {
    return <LoginPage />;
  }

  return <Outlet />;
};
export const Layout = () => {
  return (
    <UserContextProvider>
      <AuthenticatedApp />
    </UserContextProvider>
  );
};
