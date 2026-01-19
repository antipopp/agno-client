/**
 * Chart Renderer for Generative UI
 *
 * Renders charts based on specifications from the agent.
 * Uses Recharts and shadcn/ui chart components.
 */

import { useRef, type ReactNode } from 'react';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, Image as ImageIcon, MoreVertical } from 'lucide-react';
import type { ChartComponentSpec } from '@antipopp/agno-react';

/**
 * Default colors for charts
 */
const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

/**
 * Generate chart config for ChartContainer
 */
function generateChartConfig(series: any[] = [], _type: string = 'bar') {
  const config: Record<string, any> = {};
  series.forEach((item, index) => {
    config[item.key] = {
      label: item.label || item.key,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
  });
  return config;
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_\-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Convert data array to CSV string
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => allKeys.add(key));
  });
  const headers = Array.from(allKeys);

  // Create CSV header row
  const csvHeaders = headers.map((header) => `"${header}"`).join(',');

  // Create CSV data rows
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '""';
        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Export data to CSV file
 */
function exportToCSV(data: any[], filename: string) {
  try {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const sanitizedFilename = sanitizeFilename(filename);
    link.setAttribute('href', url);
    link.setAttribute('download', `${sanitizedFilename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export CSV:', error);
  }
}

/**
 * Export chart as PNG image
 */
async function exportToImage(element: HTMLElement, filename: string) {
  try {
    // Hide the menu button before capturing
    const menuButton = element.querySelector('[data-chart-menu]') as HTMLElement;
    const originalDisplay = menuButton?.style.display;
    if (menuButton) {
      menuButton.style.display = 'none';
    }

    // Capture the chart
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
    });

    // Restore menu button visibility
    if (menuButton && originalDisplay !== undefined) {
      menuButton.style.display = originalDisplay;
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const sanitizedFilename = sanitizeFilename(filename);
      link.setAttribute('href', url);
      link.setAttribute('download', `${sanitizedFilename}.png`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  } catch (error) {
    console.error('Failed to export image:', error);
  }
}

/**
 * Chart wrapper with export menu
 */
function ChartWithMenu({
  children,
  data,
  chartTitle = 'chart',
}: {
  children: ReactNode;
  data: any[];
  chartTitle?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownloadCSV = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportToCSV(data, `${chartTitle}_${timestamp}`);
  };

  const handleSaveImage = async () => {
    if (chartRef.current) {
      const timestamp = new Date().toISOString().split('T')[0];
      await exportToImage(chartRef.current, `${chartTitle}_${timestamp}`);
    }
  };

  return (
    <div ref={chartRef} className="relative">
      {/* Export Menu - Top Right */}
      <div
        className="absolute top-2 right-2 z-10"
        data-chart-menu
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
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
export function BarChartRenderer(props: ChartComponentSpec['props']) {
  const { data, xKey, bars = [], showLegend = true, showGrid = true, height = 350, title } = props;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] border rounded-md bg-muted/10">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const config = generateChartConfig(bars, 'bar');

  return (
    <ChartWithMenu data={data} chartTitle={title || 'bar_chart'}>
      <ChartContainer config={config} className="h-[350px]">
        <BarChart data={data} height={height as number}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={bar.color || `var(--color-${bar.key})`}
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
export function LineChartRenderer(props: ChartComponentSpec['props']) {
  const { data, xKey, lines = [], showLegend = true, showGrid = true, height = 350, title } = props;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] border rounded-md bg-muted/10">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const config = generateChartConfig(lines, 'line');

  return (
    <ChartWithMenu data={data} chartTitle={title || 'line_chart'}>
      <ChartContainer config={config} className="h-[350px]">
        <LineChart data={data} height={height as number}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color || `var(--color-${line.key})`}
              strokeWidth={2}
              dot={{ r: 4 }}
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
export function AreaChartRenderer(props: ChartComponentSpec['props']) {
  const { data, xKey, areas = [], showLegend = true, showGrid = true, height = 350, title } = props;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] border rounded-md bg-muted/10">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const config = generateChartConfig(areas, 'area');

  return (
    <ChartWithMenu data={data} chartTitle={title || 'area_chart'}>
      <ChartContainer config={config} className="h-[350px]">
        <AreaChart data={data} height={height as number}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
          {areas.map((area) => (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              stroke={area.color || `var(--color-${area.key})`}
              fill={area.color || `var(--color-${area.key})`}
              fillOpacity={0.6}
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
export function PieChartRenderer(props: ChartComponentSpec['props']) {
  const { data, pie, showLegend = true, height = 350, title } = props;

  if (!data || data.length === 0 || !pie) {
    return (
      <div className="flex items-center justify-center h-[350px] border rounded-md bg-muted/10">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const config = generateChartConfig(
    data.map((item) => ({
      key: item[pie.nameKey || 'name'],
      label: item[pie.nameKey || 'name'],
    })),
    'pie'
  );

  return (
    <ChartWithMenu data={data} chartTitle={title || 'pie_chart'}>
      <ChartContainer config={config} className="h-[350px]">
        <PieChart height={height as number}>
          <Pie
            data={data}
            dataKey={pie.dataKey}
            nameKey={pie.nameKey || 'name'}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={pie.label}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
        </PieChart>
      </ChartContainer>
    </ChartWithMenu>
  );
}
