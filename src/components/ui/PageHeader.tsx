import React from 'react';
import classNames from 'classnames';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned controls (view toggles, buttons). */
  actions?: React.ReactNode;
  /** 'center' stacks and centers the title/subtitle (used by the chart pages). */
  align?: 'start' | 'center';
  className?: string;
}

/**
 * Consistent page heading: title + optional subtitle, with an optional
 * actions slot. Replaces the per-page `.pageHeader` markup.
 */
export const PageHeader = ({
  title,
  subtitle,
  actions,
  align = 'start',
  className,
}: PageHeaderProps) => (
  <div
    className={classNames(
      styles.header,
      { [styles.center]: align === 'center', [styles.withActions]: !!actions },
      className
    )}
  >
    <div className={styles.titleBlock}>
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>
);

export default PageHeader;
