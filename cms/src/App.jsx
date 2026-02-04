import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/dashboard/Dashboard';
import CreateArticle from './components/dashboard/CreateArticle';
import LayoutTemplatesList from './pages/LayoutTemplatesList';
import LayoutDesigner from './components/layout-designer/LayoutDesigner';
import FreeformLayoutsList from './pages/FreeformLayoutsList';
import HtmlVisualEditor from './components/html-editor/HtmlVisualEditor';
import Login from './pages/Login';
import InjectHtml from './pages/InjectHtml';
import CreateHtmlArticle from './pages/CreateHtmlArticle';
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

        {/* Grid-based Layout Editor (Legacy) */}
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


        {/* Html Visual Editor */}
        <Route
          path="/edit-html/:id"
          element={
            <ProtectedRoute>
              <HtmlVisualEditor />
            </ProtectedRoute>
          }
        />

        {/* HTML Injection */}
        <Route
          path="/inject-html"
          element={
            <ProtectedRoute>
              <InjectHtml />
            </ProtectedRoute>
          }
        />

        {/* Create Visual Article (Redirect) */}
        <Route
          path="/create-visual"
          element={
            <ProtectedRoute>
              <CreateHtmlArticle />
            </ProtectedRoute>
          }
        />

        {/* Html Visual Editor */}
        <Route
          path="/edit-html/:id"
          element={
            <ProtectedRoute>
              <HtmlVisualEditor />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

