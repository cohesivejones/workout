import { render, screen } from "@testing-library/react";
import App from "./App";

it("renders workout tracker header", () => {
  render(<App />);
  const headerElement = screen.getByText(/workout tracker/i);
  expect(headerElement).toBeInTheDocument();
});
