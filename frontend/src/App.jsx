import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import MaterialListPage from './pages/Materials/MaterialListPage';
import FGListPage from './pages/FG/FGListPage';
import TransactionsPage from './pages/Transactions/TransactionsPage';
import UsersPage from './pages/Users/UsersPage';
import AuditLogPage from './pages/AuditLog/AuditLogPage';
import WarehouseListPage from './pages/Warehouses/WarehouseListPage';
import InventoryReportPage from './pages/Reports/InventoryReportPage';
import ProfilePage from './pages/Profile/ProfilePage';
import ChangePasswordPage from './pages/Profile/ChangePasswordPage';

const PrivateRoute = ({ children, adminOnly = false }) => {
    const { isAuthenticated, isAdmin } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
    return children;
};

const AppRoutes = () => {
    const { isAuthenticated } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                <Route index element={<DashboardPage />} />
                <Route path="materials" element={<MaterialListPage />} />
                <Route path="fg-products" element={<FGListPage />} />
                <Route path="warehouses" element={<WarehouseListPage />} />
                <Route path="reports" element={<InventoryReportPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="change-password" element={<ChangePasswordPage />} />
                <Route path="users" element={<PrivateRoute adminOnly><UsersPage /></PrivateRoute>} />
                <Route path="audit-log" element={<PrivateRoute adminOnly><AuditLogPage /></PrivateRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
