import React from "react";
import { Link } from "react-router-dom";
import "./NotFoundPage.css";
import { toHomePath } from "../utils/paths";

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-container">
      <h2>404 - Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link to={toHomePath()} className="home-link">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
