# Salla Dashboard

Angular dashboard project prepared for GitHub-based CI and GitHub Pages deployment.

## Local development

Install dependencies and start the app:

```bash
npm ci
npm start
```

The app runs at `http://localhost:4200/`.

## Quality checks

Run the unit tests:

```bash
npm run test:ci
```

Build the production-ready static bundle:

```bash
npm run build
```

The build output is generated inside `dist/<project>/browser`.

## GitHub deployment

This repository now includes:

- `CI` workflow for install, test, and build validation on pushes and pull requests
- `Deploy To GitHub Pages` workflow for publishing the built app from `main`

To enable deployment on GitHub:

1. Push this repository to GitHub.
2. Open `Settings` > `Pages`.
3. Under `Build and deployment`, choose `GitHub Actions`.
4. Push to `main` again, or run the `Deploy To GitHub Pages` workflow manually.

After deployment, GitHub Pages will publish the static Angular app automatically.

## Notes

- The production build uses a relative base href, so it works on GitHub Pages project URLs without hardcoding the repository name.
- The app already uses hash-based routing, which keeps deep links working correctly on static hosting.
