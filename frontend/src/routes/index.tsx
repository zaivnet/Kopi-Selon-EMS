import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

// Lazy-loaded page components for route-based code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SetupPage = lazy(() => import('@/pages/auth/SetupPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const EmployeeListPage = lazy(() => import('@/pages/employees/EmployeeListPage'));
const ShiftListPage = lazy(() => import('@/pages/shifts/ShiftListPage'));
const EmployeeAttendancePage = lazy(() => import('@/pages/attendance/EmployeeAttendancePage'));
const ReportPage = lazy(() => import('@/pages/report/ReportPage'));
const CompanyProfilePage = lazy(() => import('@/pages/company/CompanyProfilePage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const PayrollPage = lazy(() => import('@/pages/salary/PayrollPage'));
const SalaryRulePage = lazy(() => import('@/pages/salary/SalaryRulePage'));
const AdminAttendancePage = lazy(() => import('@/pages/attendance/AdminAttendancePage'));
const RolePermissionsPage = lazy(() => import('@/pages/roles/RolePermissionsPage'));
const RequestCenterPage = lazy(() => import('@/pages/requests/RequestCenterPage'));
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));
const ErrorPage = lazy(() => import('@/pages/errors/ErrorPage'));

function PageLoader() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Memuat halaman...</span>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route element={<ProtectedRoute requiredPermission="dashboard.view" />}>
              <Route index element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="employee.view" />}>
              <Route path="employees" element={<EmployeeListPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="shift.view" />}>
              <Route path="shifts" element={<ShiftListPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="request_center.view" />}>
              <Route path="requests" element={<RequestCenterPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="user_management.edit_user" />}>
              <Route path="roles" element={<RolePermissionsPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="attendance.create" />}>
              <Route path="attendance" element={<EmployeeAttendancePage />} />
              <Route path="attendance/me" element={<EmployeeAttendancePage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="attendance.view" />}>
              <Route path="attendance/admin" element={<AdminAttendancePage />} />
              <Route path="attendance-monitoring" element={<AdminAttendancePage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="salary.calculate" />}>
              <Route path="salary-rules" element={<SalaryRulePage />} />
            </Route>
            <Route element={<ProtectedRoute requiredPermission="salary.view" />}>
              <Route path="payroll" element={<PayrollPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="reports.view" />}>
              <Route path="reports" element={<ReportPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="company_profile.view" />}>
              <Route path="company-profile" element={<CompanyProfilePage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="settings.view" />}>
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Alias redirects for quick navigation */}
          <Route path="/roles" element={<Navigate to="/dashboard/roles" replace />} />
          <Route path="/requests" element={<Navigate to="/dashboard/requests" replace />} />
          <Route path="/attendance/me" element={<Navigate to="/dashboard/attendance" replace />} />
          <Route path="/attendance/admin" element={<Navigate to="/dashboard/attendance-monitoring" replace />} />
          <Route path="/attendance" element={<Navigate to="/dashboard/attendance" replace />} />
          <Route path="/employees" element={<Navigate to="/dashboard/employees" replace />} />
          <Route path="/shifts" element={<Navigate to="/dashboard/shifts" replace />} />
          <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
          <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
        </Route>

        <Route path="/error" element={<ErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
