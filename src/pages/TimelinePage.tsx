import type { ReactElement } from 'react';
import { useSearchParams } from 'wouter';
import CalendarView from '../components/CalendarView';
import classNames from 'classnames';
import styles from './TimelinePage.module.css';
import { ListView } from '../components/ListView';

function TimelinePage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get view mode from URL or default to "calendar"
  const viewMode = searchParams.get('view') === 'list' ? 'list' : 'calendar';

  return (
    <div>
      <div className={styles.pageHeader}>
        <h2>Activity Timeline</h2>
        <div className={styles.pageActions}>
          <div className={styles.viewToggle}>
            <button
              className={classNames({
                [styles.active]: viewMode === 'calendar',
              })}
              onClick={() => setSearchParams({ view: 'calendar' })}
            >
              Calendar
            </button>
            <button
              className={classNames({
                [styles.active]: viewMode === 'list',
              })}
              onClick={() => setSearchParams({ view: 'list' })}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? <CalendarView /> : <ListView />}
    </div>
  );
}

export default TimelinePage;
