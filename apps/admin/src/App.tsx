import React from 'react';
import { BrowserRouter, Routes as RouterRoutes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Routes } from './pages/Routes';
import { Keys } from './pages/Keys';
import { Grants } from './pages/Grants';
import { Audit } from './pages/Audit';

function App() {
  return (
    <BrowserRouter basename="/admin">
      <RouterRoutes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="routes" element={<Routes />} />
          <Route path="keys" element={<Keys />} />
          <Route path="grants" element={<Grants />} />
          <Route path="audit" element={<Audit />} />
        </Route>
      </RouterRoutes>
    </BrowserRouter>
  );
}

export default App;
