# GraphWebsite

Angular-Website für STEMgraph (Challenges als Graph, Kugel oder Liste).

## Projektstruktur

```
src/app/
  api/            generierter API-Client (ng-openapi-gen, nicht von Hand ändern)
  core/           Logik ohne Oberfläche
    constants/    feste Werte (z. B. Test-Accounts)
    guards/       Routen-Guards (Login / Admin)
    models/       eigene Typen (User, Suche, API-Status)
    services/     Auth, API-Zugriff, API-Status, Auswahl, README-Vorschau
    mappers/      wandelt API-Antworten in das Graph-Format um (Keywords)
    utils/        kleine Hilfsfunktionen (Markdown-Vorschau)
  components/     wiederverwendbare Bausteine (Navbar, Suche, Graph, ...)
    graph-3d/     3D-Graph mit three.js, aufgeteilt in Klassen:
      config/       Einstellungen (Farben, Größen, Physik)
      layout/       GraphLayout -> SphereLayout, ClusterLayout
      scene/        SceneManager, GraphView, ClusterPhysics,
                    GraphInteraction, SelectionRing
  # Keyword-Seite: keyword-explorer (Graph) + keyword-challenges (Liste zum gewählten Keyword)
  layouts/        Seitenrahmen (Navbar + Inhalt)
  pages/          eine Komponente pro Seite
```

Die Komponente `Graph3d` verbindet nur Angular mit den 3D-Klassen.
Die eigentliche Arbeit machen:

| Klasse | Aufgabe |
| --- | --- |
| `SceneManager` | Szene, Kamera, Renderer, Licht, Maussteuerung |
| `GraphView` | Knoten, Kanten und deren Animation |
| `GraphLayout` (+ `SphereLayout`, `ClusterLayout`) | berechnet die Positionen |
| `ClusterPhysics` | Physik beim Ziehen und Ausschwingen |
| `GraphInteraction` | Hover, Klick und Ziehen mit der Maus |
| `SelectionRing` | Ring um den gewählten Knoten |


This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

## Development server

To start a local development server, run:

```bash
npm start
maybe ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
