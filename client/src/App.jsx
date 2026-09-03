import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import WarehouseDashboard from './pages/WarehouseDashboard';
import StoreDashboard from './pages/StoreDashboard';
import ProductManagement from './pages/ProductManagement';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['administrator']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse"
            element={
              <ProtectedRoute allowedRoles={['warehouse_manager']}>
                <WarehouseDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/products"
            element={
              <ProtectedRoute allowedRoles={['warehouse_manager', 'administrator']}>
                <ProductManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/store"
            element={
              <ProtectedRoute allowedRoles={['store_manager']}>
                <StoreDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;