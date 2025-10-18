export const environment = {
  production: true,
  API_BASE_URL: 'https://api.marziofarina.it'
};

// ping.ts
const url = environment.API_BASE_URL
  ? `${environment.API_BASE_URL}/ping`
  : `/ping`;