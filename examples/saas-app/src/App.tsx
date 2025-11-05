import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { NewReport } from './pages/NewReport'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/new" element={<NewReport />} />
      </Route>
    </Routes>
  )
}

export default App
