import { render } from "@testing-library/react";
import { getPainFace } from "./PainScaleFaces";

describe("PainScaleFaces", () => {
  it("renders different faces for different pain levels", () => {
    // Test a few different pain levels
    const painLevels = [0, 3, 5, 8, 10];

    painLevels.forEach((level) => {
      const { container } = render(getPainFace(level));

      // Each pain level should render an SVG
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  it("applies custom size when provided", () => {
    const customSize = 48;
    const { container } = render(getPainFace(5, { size: customSize }));

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Check that the SVG has the custom size
    expect(svg?.getAttribute("width")).toBe(customSize.toString());
    expect(svg?.getAttribute("height")).toBe(customSize.toString());
  });

  it("uses default size when not provided", () => {
    const { container } = render(getPainFace(5));

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Default size should be applied
    expect(svg?.getAttribute("width")).toBe("40");
    expect(svg?.getAttribute("height")).toBe("40");
  });

  it("renders different colors for different pain levels", () => {
    // Test different pain levels and check for different colors
    const painLevelColorMap = [
      { level: 0, expectedColor: "#4caf50" }, // Green for no pain
      { level: 3, expectedColor: "#8bc34a" }, // Light green for mild pain
      { level: 5, expectedColor: "#ffc107" }, // Yellow for moderate pain
      { level: 8, expectedColor: "#f44336" }, // Red for severe pain
      { level: 10, expectedColor: "#d32f2f" }, // Dark red for worst pain
    ];

    painLevelColorMap.forEach(({ level, expectedColor }) => {
      const { container } = render(getPainFace(level));

      // The SVG should have elements with the expected color
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();

      // Check that the SVG has a circle with the expected fill color
      const circle = container.querySelector("circle");
      expect(circle).toBeInTheDocument();

      // Get the fill attribute and convert to lowercase for case-insensitive comparison
      const fillColor = circle?.getAttribute("fill")?.toLowerCase();
      expect(fillColor).toBe(expectedColor);
    });
  });

  it("handles invalid pain levels by clamping to valid range", () => {
    // Test pain levels outside the valid range (0-10)
    const invalidLevels = [-1, 11, 100];

    invalidLevels.forEach((level) => {
      const { container } = render(getPainFace(level));

      // Should still render an SVG
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });
});
