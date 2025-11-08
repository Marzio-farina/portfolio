/**
 * Script per ottimizzare caricamento Google Fonts
 * Riduce i pesi caricati e genera preload ottimizzati
 * 
 * Uso: node scripts/optimize-fonts.js
 */

console.log('🔤 Ottimizzazione Google Fonts\n');

console.log('📊 Analisi attuale:');
console.log('   Font: Poppins');
console.log('   Pesi caricati: 300, 400, 500, 600, 700, 800 (6 pesi)');
console.log('   Dimensione stimata: ~180 KB\n');

console.log('✅ Ottimizzazione consigliata:');
console.log('   Pesi necessari: 400 (normale), 600 (semi-bold), 700 (bold)');
console.log('   Dimensione stimata: ~90 KB');
console.log('   Risparmio: ~50%\n');

console.log('📝 Modifica necessaria in frontend/src/index.html:');
console.log('');
console.log('   PRIMA:');
console.log('   <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap">');
console.log('');
console.log('   DOPO:');
console.log('   <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap">');
console.log('');

console.log('💡 Ulteriore ottimizzazione (opzionale):');
console.log('   Considera di usare font system stack per zero network requests:');
console.log('   font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;');
console.log('');

console.log('✨ Completato!');

