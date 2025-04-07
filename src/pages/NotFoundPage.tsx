import React from "react";
import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";
import { toHomePath } from "../utils/paths";

const NotFoundPage: React.FC = () => {
  return (
    <div className={styles.notFoundContainer}>
      <h2>404 - Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link to={toHomePath()} className={styles.homeLink}>
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
