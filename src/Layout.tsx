import { Outlet, Link } from "react-router-dom";
import { UserContextProvider } from "./contexts/UserContextProvider";
import { useUserContext } from "./contexts/useUserContext";
import LoginPage from "./pages/LoginPage";
import "./App.css";

const Header = () => {
  const { user, logout } = useUserContext();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="App-header">
      <div className="header-left">
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            color: "white",
          }}
        >
          <img
            src="/dumbbell.svg"
            alt="Dumbbell"
            style={{ height: "30px", marginRight: "10px", filter: "invert(1)" }}
          />
          <h1 style={{ margin: 0 }}>Workout Tracker</h1>
        </Link>
        <nav className="main-nav">
          <Link to="/" className="nav-link">
            Workouts
          </Link>
          <Link to="/exercises" className="nav-link">
            Exercises
          </Link>
        </nav>
      </div>

      {user && (
        <div className="user-info">
          <span>{user.name}</span>
          <Link to="/change-password" className="change-password-link">
            Change Password
          </Link>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      )}
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
