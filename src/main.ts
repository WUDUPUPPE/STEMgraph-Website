import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// Ladt die Angular-Anwendung und wendet die Konfiguration an. Wenn ein Fehler auftritt, wird dieser in der Konsole protokolliert
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
