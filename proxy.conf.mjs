// Proxyeinstellungen für die Entwicklungsumgebung. Diese Konfiguration leitet Anfragen, die mit `/api/` beginnen, an den lokalen Backend-Server weiter, der auf `http://127.0.0.1:8000` hört
export default {
  '/api/**': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
};
