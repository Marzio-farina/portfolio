/**
 * Performance Test Script
 * 
 * Misura Core Web Vitals e LCP in particolare
 * Esegui in Chrome DevTools Console
 */

(function() {
  console.log('🚀 Performance Test Script');
  console.log('=====================================\n');

  // Web Vitals observer
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`📊 ${entry.entryType}:`, entry);
      
      if (entry.entryType === 'largest-contentful-paint') {
        const lcp = entry.renderTime || entry.loadTime;
        const element = entry.element;
        
        console.log('\n🎯 LCP Details:');
        console.log('  Time:', lcp.toFixed(2) + 'ms');
        console.log('  Element:', element?.tagName, element?.className);
        console.log('  URL:', element?.currentSrc || element?.src);
        
        // Rating
        let rating = '❌ Poor';
        if (lcp < 2500) rating = '✅ Good';
        else if (lcp < 4000) rating = '⚠️ Needs Improvement';
        
        console.log('  Rating:', rating);
        console.log('  Target: < 2500ms');
      }
    }
  });

  // Osserva LCP
  observer.observe({ entryTypes: ['largest-contentful-paint'] });

  // Osserva anche paint events
  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`🎨 ${entry.name}:`, entry.startTime.toFixed(2) + 'ms');
    }
  });
  paintObserver.observe({ entryTypes: ['paint'] });

  // Misura risorse caricate
  setTimeout(() => {
    const resources = performance.getEntriesByType('resource');
    const images = resources.filter(r => r.initiatorType === 'img');
    
    console.log('\n📷 Images Loaded:');
    console.log('  Total images:', images.length);
    console.log('  Images detail:');
    images.forEach((img, i) => {
      console.log(`    ${i + 1}. ${img.name.substring(img.name.lastIndexOf('/') + 1)} - ${img.duration.toFixed(2)}ms`);
    });

    // Calcola totale
    const totalImageSize = images.reduce((sum, img) => sum + (img.transferSize || 0), 0);
    console.log('  Total size:', (totalImageSize / 1024).toFixed(2) + ' KB');

    // Network summary
    console.log('\n🌐 Network Summary:');
    console.log('  Total requests:', resources.length);
    console.log('  Images:', images.length);
    console.log('  Scripts:', resources.filter(r => r.initiatorType === 'script').length);
    console.log('  CSS:', resources.filter(r => r.initiatorType === 'link').length);
    console.log('  XHR:', resources.filter(r => r.initiatorType === 'xmlhttprequest').length);

  }, 3000);

  // Navigation timing
  setTimeout(() => {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (navTiming) {
      console.log('\n⏱️ Navigation Timing:');
      console.log('  DNS:', (navTiming.domainLookupEnd - navTiming.domainLookupStart).toFixed(2) + 'ms');
      console.log('  TCP:', (navTiming.connectEnd - navTiming.connectStart).toFixed(2) + 'ms');
      console.log('  Request:', (navTiming.responseStart - navTiming.requestStart).toFixed(2) + 'ms');
      console.log('  Response:', (navTiming.responseEnd - navTiming.responseStart).toFixed(2) + 'ms');
      console.log('  DOM Processing:', (navTiming.domComplete - navTiming.domLoading).toFixed(2) + 'ms');
      console.log('  Total:', (navTiming.loadEventEnd - navTiming.fetchStart).toFixed(2) + 'ms');
    }
  }, 3000);

  console.log('\n✅ Monitoring started. Results will appear in console.\n');
})();

