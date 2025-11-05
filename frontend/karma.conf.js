// Karma configuration file for Portfolio project
// Questa configurazione aumenta i timeout per permettere il completamento di tutti i test

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client: {
      jasmine: {
        // Timeout per singoli test (default 5000ms → 10000ms)
        timeoutInterval: 10000
      },
      clearContext: false // lascia visibile Jasmine Spec Runner nell'output
    },
    jasmineHtmlReporter: {
      suppressAll: true // rimuove i messaggi duplicati
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true,
    
    // Timeout configurazioni (aumentati per test pesanti)
    browserDisconnectTimeout: 10000,      // Tempo prima di considerare il browser disconnesso (default: 2000ms)
    browserDisconnectTolerance: 3,        // Numero di disconnessioni tollerate (default: 0)
    browserNoActivityTimeout: 60000,      // Timeout per inattività del browser (default: 30000ms → 60000ms)
    captureTimeout: 120000,               // Tempo per catturare il browser (default: 60000ms → 120000ms)
    
    // Configurazioni aggiuntive
    singleRun: false,
    autoWatch: true
  });
};

