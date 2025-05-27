const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const SECRET = 'tajny_klucz_jwt'; 
const users = []; 

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ success: false, message: 'Użytkownik już istnieje' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.json({ success: true, message: 'Rejestracja udana' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Nieprawidłowe dane logowania' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Nieprawidłowe dane logowania' });
  }
  const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
  res.json({ success: true, token });
});

router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'Brak tokenu' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ username: decoded.username });
  } catch {
    res.status(401).json({ message: 'Nieprawidłowy token' });
  }
});

module.exports = router;