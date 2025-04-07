import { Outlet, Link } from "react-router-dom";
import { UserContextProvider } from "./contexts/UserContextProvider";
import { useUserContext } from "./contexts/useUserContext";
import LoginPage from "./pages/LoginPage";
import styles from "./App.module.css";

const Header = () => {
  const { user, logout } = useUserContext();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className={styles.appHeader}>
      <div className={styles.headerLeft}>
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
      <nav className={styles.mainNav}>
        <Link to="/" className={styles.navLink}>
        Workouts
        </Link>
        <Link to="/exercises" className={styles.navLink}>
        Exercises
        </Link>
      </nav>
      </div>

      {user && (
      <div className={styles.userInfo}>
        <span>{user.name}</span>
        <Link to="/change-password" className={styles.changePasswordLink}>
        Change Password
        </Link>
        <button onClick={handleLogout} className={styles.logoutButton}>
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
      <div className={styles.app}>
        <Header />
        <main className={styles.appMain}>
          <AuthenticatedContent />
        </main>
      </div>
    </UserContextProvider>
  );
};
