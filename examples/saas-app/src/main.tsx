import { AgnoProvider } from "@antipopp/agno-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/globals.css";
import App from "./App.tsx";
import { GlobalToolHandlers } from "./components/GlobalToolHandlers.tsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalToolHandlers>
        <AgnoProvider
          config={{
            endpoint: "http://localhost:7777",
            mode: "agent",
            agentId: "demo-saas-agent",
          }}
        >
          <App />
        </AgnoProvider>
      </GlobalToolHandlers>
    </BrowserRouter>
  </StrictMode>
);
