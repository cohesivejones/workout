import { useState, useEffect, ReactNode } from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import styles from "./GenericCalendarView.module.css";
import classNames from "classnames";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";

// Generic interface for calendar items
export interface CalendarItem {
  id: number;
  date: string; // ISO format date string
  type: string; // Identifier for the type of item
}

// Props for the generic calendar component
export interface GenericCalendarViewProps<T extends CalendarItem> {
  items: T[];
  renderGridItem: (item: T, dateStr: string) => ReactNode;
  renderVerticalItem: (item: T, dateStr: string) => ReactNode;
  getItemsByDate: (items: T[]) => Record<string, T[]>;
  emptyStateMessage?: string;
  // For testing purposes only
  initialMobileView?: boolean;
}

// Generic calendar component
export function GenericCalendarView<T extends CalendarItem>({
  items,
  renderGridItem,
  renderVerticalItem,
  getItemsByDate,
  emptyStateMessage = "No items",
  initialMobileView = false,
}: GenericCalendarViewProps<T>) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [isMobileView, setIsMobileView] = useState<boolean>(initialMobileView);

  // Check screen size on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    // Initial check
    checkScreenSize();

    // Add resize listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  // Group items by date
  const itemsByDate = getItemsByDate(items);

  const renderMonthHeader = () => {
    return (
      <div className={styles.calendarHeader}>
        <div className={styles.navButtons}>
          <button
            className={styles.navButton}
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Previous month"
          >
            <MdChevronLeft />
          </button>
          <button
            className={styles.todayButton}
            onClick={() => setCurrentMonth(new Date())}
            aria-label="Go to today"
          >
            Today
          </button>
          <button
            className={styles.navButton}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Next month"
          >
            <MdChevronRight />
          </button>
        </div>
        <h2 className={styles.monthTitle}>{format(currentMonth, "MMMM yyyy")}</h2>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className={styles.calendarDays}>
        {days.map((day) => (
          <div className={styles.calendarDayName} key={day}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderWeekHeader = () => {
    return (
      <div className={styles.calendarHeader}>
        <div className={styles.navButtons}>
          <button
            className={styles.navButton}
            onClick={() => {
              const prevWeek = new Date(currentWeek);
              prevWeek.setDate(prevWeek.getDate() - 7);
              setCurrentWeek(prevWeek);
            }}
            aria-label="Previous week"
          >
            <MdChevronLeft />
          </button>
          <button
            className={styles.todayButton}
            onClick={() => setCurrentWeek(new Date())}
            aria-label="Go to today"
          >
            Today
          </button>
          <button
            className={styles.navButton}
            onClick={() => {
              const nextWeek = new Date(currentWeek);
              nextWeek.setDate(nextWeek.getDate() + 7);
              setCurrentWeek(nextWeek);
            }}
            aria-label="Next week"
          >
            <MdChevronRight />
          </button>
        </div>
        <h2 className={styles.monthTitle}>
          {format(currentWeek, "MMMM d")} -{" "}
          {format(new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000), "MMMM d, yyyy")}
        </h2>
      </div>
    );
  };

  const renderGridCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const dateStr = format(day, "yyyy-MM-dd");
        const dayItems = itemsByDate[dateStr] || [];

        days.push(
          <div
            key={day.toString()}
            className={classNames(styles.calendarCell, {
              [styles.disabled]: !isSameMonth(day, monthStart),
              [styles.today]: isToday(day),
            })}
          >
            <div className={styles.calendarDate}>{formattedDate}</div>

            <div className={styles.calendarItems}>
              {dayItems.length > 0 ? (
                dayItems.map((item) => renderGridItem(item, dateStr))
              ) : (
                <div className={styles.noItems}></div>
              )}
            </div>
          </div>
        );
        day = new Date(day.getTime() + 24 * 60 * 60 * 1000); // Add one day
      }
      rows.push(
        <div className={styles.calendarRow} key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className={styles.calendarBody}>{rows}</div>;
  };

  const renderVerticalDays = () => {
    // Start from the beginning of the current week
    const startDate = startOfWeek(currentWeek);
    const days = [];

    // Generate 7 days (a full week)
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = format(day, "yyyy-MM-dd");
      const dayItems = itemsByDate[dateStr] || [];

      days.push(
        <div
          key={dateStr}
          className={classNames(styles.verticalDay, {
            [styles.today]: isToday(day),
          })}
        >
          <div className={styles.verticalDayHeader}>
            <div className={styles.verticalDayName}>{format(day, "EEEE")}</div>
            <div className={styles.verticalDayDate}>{format(day, "MMMM d, yyyy")}</div>
          </div>

          <div className={styles.verticalItems}>
            {dayItems.length > 0 ? (
              dayItems.map((item) => renderVerticalItem(item, dateStr))
            ) : (
              <div className={styles.noItems}>{emptyStateMessage}</div>
            )}
          </div>
        </div>
      );
    }

    return <div className={styles.verticalDaysList}>{days}</div>;
  };

  return (
    <div className={styles.calendar}>
      {isMobileView ? (
        <>
          {renderWeekHeader()}
          {renderVerticalDays()}
        </>
      ) : (
        <>
          {renderMonthHeader()}
          {renderDays()}
          {renderGridCells()}
        </>
      )}
    </div>
  );
}
