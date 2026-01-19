import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/dashboard/Dashboard';
import CreateArticle from './components/dashboard/CreateArticle';
import LayoutTemplatesList from './pages/LayoutTemplatesList';
import LayoutDesigner from './components/layout-designer/LayoutDesigner';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateArticle />} />
        <Route path="/edit/:id" element={<CreateArticle />} />
        <Route path="/layouts" element={<LayoutTemplatesList />} />
        <Route path="/layouts/new" element={<LayoutDesigner />} />
        <Route path="/layouts/:id" element={<LayoutDesigner />} />
      </Routes>
    </Router>
  );
}

export default App;
