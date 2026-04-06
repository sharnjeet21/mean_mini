// Task 1 & 2: Node.js + Express server setup
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Delegate to the full server
require('./server/server');

// Basic server confirmation (as per Task 2 spec)
app.listen(PORT, () => {
  console.log(`App entry point running on http://localhost:${PORT}`);
});
