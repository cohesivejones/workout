import { Outlet, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { FaBars } from "react-icons/fa"; // Hamburger icon
import { UserContextProvider } from "./contexts/UserContextProvider";
import { useUserContext } from "./contexts/useUserContext";
import LoginPage from "./pages/LoginPage";
import styles from "./App.module.css";

const Header = () => {
  const { user, logout } = useUserContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
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
            Timeline
          </Link>
          <Link to="/exercises" className={styles.navLink}>
            Exercises
          </Link>
        </nav>
      </div>

      {user && (
        <div className={styles.userDropdown} ref={dropdownRef}>
          <button className={styles.dropdownToggle} onClick={toggleDropdown}>
            <span>{user.name}</span>
            <FaBars className={styles.hamburgerIcon} />
          </button>

          {dropdownOpen && (
            <div className={styles.dropdownMenu}>
              <Link
                to="/change-password"
                className={styles.dropdownItem}
                onClick={() => setDropdownOpen(false)}
              >
                Change Password
              </Link>
              <button onClick={handleLogout} className={styles.dropdownItem}>
                Logout
              </button>
            </div>
          )}
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
