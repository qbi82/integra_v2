import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';
import './index.css';
import './App.css';
const App = () => (
  <Routes>
    <Route
      path="/"
      element={
        <div className="login-bg">
          <LoginForm />
        </div>
      }
    />
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
);
//import { useNavigate } from 'react-router-dom';
export default App;