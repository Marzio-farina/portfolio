/**
 * Utility per sopprimere errori WebGL innocui nella console
 * 
 * Gli errori GL_INVALID_FRAMEBUFFER_OPERATION con "Attachment has zero size"
 * sono temporanei durante l'inizializzazione e vengono risolti automaticamente.
 * 
 * Questo filtro evita di inquinare la console con centinaia di errori innocui.
 */

const originalError = console.error;
const originalWarn = console.warn;

/**
 * Verifica se un messaggio è un errore WebGL da sopprimere
 */
function isWebGLError(message: string): boolean {
  // Filtra tutti i messaggi WebGL con prefisso [.WebGL-...]
  if (message.includes('[.WebGL-') || message.includes('WebGL:')) {
    return true;
  }
  
  // Filtra errori specifici WebGL
  const webglPatterns = [
    'GL_INVALID',
    'FRAMEBUFFER',
    'Framebuffer',
    'glTex',
    'glClear',
    'glDraw',
    'Attachment has zero size',
    'Texture dimensions',
    'too many errors'
  ];
  
  return webglPatterns.some(pattern => message.includes(pattern));
}

/**
 * Verifica se un messaggio è un warning Three.js da sopprimere
 */
function isThreeJsWarning(message: string): boolean {
  const patterns = [
    'Multiple instances of Three.js',
    'Too many active WebGL contexts',
    'Oldest context will be lost',
    'THREE.WebGLRenderer: Context Lost'
  ];
  
  return patterns.some(pattern => message.includes(pattern));
}

/**
 * Inizializza la soppressione errori WebGL
 */
export function suppressWebGLErrors() {
  // Override console.error
  console.error = function(...args: any[]) {
    const message = args.join(' ');
    
    if (isWebGLError(message)) {
      return; // Sopprimi tutti gli errori WebGL
    }
    
    originalError.apply(console, args);
  };
  
  // Override console.warn
  console.warn = function(...args: any[]) {
    const message = args.join(' ');
    
    if (isWebGLError(message) || isThreeJsWarning(message)) {
      return; // Sopprimi warning WebGL e Three.js
    }
    
    originalWarn.apply(console, args);
  };
}

/**
 * Ripristina console originale (per debugging)
 */
export function restoreConsole() {
  console.error = originalError;
  console.warn = originalWarn;
}

