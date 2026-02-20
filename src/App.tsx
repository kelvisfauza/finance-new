import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { CoffeePayments } from './pages/CoffeePayments'
import { SupplierAdvances } from './pages/SupplierAdvances'
import { CashManagement } from './pages/CashManagement'
import { Expenses } from './pages/Expenses'
import { Requisitions } from './pages/Requisitions'
import { HRPayments } from './pages/HRPayments'
import { Reports } from './pages/Reports'
import { ReportsNew } from './pages/ReportsNew'
import { FinanceReports } from './pages/FinanceReports'
import { Settings } from './pages/Settings'
import { VerifySearch } from './pages/VerifySearch'
import { VerifyResult } from './pages/VerifyResult'
import { AdminVerifications } from './pages/AdminVerifications'
import { VerificationAuditLogs } from './pages/VerificationAuditLogs'
import FieldAssessment from './pages/FieldAssessment'
import FieldAssessments from './pages/FieldAssessments'
import StandaloneAssessment from './pages/StandaloneAssessment'
import StandaloneAssessmentList from './pages/StandaloneAssessmentList'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Login />} />

          <Route path="/verify" element={<VerifySearch />} />
          <Route path="/verify/:code" element={<VerifyResult />} />

          <Route path="/assessment" element={<StandaloneAssessment />} />
          <Route path="/assessment-list" element={<StandaloneAssessmentList />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="coffee-payments" element={<CoffeePayments />} />
            <Route path="supplier-advances" element={<SupplierAdvances />} />
            <Route path="cash-management" element={<CashManagement />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="requisitions" element={<Requisitions />} />
            <Route path="hr-payments" element={<HRPayments />} />
            <Route path="reports" element={<FinanceReports />} />
            <Route path="reports-old" element={<ReportsNew />} />
            <Route path="reports-legacy" element={<Reports />} />
            <Route path="reports/:reportType" element={<Reports />} />
            <Route path="admin/verifications" element={<AdminVerifications />} />
            <Route path="admin/verifications/logs" element={<VerificationAuditLogs />} />
            <Route path="field-assessments" element={<FieldAssessments />} />
            <Route path="field-assessment/new" element={<FieldAssessment />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
