import {
  createToolArgsValidatorFromSafeParse,
  createValidatedToolHandler,
  type ToolHandler,
  useAgnoToolExecution,
} from "@antipopp/agno-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, type UseFormReturn, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  description: z.string().optional(),
  category: z.enum(["financial", "sales", "marketing", "customer", "product"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type FormValues = z.infer<typeof formSchema>;

const REPORT_CATEGORIES = [
  "financial",
  "sales",
  "marketing",
  "customer",
  "product",
] as const;

const fillReportFormArgsSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(REPORT_CATEGORIES).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type FillReportFormArgs = z.infer<typeof fillReportFormArgsSchema>;

const fillReportFormArgsValidator = createToolArgsValidatorFromSafeParse(
  (args) => fillReportFormArgsSchema.safeParse(args),
  {
    getErrorMessage: () => "Invalid fill_report_form arguments",
  }
);

function applyToolArgsToForm(
  form: UseFormReturn<FormValues>,
  args: FillReportFormArgs
): string[] {
  const filledFields: string[] = [];

  if (typeof args.name === "string") {
    form.setValue("name", args.name);
    filledFields.push("name");
  }

  if (typeof args.description === "string") {
    form.setValue("description", args.description);
    filledFields.push("description");
  }

  if (typeof args.start_date === "string") {
    form.setValue("startDate", args.start_date);
    filledFields.push("start_date");
  }

  if (typeof args.end_date === "string") {
    form.setValue("endDate", args.end_date);
    filledFields.push("end_date");
  }

  if (args.category) {
    form.setValue("category", args.category);
    filledFields.push("category");
  }

  return filledFields;
}

export function NewReport() {
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: undefined,
      startDate: "",
      endDate: "",
    },
  });

  // Check for pending report data from sessionStorage (set by global handler)
  useEffect(() => {
    const pendingData = sessionStorage.getItem("pendingReportData");
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData);

        // Clear immediately to prevent double application in Strict Mode
        sessionStorage.removeItem("pendingReportData");

        // Apply data to form using react-hook-form's reset method
        form.reset({
          name: data.name || "",
          description: data.description || "",
          category: data.category || undefined,
          startDate: data.start_date || "",
          endDate: data.end_date || "",
        });
      } catch (error) {
        console.error("Failed to apply pending report data:", error);
      }
    }
  }, [form]);

  // Define tool handler for filling the form (overrides global handler when on this page)
  const toolHandlers = useMemo(
    () =>
      ({
        fill_report_form: createValidatedToolHandler(
          fillReportFormArgsValidator,
          (args) => {
            try {
              const filledFields = applyToolArgsToForm(form, args);

              return {
                success: true,
                message: "Form filled successfully",
                filled_fields: filledFields,
              };
            } catch (error) {
              return {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to fill form",
              };
            }
          }
        ),
      }) satisfies Record<string, ToolHandler>,
    [form]
  );

  // Use tool execution hook with auto-execution enabled
  const { isPaused, isExecuting, pendingTools } = useAgnoToolExecution(
    toolHandlers,
    true
  );

  const onSubmit = (_data: FormValues) => {
    navigate("/reports");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-bold text-3xl tracking-tight">New Report</h2>
        <p className="text-muted-foreground">
          Create a new report with AI assistance
        </p>
      </div>

      {/* AI Tool Execution Status */}
      {(isPaused || isExecuting) && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {isExecuting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">AI is filling the form</p>
                    <p className="text-muted-foreground text-sm">
                      Processing {pendingTools.length} tool
                      {pendingTools.length === 1 ? "" : "s"}...
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">AI Assistant Ready</p>
                    <p className="text-muted-foreground text-sm">
                      Preparing to help with your report...
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Details</CardTitle>
          <Badge className="gap-1" variant="outline">
            <Sparkles className="h-3 w-3" />
            AI Assisted
          </Badge>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Name Field */}
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Report Name</Label>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder="Enter report name"
                  />
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />

            {/* Description Field */}
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Description</Label>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    id={field.name}
                    placeholder="Brief description of the report"
                  />
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />

            {/* Category Field */}
            <Controller
              control={form.control}
              name="category"
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Category</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-invalid={fieldState.invalid}
                      id={field.name}
                    >
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          className="w-full justify-start text-left font-normal"
                          variant="outline"
                        >
                          <CalendarIcon />
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Start date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          onSelect={(date) =>
                            date && field.onChange(date.toDateString())
                          }
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* End Date */}
              <Controller
                control={form.control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          className="w-full justify-start text-left font-normal"
                          variant="outline"
                        >
                          <CalendarIcon />
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>End date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          onSelect={(date) =>
                            date && field.onChange(date.toDateString())
                          }
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit">Create Report</Button>
              <Button
                onClick={() => navigate("/reports")}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
