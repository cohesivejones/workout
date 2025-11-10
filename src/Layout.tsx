import { Link } from 'wouter';
import { useState, useRef, useEffect } from 'react';
import { FaBars } from 'react-icons/fa'; // Hamburger icon
import { UserContextProvider } from './contexts/UserContextProvider';
import { useUserContext } from './contexts/useUserContext';
import LoginPage from './pages/LoginPage';
import styles from './App.module.css';

const Header = () => {
  const { user, logout } = useUserContext();
  const [aiDropdownOpen, setAIDropdownOpen] = useState(false);
  const aiDropdownRef = useRef<HTMLDivElement | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close AI and user dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(event.target as Node)) {
        setAIDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
  };

  const toggleAIDropdown = () => {
    setAIDropdownOpen((open) => !open);
  };
  const toggleUserDropdown = () => {
    setUserDropdownOpen((open) => !open);
  };

  return (
    <header className={styles.appHeader}>
      <div className={styles.headerLeft}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'white',
          }}
        >
          <img
            src="/dumbbell.svg"
            alt="Dumbbell"
            style={{ height: '30px', marginRight: '10px', filter: 'invert(1)' }}
          />
          <h1 style={{ margin: 0 }}>Workout Tracker</h1>
        </Link>
        {user && (
          <nav className={styles.mainNav}>
            <Link to="/" className={styles.navLink}>
              Timeline
            </Link>
            <Link to="/dashboard" className={styles.navLink}>
              Dashboard
            </Link>
            <Link to="/exercises" className={styles.navLink}>
              Exercises
            </Link>
            <div
              className={`${styles.navDropdown} ${aiDropdownOpen ? styles.open : ''}`}
              ref={aiDropdownRef}
            >
              <button
                className={styles.navLink}
                type="button"
                aria-haspopup="true"
                aria-expanded={aiDropdownOpen}
                onClick={toggleAIDropdown}
              >
                AI
              </button>
              <div className={styles.dropdownMenu}>
                <Link
                  to="/workouts/generate"
                  className={styles.dropdownMenuItem}
                  onClick={() => setAIDropdownOpen(false)}
                >
                  Generate Workout
                </Link>
                <Link
                  to="/diagnostician"
                  className={styles.dropdownMenuItem}
                  onClick={() => setAIDropdownOpen(false)}
                >
                  Diagnostician
                </Link>
              </div>
            </div>
          </nav>
        )}
      </div>

      {user && (
        <div className={styles.userDropdown} ref={userDropdownRef}>
          <button className={styles.dropdownToggle} onClick={toggleUserDropdown}>
            <span>{user.name}</span>
            <FaBars className={styles.hamburgerIcon} />
          </button>

          {userDropdownOpen && (
            <div className={styles.dropdownMenu}>
              <Link
                to="/change-password"
                className={styles.dropdownItem}
                onClick={() => setUserDropdownOpen(false)}
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

const AuthenticatedContent = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserContext();

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserContextProvider>
      <div className={styles.app}>
        <Header />
        <main className={styles.appMain}>
          <AuthenticatedContent>{children}</AuthenticatedContent>
        </main>
      </div>
    </UserContextProvider>
  );
};
