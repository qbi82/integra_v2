const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);
const sequelize = require('./db');
const Housing = require('./models/Housing');

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
