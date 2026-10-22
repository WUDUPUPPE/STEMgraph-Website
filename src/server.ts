import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Skizze eines Express-Servers, der die Angular-Anwendung rendert.
 * Der Server dient statische Dateien aus dem Browser-Ordner aus und behandelt alle anderen Anfragen, indem er die Angular-Anwendung rendert.
 * Der Server wird gestartet, wenn dieses Modul der Haupteinstiegspunkt ist oder über PM2 ausgeführt wird.
 * Der Server hört auf dem Port, der durch die `PORT`-Umgebungsvariable definiert ist, oder standardmäßig auf Port 4000.
 */

// Statische Dateien aus dem Ordner „dist“ des Browsers mit Caching bereitstellen
app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

// Alle anderen Anfragen werden an die Angular-Anwendung weitergeleitet
app.use((req, res, next) => {
    angularApp
        .handle(req)
        .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
        .catch(next);
});

// Startet den Server, wenn dieses Modul der Haupteinstiegspunkt ist oder über PM2 ausgeführt wird
if (isMainModule(import.meta.url) || process.env['pm_id']) {
    const port = process.env['PORT'] || 4000;
    app.listen(port, (error) => {
        if (error) {
            throw error;
        }

        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

// Exportiert den Request-Handler für die Verwendung in anderen Modulen oder Tests
export const reqHandler = createNodeRequestHandler(app);
