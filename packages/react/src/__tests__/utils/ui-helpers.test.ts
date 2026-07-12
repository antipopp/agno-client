import { describe, expect, it } from "vitest";
import { createSmartChart } from "../../utils/ui-helpers";

describe("createSmartChart", () => {
  it("should choose a line chart for date-like x keys", () => {
    const chart = createSmartChart([
      { date: "2026-01-01", revenue: 10, cost: 4 },
      { date: "2026-01-02", revenue: 12, cost: 5 },
    ]);

    expect(chart.component).toBe("LineChart");
    expect(chart.props.xKey).toBe("date");
    expect(chart.props.lines).toEqual([
      { key: "revenue", label: "revenue" },
      { key: "cost", label: "cost" },
    ]);
  });
});
