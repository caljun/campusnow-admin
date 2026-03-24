import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import type { ReactNode } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import PostsPage from "./pages/PostsPage";

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">読み込み中...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">読み込み中...</div>;
  if (user && isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
      <Route path="/posts" element={<AdminRoute><PostsPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
