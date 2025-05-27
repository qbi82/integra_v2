import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';

const App = () => (
  <Routes>
    <Route path="/" element={<LoginForm />} />
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
);
//import { useNavigate } from 'react-router-dom';
export default App;