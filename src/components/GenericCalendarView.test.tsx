import { render, screen, fireEvent } from "@testing-library/react";
import { GenericCalendarView, CalendarItem } from "./GenericCalendarView";

// Define a test item type
interface TestItem extends CalendarItem {
  content: string;
}

describe("GenericCalendarView", () => {
  // Sample test items
  const testItems: TestItem[] = [
    {
      id: 1,
      date: "2025-04-10",
      type: "test",
      content: "Test Item 1",
    },
    {
      id: 2,
      date: "2025-04-15",
      type: "test",
      content: "Test Item 2",
    },
    {
      id: 3,
      date: "2025-04-20",
      type: "test",
      content: "Test Item 3",
    },
  ];

  // Mock render functions
  const renderGridItem = jest.fn((item: TestItem) => (
    <div key={item.id} data-testid={`grid-item-${item.id}`}>
      {item.content}
    </div>
  ));

  const renderVerticalItem = jest.fn((item: TestItem) => (
    <div key={item.id} data-testid={`vertical-item-${item.id}`}>
      {item.content}
    </div>
  ));

  // Mock getItemsByDate function
  const getItemsByDate = jest.fn((items: TestItem[]) => {
    return items.reduce((acc, item) => {
      const dateStr = item.date;
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(item);
      return acc;
    }, {} as Record<string, TestItem[]>);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.innerWidth to simulate desktop view
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    // Mock window.addEventListener to capture resize event
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  it("renders in desktop mode with month view", () => {
    render(
      <GenericCalendarView
        items={testItems}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check that month view is displayed
    expect(screen.getByText(/April 2025/)).toBeInTheDocument();
    
    // Check that day names are displayed
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();

    // Check that getItemsByDate was called with the items
    expect(getItemsByDate).toHaveBeenCalledWith(testItems);
  });

  it("renders items on the correct dates", () => {
    render(
      <GenericCalendarView
        items={testItems}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check that renderGridItem was called for each item
    expect(renderGridItem).toHaveBeenCalledTimes(3);
    
    // Check that the items were rendered with the correct data
    expect(renderGridItem).toHaveBeenCalledWith(testItems[0], "2025-04-10");
    expect(renderGridItem).toHaveBeenCalledWith(testItems[1], "2025-04-15");
    expect(renderGridItem).toHaveBeenCalledWith(testItems[2], "2025-04-20");
  });

  it("changes month when navigation buttons are clicked", () => {
    render(
      <GenericCalendarView
        items={testItems}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check initial month
    expect(screen.getByText(/April 2025/)).toBeInTheDocument();

    // Click previous month button
    const prevButton = screen.getByLabelText("Previous month");
    fireEvent.click(prevButton);

    // Check that month changed to March
    expect(screen.getByText(/March 2025/)).toBeInTheDocument();

    // Click next month button twice to go to May
    const nextButton = screen.getByLabelText("Next month");
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Check that month changed to May
    expect(screen.getByText(/May 2025/)).toBeInTheDocument();
  });

  it("goes to today when Today button is clicked", () => {
    // Mock Date.now to return a specific date
    const originalNow = Date.now;
    Date.now = jest.fn(() => new Date("2025-04-13").getTime());

    render(
      <GenericCalendarView
        items={testItems}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Navigate to a different month
    const prevButton = screen.getByLabelText("Previous month");
    fireEvent.click(prevButton);
    expect(screen.getByText(/March 2025/)).toBeInTheDocument();

    // Click Today button
    const todayButton = screen.getByLabelText("Go to today");
    fireEvent.click(todayButton);

    // Check that month changed back to April
    expect(screen.getByText(/April 2025/)).toBeInTheDocument();

    // Restore original Date.now
    Date.now = originalNow;
  });

  it("switches to mobile view when window width is small", () => {
    // Render with desktop width first
    const { rerender } = render(
      <GenericCalendarView
        items={testItems}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check that month view is displayed
    expect(screen.getByText(/April 2025/)).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();

    // Simulate resize to mobile width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 600,
    });

    // Trigger resize event callback
    const resizeCallback = (window.addEventListener as jest.Mock).mock.calls.find(
      (call) => call[0] === "resize"
    )[1];
    resizeCallback();

    // Re-render to apply the state change
    rerender(
      <GenericCalendarView
        items={testItems}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check that week view is displayed
    expect(screen.getByText(/April \d+ - April \d+, 2025/)).toBeInTheDocument();
    expect(screen.getByText("Sunday")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Tuesday")).toBeInTheDocument();
    expect(screen.getByText("Wednesday")).toBeInTheDocument();
    expect(screen.getByText("Thursday")).toBeInTheDocument();
    expect(screen.getByText("Friday")).toBeInTheDocument();
    expect(screen.getByText("Saturday")).toBeInTheDocument();

    // Check that renderVerticalItem is used in mobile view
    expect(renderVerticalItem).toHaveBeenCalled();
  });

  it("navigates weeks in mobile view", () => {
    // Set mobile width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 600,
    });

    render(
      <GenericCalendarView
        items={testItems}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check initial week
    const initialWeekTitle = screen.getByText(/April \d+ - April \d+, 2025/);
    const initialWeekText = initialWeekTitle.textContent || "";

    // Click previous week button
    const prevButton = screen.getByLabelText("Previous week");
    fireEvent.click(prevButton);

    // Check that week changed
    const newWeekTitle = screen.getByText(/April \d+ - April \d+, 2025/);
    expect(newWeekTitle.textContent).not.toBe(initialWeekText);

    // Click next week button three times to ensure we get a different week
    const nextButton = screen.getByLabelText("Next week");
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Check that week changed again
    const finalWeekTitle = screen.getByText(/\w+ \d+ - \w+ \d+, 2025/);
    expect(finalWeekTitle.textContent).not.toBe(initialWeekText);
  });

  it("displays empty state message when no items for a day", () => {
    render(
      <GenericCalendarView
        items={[]}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check that empty state message is displayed in mobile view
    // Simulate resize to mobile width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 600,
    });

    // Trigger resize event callback
    const resizeCallback = (window.addEventListener as jest.Mock).mock.calls.find(
      (call) => call[0] === "resize"
    )[1];
    resizeCallback();

    // Re-render to apply the state change
    render(
      <GenericCalendarView
        items={[]}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check that empty state message is displayed
    const emptyStateMessages = screen.getAllByText("No items");
    expect(emptyStateMessages.length).toBeGreaterThan(0);
  });

  it("cleans up event listeners on unmount", () => {
    const { unmount } = render(
      <GenericCalendarView
        items={testItems}
        renderGridItem={renderGridItem}
        renderVerticalItem={renderVerticalItem}
        getItemsByDate={getItemsByDate}
        emptyStateMessage="No items"
      />
    );

    // Check that addEventListener was called
    expect(window.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));

    // Unmount the component
    unmount();

    // Check that removeEventListener was called with the same function
    const addEventListenerCall = (window.addEventListener as jest.Mock).mock.calls.find(
      (call) => call[0] === "resize"
    );
    const removeEventListenerCall = (window.removeEventListener as jest.Mock).mock.calls.find(
      (call) => call[0] === "resize"
    );

    expect(removeEventListenerCall[0]).toBe("resize");
    expect(removeEventListenerCall[1]).toBe(addEventListenerCall[1]);
  });
});
