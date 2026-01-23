import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { NewReport } from "./pages/NewReport";
import { Reports } from "./pages/Reports";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />} path="/">
        <Route element={<Dashboard />} index />
        <Route element={<Reports />} path="reports" />
        <Route element={<NewReport />} path="reports/new" />
      </Route>
    </Routes>
  );
}

export default App;
