import { type ToolHandler, ToolHandlerProvider } from "@antipopp/agno-react";
import { type ReactNode, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface GlobalToolHandlersProps {
  children: ReactNode;
}

/**
 * Sets up global tool handlers with access to React Router navigation
 */
export function GlobalToolHandlers({ children }: GlobalToolHandlersProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const globalToolHandlers = useMemo(
    () =>
      ({
        fill_report_form: (args: Record<string, unknown>) => {
          // Store the form data in sessionStorage for the NewReport page to pick up
          sessionStorage.setItem("pendingReportData", JSON.stringify(args));

          // Navigate to the new report page if not already there (using React Router)
          if (!location.pathname.includes("/reports/new")) {
            navigate("/reports/new");
            return {
              success: true,
              message: "Navigating to report form...",
              navigated: true,
            };
          }

          // If already on the page, the local handler will pick it up
          return {
            success: true,
            message: "Form data ready to be applied",
            ...args,
          };
        },
      }) satisfies Record<string, ToolHandler>,
    [navigate, location.pathname]
  );

  return (
    <ToolHandlerProvider handlers={globalToolHandlers}>
      {children}
    </ToolHandlerProvider>
  );
}
