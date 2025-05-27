import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = isRegister
        ? 'http://localhost:4000/auth/register'
        : 'http://localhost:4000/auth/login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        if (!isRegister) {
          localStorage.setItem('token', data.token); // JWT zapisany w localStorage
          navigate('/dashboard');
        } else {
          setIsRegister(false);
          setError('Rejestracja udana! Możesz się zalogować.');
        }
      } else {
        setError(data.message || (isRegister ? 'Błąd rejestracji' : 'Błąd logowania'));
      }
    } catch {
      setError('Błąd połączenia z serwerem');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 300, margin: '2rem auto' }}>
      <h2>{isRegister ? 'Rejestracja' : 'Logowanie'}</h2>
      <input
        type="text"
        placeholder="Login"
        value={username}
        onChange={e => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Hasło"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button type="submit">{isRegister ? 'Zarejestruj' : 'Zaloguj'}</button>
      <button
        type="button"
        style={{ marginLeft: 8 }}
        onClick={() => {
          setIsRegister(r => !r);
          setError('');
        }}
      >
        {isRegister ? 'Masz konto? Zaloguj się' : 'Zarejestruj się'}
      </button>
      {error && <div style={{ color: isRegister && error.startsWith('Rejestracja udana') ? 'green' : 'red' }}>{error}</div>}
    </form>
  );
};

export default LoginForm;