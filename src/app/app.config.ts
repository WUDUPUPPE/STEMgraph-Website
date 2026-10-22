import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from './api/api-configuration';
import { routes } from './app.routes';
import { provideMarkdown } from 'ngx-markdown';

// Anwendungskonfiguration, die sowohl auf dem Server als auch im Browser verwendet wird. Sie enthält die grundlegenden Provider für die Anwendung, wie z.B. den Router, den HTTP-Client und die API-Konfiguration
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(),
    provideApiConfiguration('/api'),
    provideMarkdown()
  ],
};
