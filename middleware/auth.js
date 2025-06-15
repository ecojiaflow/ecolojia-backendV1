// middleware/auth.js
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Clé API requise',
      code: 'MISSING_API_KEY' 
    });
  }

  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ 
      error: 'Clé API invalide',
      code: 'INVALID_API_KEY' 
    });
  }

  next();
};

module.exports = { validateApiKey };