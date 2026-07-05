import React from 'react';
import { FaDumbbell } from 'react-icons/fa';
import styles from './NotFoundPage.module.css';
import { Button } from '../components/ui/Button';
import { toHomePath } from '../utils/paths';

const NotFoundPage: React.FC = () => {
  return (
    <div className={styles.notFoundContainer}>
      <div className={styles.iconBadge}>
        <FaDumbbell aria-hidden="true" />
      </div>
      <div className={styles.code}>404</div>
      <h2 className={styles.title}>Page not found</h2>
      <p className={styles.message}>
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Button to={toHomePath()} variant="primary" size="lg">
        Back to Timeline
      </Button>
    </div>
  );
};

export default NotFoundPage;
