/**
 * Script per analizzare quali API sono effettivamente utilizzate dal frontend
 * Esegui: node scripts/analyze-api-usage.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path del frontend
const frontendPath = path.join(__dirname, '../../frontend/src/app');
const servicesPath = path.join(frontendPath, 'services');
const componentsPath = path.join(frontendPath, 'components');
const pagesPath = path.join(frontendPath, 'pages');

// API endpoints definiti nel backend
const backendRoutes = {
  // Public read-only
  'GET /api/testimonials': 'TestimonialController@index',
  'GET /api/testimonials/icons': 'TestimonialController@getIcons',
  'GET /api/testimonials/default-avatars': 'TestimonialController@getDefaultAvatars',
  'GET /api/projects': 'ProjectController@index',
  'GET /api/categories': 'CategoryController@index',
  'GET /api/technologies': 'TechnologyController@index',
  'GET /api/cv': 'CvController@index',
  'GET /api/what-i-do': 'WhatIDoController@index',
  'GET /api/attestati': 'AttestatiController@index',
  'GET /api/github-repositories': 'GitHubRepositoryController@index',
  'GET /api/github/{owner}/{repo}/stats': 'GitHubProxyController@getRepoStats',
  'GET /api/github/user/{username}/total-commits': 'GitHubProxyController@getUserTotalCommits',
  'GET /api/public-profile': 'UserPublicController@me',
  'GET /api/cv-files/default': 'CvFileController@getDefault',
  'GET /api/cv-files/{id}/download': 'CvFileController@download',
  'GET /api/ping': 'Ping endpoint',
  'GET /api/health': 'HealthCheckController@index',
  
  // Public write
  'POST /api/testimonials': 'TestimonialController@store',
  'POST /api/contact': 'ContactController@send',
  
  // Auth
  'POST /api/register': 'AuthController@register',
  'POST /api/login': 'AuthController@login',
  'POST /api/logout': 'AuthController@logout',
  'GET /api/me': 'AuthController@me',
  'POST /api/auth/forgot-password': 'AuthController@forgotPassword',
  'POST /api/auth/reset-password': 'AuthController@resetPassword',
  
  // Protected
  'GET /api/job-offer-emails': 'JobOfferEmailController@index',
  'GET /api/job-offer-columns': 'JobOfferColumnController@index',
  'GET /api/job-offer-email-columns': 'JobOfferEmailColumnController@index',
  'POST /api/emails/sync': 'EmailSyncController@syncEmails',
  'POST /api/job-scraper/adzuna': 'JobScraperController@scrapeAdzuna',
  'POST /api/projects': 'ProjectController@store',
  'PUT /api/projects/{id}': 'ProjectController@update',
  'POST /api/projects/{id}': 'ProjectController@update',
  'DELETE /api/projects/{id}': 'ProjectController@destroy',
};

// Funzione per cercare pattern nei file
function findPatternInFile(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const found = [];
    
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'gi');
      if (regex.test(content)) {
        found.push(pattern);
      }
    });
    
    return found;
  } catch (error) {
    return [];
  }
}

// Funzione ricorsiva per cercare file .ts
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('dist')) {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Cerca tutte le API utilizzate
function analyzeApiUsage() {
  console.log('🔍 Analisi utilizzo API nel frontend...\n');
  
  const tsFiles = findTsFiles(frontendPath);
  const apiPatterns = Object.keys(backendRoutes).map(route => {
    const endpoint = route.split(' ')[1].replace('/api/', '');
    return endpoint.split('/')[0]; // Prende solo la prima parte
  });
  
  const usedApis = new Set();
  const unusedApis = new Set(Object.keys(backendRoutes));
  
  // Pattern comuni da cercare
  const commonPatterns = [
    'apiUrl\\(',
    'api/',
    'testimonials',
    'projects',
    'categories',
    'technologies',
    'cv',
    'what-i-do',
    'attestati',
    'github',
    'public-profile',
    'job-offer',
    'job-offers',
    'emails',
    'job-scraper',
    'contact',
    'register',
    'login',
    'logout',
    'me',
    'ping',
    'health',
  ];
  
  tsFiles.forEach(file => {
    const patterns = findPatternInFile(file, commonPatterns);
    patterns.forEach(pattern => {
      // Mappa pattern alle API
      if (pattern.includes('testimonials')) usedApis.add('testimonials');
      if (pattern.includes('projects')) usedApis.add('projects');
      if (pattern.includes('categories')) usedApis.add('categories');
      if (pattern.includes('technologies')) usedApis.add('technologies');
      if (pattern.includes('cv') && !pattern.includes('cv-upload')) usedApis.add('cv');
      if (pattern.includes('what-i-do')) usedApis.add('what-i-do');
      if (pattern.includes('attestati')) usedApis.add('attestati');
      if (pattern.includes('github')) usedApis.add('github');
      if (pattern.includes('public-profile')) usedApis.add('public-profile');
      if (pattern.includes('job-offer')) usedApis.add('job-offer');
      if (pattern.includes('emails')) usedApis.add('emails');
      if (pattern.includes('job-scraper')) usedApis.add('job-scraper');
      if (pattern.includes('contact')) usedApis.add('contact');
      if (pattern.includes('register') || pattern.includes('login') || pattern.includes('logout') || pattern.includes('me')) usedApis.add('auth');
      if (pattern.includes('ping')) usedApis.add('ping');
      if (pattern.includes('health')) usedApis.add('health');
    });
  });
  
  console.log('✅ API utilizzate nel frontend:');
  console.log(Array.from(usedApis).sort().join(', '));
  console.log(`\n📊 Totale: ${usedApis.size} endpoint unici`);
  console.log(`\n📁 File analizzati: ${tsFiles.length}`);
  
  // Cerca chiamate specifiche
  console.log('\n🔎 Dettaglio chiamate API:\n');
  const specificApis = {
    'testimonials': findInFiles(tsFiles, ['testimonials']),
    'projects': findInFiles(tsFiles, ['projects']),
    'job-offer': findInFiles(tsFiles, ['job-offer']),
    'auth': findInFiles(tsFiles, ['login', 'register', 'logout', '/me']),
  };
  
  Object.entries(specificApis).forEach(([api, count]) => {
    if (count > 0) {
      console.log(`  ${api}: ${count} file`);
    }
  });
}

function findInFiles(files, patterns) {
  let count = 0;
  files.forEach(file => {
    const found = findPatternInFile(file, patterns);
    if (found.length > 0) count++;
  });
  return count;
}

// Esegui analisi
analyzeApiUsage();

