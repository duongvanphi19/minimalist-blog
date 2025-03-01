
const express = require('express');
const app = express();
const port = 3000;

// Serve static files from the root directory
app.use(express.static('./'));

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Blog server running at http://0.0.0.0:${port}`);
});
