const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const SECRET = 'tajny_klucz_jwt';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Brak tokenu' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Nieprawidłowy token' });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Brak danych' });

  const exists = await User.findOne({ where: { username } });
  if (exists)
    return res.status(400).json({ success: false, message: 'Użytkownik już istnieje' });

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ username, password: hashedPassword });
  res.json({ success: true, message: 'Rejestracja udana' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user)
    return res.status(401).json({ success: false, message: 'Nieprawidłowe dane logowania' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ success: false, message: 'Nieprawidłowe dane logowania' });

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