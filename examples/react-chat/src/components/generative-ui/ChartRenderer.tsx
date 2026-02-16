/**
 * Chart Renderer for Generative UI
 *
 * Renders charts based on specifications from the agent.
 * Uses Recharts and shadcn/ui chart components.
 */

import type { ChartComponentSpec } from "@antipopp/agno-react";
import html2canvas from "html2canvas";
import { Download, Image as ImageIcon, MoreVertical } from "lucide-react";
import { type ReactNode, useRef } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Default colors for charts
 */
const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface ChartDataRow {
  [key: string]: unknown;
}

interface SeriesItem {
  key: string;
  label?: string;
  color?: string;
}

/**
 * Generate chart config for ChartContainer
 */
function generateChartConfig(series: SeriesItem[] = []) {
  const config: Record<string, { label: string; color: string }> = {};
  for (const [index, item] of series.entries()) {
    config[item.key] = {
      label: item.label || item.key,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
  }
  return config;
}

function getColorForKey(key: string): string {
  let hash = 0;
  for (const character of key) {
    hash += character.charCodeAt(0);
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_-]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

/**
 * Convert data array to CSV string
 */
function convertToCSV(data: ChartDataRow[]): string {
  if (!data || data.length === 0) {
    return "";
  }

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) {
      allKeys.add(key);
    }
  }
  const headers = Array.from(allKeys);

  // Create CSV header row
  const csvHeaders = headers.map((header) => `"${header}"`).join(",");

  // Create CSV data rows
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '""';
        }
        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
}

/**
 * Export data to CSV file
 */
function exportToCSV(data: ChartDataRow[], filename: string) {
  try {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const sanitizedFilename = sanitizeFilename(filename);
    link.setAttribute("href", url);
    link.setAttribute("download", `${sanitizedFilename}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export CSV:", error);
  }
}

/**
 * Export chart as PNG image
 */
async function exportToImage(element: HTMLElement, filename: string) {
  try {
    // Hide the menu button before capturing
    const menuButton = element.querySelector(
      "[data-chart-menu]"
    ) as HTMLElement;
    const originalDisplay = menuButton?.style.display;
    if (menuButton) {
      menuButton.style.display = "none";
    }

    // Capture the chart
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2, // Higher quality
      logging: false,
    });

    // Restore menu button visibility
    if (menuButton && originalDisplay !== undefined) {
      menuButton.style.display = originalDisplay;
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const sanitizedFilename = sanitizeFilename(filename);
      link.setAttribute("href", url);
      link.setAttribute("download", `${sanitizedFilename}.png`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  } catch (error) {
    console.error("Failed to export image:", error);
  }
}

/**
 * Chart wrapper with export menu
 */
function ChartWithMenu({
  children,
  data,
  chartTitle = "chart",
}: {
  children: ReactNode;
  data: ChartDataRow[];
  chartTitle?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownloadCSV = () => {
    const timestamp = new Date().toISOString().split("T")[0];
    exportToCSV(data, `${chartTitle}_${timestamp}`);
  };

  const handleSaveImage = async () => {
    if (chartRef.current) {
      const timestamp = new Date().toISOString().split("T")[0];
      await exportToImage(chartRef.current, `${chartTitle}_${timestamp}`);
    }
  };

  return (
    <div className="relative" ref={chartRef}>
      {/* Export Menu - Top Right */}
      <div className="absolute top-2 right-2 z-10" data-chart-menu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8" size="icon" variant="outline">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadCSV}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveImage}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Save as Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Chart Content */}
      {children}
    </div>
  );
}

/**
 * Bar Chart Renderer
 */
export function BarChartRenderer(props: ChartComponentSpec["props"]) {
  const {
    data,
    xKey,
    bars = [],
    showLegend = true,
    showGrid = true,
    height = 350,
    title,
  } = props;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-md border bg-muted/10">
        <p className="text-muted-foreground text-sm">No data available</p>
      </div>
    );
  }

  const config = generateChartConfig(bars);
  const chartTitle = typeof title === "string" ? title : "bar_chart";

  return (
    <ChartWithMenu chartTitle={chartTitle} data={data}>
      <ChartContainer className="h-[350px]" config={config}>
        <BarChart data={data} height={height as number}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
          {bars.map((bar) => (
            <Bar
              dataKey={bar.key}
              fill={bar.color || `var(--color-${bar.key})`}
              key={bar.key}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartWithMenu>
  );
}

/**
 * Line Chart Renderer
 */
export function LineChartRenderer(props: ChartComponentSpec["props"]) {
  const {
    data,
    xKey,
    lines = [],
    showLegend = true,
    showGrid = true,
    height = 350,
    title,
  } = props;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-md border bg-muted/10">
        <p className="text-muted-foreground text-sm">No data available</p>
      </div>
    );
  }

  const config = generateChartConfig(lines);
  const chartTitle = typeof title === "string" ? title : "line_chart";

  return (
    <ChartWithMenu chartTitle={chartTitle} data={data}>
      <ChartContainer className="h-[350px]" config={config}>
        <LineChart data={data} height={height as number}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
          {lines.map((line) => (
            <Line
              dataKey={line.key}
              dot={{ r: 4 }}
              key={line.key}
              stroke={line.color || `var(--color-${line.key})`}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ChartContainer>
    </ChartWithMenu>
  );
}

/**
 * Area Chart Renderer
 */
export function AreaChartRenderer(props: ChartComponentSpec["props"]) {
  const {
    data,
    xKey,
    areas = [],
    showLegend = true,
    showGrid = true,
    height = 350,
    title,
  } = props;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-md border bg-muted/10">
        <p className="text-muted-foreground text-sm">No data available</p>
      </div>
    );
  }

  const config = generateChartConfig(areas);
  const chartTitle = typeof title === "string" ? title : "area_chart";

  return (
    <ChartWithMenu chartTitle={chartTitle} data={data}>
      <ChartContainer className="h-[350px]" config={config}>
        <AreaChart data={data} height={height as number}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
          {areas.map((area) => (
            <Area
              dataKey={area.key}
              fill={area.color || `var(--color-${area.key})`}
              fillOpacity={0.6}
              key={area.key}
              stroke={area.color || `var(--color-${area.key})`}
              type="monotone"
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </ChartWithMenu>
  );
}

/**
 * Pie Chart Renderer
 */
export function PieChartRenderer(props: ChartComponentSpec["props"]) {
  const { data, pie, showLegend = true, height = 350, title } = props;

  if (!data || data.length === 0 || !pie) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-md border bg-muted/10">
        <p className="text-muted-foreground text-sm">No data available</p>
      </div>
    );
  }

  const config = generateChartConfig(
    data.map((item) => ({
      key: String(item[pie.nameKey || "name"] ?? "segment"),
      label: String(item[pie.nameKey || "name"] ?? "segment"),
    }))
  );
  const chartTitle = typeof title === "string" ? title : "pie_chart";

  return (
    <ChartWithMenu chartTitle={chartTitle} data={data}>
      <ChartContainer className="h-[350px]" config={config}>
        <PieChart height={height as number}>
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey={pie.dataKey}
            label={pie.label}
            nameKey={pie.nameKey || "name"}
            outerRadius={100}
          >
            {data.map((entry) => {
              const segmentKey = String(
                entry[pie.nameKey || "name"] ?? entry[pie.dataKey] ?? "segment"
              );

              return (
                <Cell
                  fill={getColorForKey(segmentKey)}
                  key={`cell-${segmentKey}`}
                />
              );
            })}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
        </PieChart>
      </ChartContainer>
    </ChartWithMenu>
  );
}
