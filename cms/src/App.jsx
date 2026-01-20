import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/dashboard/Dashboard';
import CreateArticle from './components/dashboard/CreateArticle';
import LayoutTemplatesList from './pages/LayoutTemplatesList';
import LayoutDesigner from './components/layout-designer/LayoutDesigner';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateArticle />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <CreateArticle />
            </ProtectedRoute>
          }
        />
        <Route
          path="/layouts"
          element={
            <ProtectedRoute>
              <LayoutTemplatesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/layouts/new"
          element={
            <ProtectedRoute>
              <LayoutDesigner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/layouts/:id"
          element={
            <ProtectedRoute>
              <LayoutDesigner />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
