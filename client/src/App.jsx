import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import WarehouseDashboard from './pages/WarehouseDashboard';
import StoreDashboard from './pages/StoreDashboard';
import ProductManagement from './pages/ProductManagement';
import ShipmentPage from './pages/ShipmentPage';
import StockRequestPage from './pages/StockRequestPage';
import StockApprovalPage from './pages/StockApprovalPage';
import SalesRecordingPage from './pages/SalesRecordingPage';
import ReportsPage from './pages/ReportsPage';
import UserManagementPage from './pages/UserManagementPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import MySettingsPage from './pages/MySettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['administrator']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['administrator']}><UserManagementPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['administrator']}><AdminSettingsPage /></ProtectedRoute>} />

          <Route path="/warehouse" element={<ProtectedRoute allowedRoles={['warehouse_manager']}><WarehouseDashboard /></ProtectedRoute>} />
          <Route path="/warehouse/products" element={<ProtectedRoute allowedRoles={['warehouse_manager', 'administrator']}><ProductManagement /></ProtectedRoute>} />
          <Route path="/warehouse/shipments" element={<ProtectedRoute allowedRoles={['warehouse_manager']}><ShipmentPage /></ProtectedRoute>} />
          <Route path="/warehouse/requests" element={<ProtectedRoute allowedRoles={['warehouse_manager']}><StockApprovalPage /></ProtectedRoute>} />

          <Route path="/store" element={<ProtectedRoute allowedRoles={['store_manager']}><StoreDashboard /></ProtectedRoute>} />
          <Route path="/store/requests" element={<ProtectedRoute allowedRoles={['store_manager']}><StockRequestPage /></ProtectedRoute>} />
          <Route path="/store/sales" element={<ProtectedRoute allowedRoles={['store_manager']}><SalesRecordingPage /></ProtectedRoute>} />

          <Route path="/reports" element={<ProtectedRoute allowedRoles={['administrator', 'warehouse_manager', 'store_manager']}><ReportsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['administrator', 'warehouse_manager', 'store_manager']}><MySettingsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;