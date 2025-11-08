import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { suppressWebGLErrors } from './app/utils/suppress-webgl-errors';

// Sopprimi errori WebGL innocui (inizializzazione temporanea)
suppressWebGLErrors();

// Disabilita i log di Angular e content script in development
if (typeof window !== 'undefined') {
  // Nasconde i log di Angular development mode e content script
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    const message = args[0]?.toString() || '';
    if (!message.includes('Angular is running in development mode') && 
        !message.includes('Attempting initialization')) {
      originalConsoleLog.apply(console, args);
    }
  };
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
