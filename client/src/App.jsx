import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const WarehouseDashboard = lazy(() => import('./pages/WarehouseDashboard'));
const StoreDashboard = lazy(() => import('./pages/StoreDashboard'));
const ProductManagement = lazy(() => import('./pages/ProductManagement'));
const ShipmentPage = lazy(() => import('./pages/ShipmentPage'));
const StockRequestPage = lazy(() => import('./pages/StockRequestPage'));
const StockApprovalPage = lazy(() => import('./pages/StockApprovalPage'));
const SalesRecordingPage = lazy(() => import('./pages/SalesRecordingPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const StoreInventoryPage = lazy(() => import('./pages/StoreInventoryPage'));

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      Loading page...
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['administrator']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['administrator']}><UserManagementPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['administrator']}><AdminSettingsPage /></ProtectedRoute>} />
          <Route path="/admin/activity" element={<ProtectedRoute allowedRoles={['administrator']}><ActivityLogPage /></ProtectedRoute>} />

          <Route path="/warehouse" element={<ProtectedRoute allowedRoles={['warehouse_manager']}><WarehouseDashboard /></ProtectedRoute>} />
          <Route path="/warehouse/products" element={<ProtectedRoute allowedRoles={['warehouse_manager', 'administrator']}><ProductManagement /></ProtectedRoute>} />
          <Route path="/warehouse/shipments" element={<ProtectedRoute allowedRoles={['warehouse_manager']}><ShipmentPage /></ProtectedRoute>} />
          <Route path="/warehouse/requests" element={<ProtectedRoute allowedRoles={['warehouse_manager']}><StockApprovalPage /></ProtectedRoute>} />

          <Route path="/store" element={<ProtectedRoute allowedRoles={['store_manager']}><StoreDashboard /></ProtectedRoute>} />
          <Route path="/store/inventory" element={<ProtectedRoute allowedRoles={['store_manager']}><StoreInventoryPage /></ProtectedRoute>} />
          <Route path="/store/requests" element={<ProtectedRoute allowedRoles={['store_manager']}><StockRequestPage /></ProtectedRoute>} />
          <Route path="/store/sales" element={<ProtectedRoute allowedRoles={['store_manager']}><SalesRecordingPage /></ProtectedRoute>} />

          <Route path="/reports" element={<ProtectedRoute allowedRoles={['administrator', 'warehouse_manager', 'store_manager']}><ReportsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
