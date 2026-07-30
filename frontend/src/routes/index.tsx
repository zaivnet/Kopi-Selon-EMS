import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoginPage from '@/pages/auth/LoginPage';
import SetupPage from '@/pages/auth/SetupPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import EmployeeListPage from '@/pages/employees/EmployeeListPage';
import ShiftListPage from '@/pages/shifts/ShiftListPage';
import EmployeeAttendancePage from '@/pages/attendance/EmployeeAttendancePage';
import ReportPage from '@/pages/report/ReportPage';
import CompanyProfilePage from '@/pages/company/CompanyProfilePage';
import SettingsPage from '@/pages/settings/SettingsPage';
import PayrollPage from '@/pages/salary/PayrollPage';
import SalaryRulePage from '@/pages/salary/SalaryRulePage';
import AdminAttendancePage from '@/pages/attendance/AdminAttendancePage';
import NotFoundPage from '@/pages/errors/NotFoundPage';
import ErrorPage from '@/pages/errors/ErrorPage';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import RolePermissionsPage from '@/pages/roles/RolePermissionsPage';
import RequestCenterPage from '@/pages/requests/RequestCenterPage';

export default function AppRoutes() {
  return (
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

          <Route element={<ProtectedRoute requiredPermission="request_center.view" allowedRoles={['Administrator', 'Owner', 'Staff']} />}>
            <Route path="requests" element={<RequestCenterPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Administrator', 'Owner']} />}>
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

          <Route element={<ProtectedRoute requiredPermission="salary.view" />}>
            <Route path="salary-rules" element={<SalaryRulePage />} />
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
  );
}
