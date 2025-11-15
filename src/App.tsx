import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { FinanceDashboard } from './pages/FinanceDashboard'
import { CoffeePayments } from './pages/CoffeePayments'
import { SupplierAdvances } from './pages/SupplierAdvances'
import { CashManagement } from './pages/CashManagement'
import { Expenses } from './pages/Expenses'
import { Requisitions } from './pages/Requisitions'
import { HRPayments } from './pages/HRPayments'
import { Reports } from './pages/Reports'
import { ReportsNew } from './pages/ReportsNew'
import { Settings } from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="finance" element={<FinanceDashboard />} />
            <Route path="coffee-payments" element={<CoffeePayments />} />
            <Route path="supplier-advances" element={<SupplierAdvances />} />
            <Route path="cash-management" element={<CashManagement />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="requisitions" element={<Requisitions />} />
            <Route path="hr-payments" element={<HRPayments />} />
            <Route path="reports" element={<ReportsNew />} />
            <Route path="reports-old" element={<Reports />} />
            <Route path="reports/:reportType" element={<Reports />} />
            <Route
              path="settings"
              element={
                <ProtectedRoute requireRoles={['Super Admin', 'Manager', 'Administrator']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
