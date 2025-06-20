import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`🌱 Serveur Ecolojia démarré sur http://localhost:${PORT}`);
});
