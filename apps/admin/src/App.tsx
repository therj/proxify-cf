import React from 'react';
import { BrowserRouter, Routes as RouterRoutes, Route } from 'react-router-dom';
import { ScrollToTop } from './components/ScrollToTop';
import { LandingLayout } from './components/LandingLayout';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Docs } from './pages/Docs';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { Routes } from './pages/Routes';
import { RouteDetail } from './pages/RouteDetail';
import { Keys } from './pages/Keys';
import { Grants } from './pages/Grants';
import { Audit } from './pages/Audit';
import { Access } from './pages/Access';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouterRoutes>
        <Route element={<LandingLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<Docs />} />
        </Route>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:clientId" element={<ClientDetail />} />
          <Route path="routes" element={<Routes />} />
          <Route path="routes/:routeId" element={<RouteDetail />} />
          <Route path="keys" element={<Keys />} />
          <Route path="grants" element={<Grants />} />
          <Route path="access" element={<Access />} />
          <Route path="audit" element={<Audit />} />
        </Route>
      </RouterRoutes>
    </BrowserRouter>
  );
}

export default App;
