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
    
    // Timeout configurazioni (aumentati significativamente per suite completa di 2795+ test)
    browserDisconnectTimeout: 30000,      // Tempo prima di considerare il browser disconnesso (30s)
    browserDisconnectTolerance: 5,        // Numero di disconnessioni tollerate
    browserNoActivityTimeout: 300000,     // Timeout per inattività del browser (5 minuti)
    captureTimeout: 300000,               // Tempo per catturare il browser (5 minuti)
    
    // Configurazioni aggiuntive
    singleRun: false,
    autoWatch: true
  });
};

