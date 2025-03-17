import { Outlet, Link } from "react-router-dom";
import { UserContextProvider } from "./contexts/UserContextProvider";
import { useUserContext } from "./contexts/useUserContext";
import LoginPage from "./pages/LoginPage";
import "./App.css";

const Header = () => {
  return (
    <header className="App-header">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'white' }}>
        <img src="/dumbbell.svg" alt="Dumbbell" style={{ height: '30px', marginRight: '10px', filter: 'invert(1)' }} />
        <h1 style={{ margin: 0 }}>Workout Tracker</h1>
      </Link>
    </header>
  );
};

const AuthenticatedContent = () => {
  const { user } = useUserContext();

  if (!user) {
    return <LoginPage />;
  }

  return <Outlet />;
};

export const Layout = () => {
  return (
    <UserContextProvider>
      <div className="App">
        <Header />
        <main className="App-main">
          <AuthenticatedContent />
        </main>
      </div>
    </UserContextProvider>
  );
};
