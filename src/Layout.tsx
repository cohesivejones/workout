import { Link } from 'wouter';
import { useState, useRef, useEffect } from 'react';
import { FaUser } from 'react-icons/fa'; // User icon
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // Close mobile menu on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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
          <div className={styles.mobileActions}>
            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
              className={styles.mobileNavToggle}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              Menu
            </button>
            <div
              className={`${styles.userDropdown} ${userDropdownOpen ? styles.open : ''}`}
              ref={userDropdownRef}
            >
              <button className={styles.navLink} onClick={toggleUserDropdown} type="button">
                <FaUser />
              </button>

              {userDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <Link
                    to="/change-password"
                    className={styles.dropdownMenuItem}
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    Change Password
                  </Link>
                  <Link to="/" className={styles.dropdownMenuItem} onClick={handleLogout}>
                    Logout
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
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
                  to="/workout-coach"
                  className={styles.dropdownMenuItem}
                  onClick={() => setAIDropdownOpen(false)}
                >
                  Workout Coach
                </Link>
                <Link
                  to="/workout-insights"
                  className={styles.dropdownMenuItem}
                  onClick={() => setAIDropdownOpen(false)}
                >
                  Workout Insights
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
        <div
          className={`${styles.userDropdown} ${styles.desktopOnly} ${userDropdownOpen ? styles.open : ''}`}
          ref={userDropdownRef}
        >
          <button
            data-testid="user-dropdown-button"
            className={styles.navLink}
            onClick={toggleUserDropdown}
            type="button"
          >
            <FaUser />
          </button>

          {userDropdownOpen && (
            <div className={styles.dropdownMenu}>
              <Link
                to="/change-password"
                className={styles.dropdownMenuItem}
                onClick={() => setUserDropdownOpen(false)}
              >
                Change Password
              </Link>
              <Link to="/" className={styles.dropdownMenuItem} onClick={handleLogout}>
                Logout
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Mobile navigation panel */}
      {mobileNavOpen && user && (
        <>
          <div
            className={styles.mobileMenuBackdrop}
            onClick={() => setMobileNavOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setMobileNavOpen(false);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <div className={styles.mobileMenuPanel} role="dialog" aria-modal="true">
            <div className={styles.mobileMenuHeader}>
              <h3 className={styles.mobileMenuTitle}>Menu</h3>
              <button className={styles.mobileCloseButton} onClick={() => setMobileNavOpen(false)}>
                Close
              </button>
            </div>
            <div className={styles.mobileMenuLinks}>
              <Link
                to="/"
                className={styles.mobileMenuLink}
                onClick={() => setMobileNavOpen(false)}
              >
                Timeline
              </Link>
              <Link
                to="/dashboard"
                className={styles.mobileMenuLink}
                onClick={() => setMobileNavOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/exercises"
                className={styles.mobileMenuLink}
                onClick={() => setMobileNavOpen(false)}
              >
                Exercises
              </Link>
              <div className={styles.mobileMenuSection}>
                <div className={styles.mobileMenuSectionTitle}>AI</div>
                <Link
                  to="/workout-coach"
                  className={styles.mobileMenuLink}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Workout Coach
                </Link>
                <Link
                  to="/workout-insights"
                  className={styles.mobileMenuLink}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Workout Insights
                </Link>
                <Link
                  to="/diagnostician"
                  className={styles.mobileMenuLink}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Diagnostician
                </Link>
              </div>
            </div>
          </div>
        </>
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
