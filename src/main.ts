import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { inject } from '@vercel/analytics';

bootstrapApplication(App, appConfig)
  .then(() => {
    // Initialize Vercel Web Analytics after app bootstrap
    inject({
      mode: 'auto',
      debug: false
    });
  })
  .catch((err) => console.error(err));
