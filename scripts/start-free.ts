import express from 'express';

const app = express();
const PORT = Math.floor(Math.random() * (60000 - 50000) + 50000); // Choisit un port libre entre 50000 et 60000

app.get('/', (req, res) => res.send(`✅ Serveur test actif sur http://localhost:${PORT}`));

app.listen(PORT, () => {
  console.log(`🧪 Serveur test Express lancé sur http://localhost:${PORT}`);
});
