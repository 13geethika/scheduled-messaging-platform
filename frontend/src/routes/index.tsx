import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../shared/layouts/AuthLayout';
import { DashboardLayout } from '../shared/layouts/DashboardLayout';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import { PATHS } from './paths';

// Lazy loading views for bundle optimization
const Login = React.lazy(() => import('../features/auth/Login'));
const Register = React.lazy(() => import('../features/auth/Register'));
const VerifyEmail = React.lazy(() => import('../features/auth/VerifyEmail'));
const ForgotPassword = React.lazy(() => import('../features/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('../features/auth/ResetPassword'));

const Dashboard = React.lazy(() => import('../features/dashboard/Dashboard'));
const Contacts = React.lazy(() => import('../features/contacts/Contacts'));
const Scheduler = React.lazy(() => import('../features/messages/Scheduler'));
const Chats = React.lazy(() => import('../features/chats/Chats'));
const Profile = React.lazy(() => import('../features/profile/Profile'));
const AuditLogs = React.lazy(() => import('../features/audit/AuditLogs'));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route element={<AuthLayout />}>
        <Route path={PATHS.LOGIN} element={<Login />} />
        <Route path={PATHS.REGISTER} element={<Register />} />
        <Route path={PATHS.VERIFY_EMAIL} element={<VerifyEmail />} />
        <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={PATHS.RESET_PASSWORD} element={<ResetPassword />} />
      </Route>

      {/* Protected Enterprise Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={PATHS.DASHBOARD} element={<Dashboard />} />
          <Route path={PATHS.CONTACTS} element={<Contacts />} />
          <Route path={PATHS.SCHEDULER} element={<Scheduler />} />
          <Route path={PATHS.CHATS} element={<Chats />} />
          <Route path={PATHS.PROFILE} element={<Profile />} />
          <Route path={PATHS.AUDIT_LOGS} element={<AuditLogs />} />
        </Route>
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to={PATHS.DASHBOARD} replace />} />
    </Routes>
  );
};
