# Portfolio Marzio Farina - Documentazione Tecnica

## 🔧 Configurazione Tecnica Dettagliata

### Backend Laravel - Configurazioni Avanzate

#### Database Configuration
```php
// config/database.php
'connections' => [
    'sqlite' => [
        'driver' => 'sqlite',
        'database' => env('DB_DATABASE', database_path('database.sqlite')),
        'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
    ],
    'pgsql' => [
        'driver' => 'pgsql',
        'host' => env('DB_HOST', '127.0.0.1'),
        'port' => env('DB_PORT', '5432'),
        'database' => env('DB_DATABASE', 'laravel'),
        'username' => env('DB_USERNAME', 'root'),
        'password' => env('DB_PASSWORD', ''),
        'charset' => env('DB_CHARSET', 'utf8'),
        'prefix' => '',
        'prefix_indexes' => true,
        'search_path' => 'public',
        'sslmode' => env('DB_SSLMODE', 'prefer'),
    ],
],
```

#### Cache Configuration
```php
// config/cache.php
'default' => env('CACHE_STORE', 'database'),

'stores' => [
    'database' => [
        'driver' => 'database',
        'table' => 'cache',
        'connection' => null,
    ],
    'redis' => [
        'driver' => 'redis',
        'connection' => 'cache',
    ],
],
```

#### Mail Configuration
```php
// config/mail.php
'mailers' => [
    'smtp' => [
        'transport' => 'smtp',
        'host' => env('MAIL_HOST', 'smtp.mailgun.org'),
        'port' => env('MAIL_PORT', 587),
        'encryption' => env('MAIL_ENCRYPTION', 'tls'),
        'username' => env('MAIL_USERNAME'),
        'password' => env('MAIL_PASSWORD'),
        'timeout' => null,
        'local_domain' => env('MAIL_EHLO_DOMAIN'),
    ],
],
```

### Frontend Angular - Configurazioni Avanzate

#### Angular Configuration
```json
// angular.json
{
  "projects": {
    "portfolio": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "css",
          "skipTests": true
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "outputPath": "dist/Portfolio",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": [
              "zone.js"
            ],
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "src/styles.css"
            ],
            "scripts": []
          }
        }
      }
    }
  }
}
```

#### TailwindCSS Configuration
```javascript
// tailwind.config.js
import { defineConfig } from '@tailwindcss/postcss';

export default defineConfig({
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: ["light", "dark", "cupcake"],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
  },
});
```

### Database Schema Dettagliato

#### Migrazioni Principali

```php
// 0001_01_01_000000_create_users_table.php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('surname');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');
    $table->date('date_of_birth')->nullable();
    $table->foreignId('role_id')->constrained();
    $table->foreignId('icon_id')->constrained();
    $table->rememberToken();
    $table->timestamps();
});

// 2025_10_18_164950_projects.php
Schema::create('projects', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('poster')->nullable();
    $table->string('video')->nullable();
    $table->foreignId('category_id')->constrained();
    $table->timestamps();
});

// 2025_10_18_165132_c_v.php
Schema::create('c_v', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->string('type')->default('pdf');
    $table->string('file_path');
    $table->string('file_name');
    $table->integer('file_size');
    $table->string('mime_type');
    $table->timestamps();
});
```

### API Resources Dettagliati

#### ProjectResource
```php
class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'poster' => $this->poster,
            'video' => $this->video,
            'category' => [
                'id' => $this->category->id,
                'title' => $this->category->title,
            ],
            'technologies' => $this->technologies->map(function ($tech) {
                return [
                    'id' => $tech->id,
                    'title' => $tech->title,
                    'description' => $tech->description,
                ];
            }),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
```

#### TestimonialResource
```php
class TestimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'author' => $this->getAuthorName(),
            'text' => $this->text,
            'role' => $this->role_company,
            'company' => $this->company,
            'rating' => (int) $this->rating,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
    
    private function getAuthorName(): ?string
    {
        if ($this->author) {
            return $this->author;
        }
        
        if ($this->user) {
            return $this->user->name ?? null;
        }
        
        return null;
    }
}
```

### Middleware Dettagliati

#### HttpCache Middleware
```php
class HttpCache
{
    public function handle(Request $request, Closure $next, int $ttl = 300)
    {
        // Skip caching for non-GET requests
        if (!$request->isMethod('GET')) {
            return $next($request);
        }
        
        $response = $next($request);
        
        // Only cache successful responses
        if ($response->getStatusCode() === 200) {
            $response->headers->set('Cache-Control', "max-age={$ttl}, public");
            $response->headers->set('ETag', md5($response->getContent()));
            $response->headers->set('Last-Modified', gmdate('D, d M Y H:i:s T'));
        }
        
        return $response;
    }
}
```

#### CORS Middleware
```php
class HandleCors
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        $response->headers->set('Access-Control-Max-Age', '86400');
        
        return $response;
    }
}
```

### Frontend Services Dettagliati

#### AuthService
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private token = signal<string | null>(null);
  private user = signal<User | null>(null);
  private http = inject(HttpClient);
  private router = inject(Router);
  
  constructor() {
    this.loadStoredToken();
  }
  
  login(credentials: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(apiUrl('auth/login'), credentials)
      .pipe(
        tap(response => {
          this.setToken(response.token);
          this.user.set(response.user);
        }),
        catchError(this.handleError)
      );
  }
  
  register(data: RegisterDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(apiUrl('auth/register'), data)
      .pipe(
        tap(response => {
          this.setToken(response.token);
          this.user.set(response.user);
        }),
        catchError(this.handleError)
      );
  }
  
  logout(): void {
    this.setToken(null);
    this.user.set(null);
    this.router.navigateByUrl('/accedi');
  }
  
  private setToken(token: string | null): void {
    this.token.set(token);
    
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
  
  private loadStoredToken(): void {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      this.token.set(stored);
    }
  }
}
```

#### ProjectService
```typescript
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  
  list$(page = 1, perPage = 12): Observable<Paginated<Progetto>> {
    const url = apiUrl('projects');
    
    return this.http.get<Paginated<ProjectDto>>(url, { 
      params: { page, per_page: perPage } 
    }).pipe(
      map(response => ({
        ...response,
        data: (response.data ?? []).map(this.dtoToProgetto)
      }))
    );
  }
  
  private dtoToProgetto(dto: ProjectDto): Progetto {
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description ?? '',
      poster: dto.poster ?? '',
      video: dto.video ?? '',
      category: this.extractCategoryName(dto),
      technologies: this.extractTechnologiesString(dto)
    };
  }
  
  private extractCategoryName(dto: ProjectDto): string {
    return dto.category?.title ?? 'Senza categoria';
  }
  
  private extractTechnologiesString(dto: ProjectDto): string {
    return (dto.technologies ?? [])
      .map(t => t.title ?? '')
      .filter(Boolean)
      .join(', ');
  }
}
```

### Interceptors Dettagliati

#### ApiCacheInterceptor
```typescript
@Injectable()
export class ApiCacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, { subject: Subject<HttpEvent<any>>; sub: Subscription | null }>();
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isCacheable = req.method === 'GET' && req.url.includes('/api/') && !req.context.get(CACHE_BYPASS);
    
    if (!isCacheable) {
      return next.handle(req);
    }
    
    const key = req.urlWithParams;
    const ttl = req.context.get(CACHE_TTL);
    
    const cached = this.cache.get(key);
    const now = Date.now();
    const fresh = !!cached && (now - cached.timestamp) < ttl;
    
    // Handle ETag
    let request = req;
    if (cached?.etag) {
      request = req.clone({ setHeaders: { 'If-None-Match': cached.etag } });
    }
    
    // Handle inflight requests
    const inflightExisting = this.inflight.get(key);
    if (inflightExisting) {
      inflightExisting.sub?.unsubscribe();
      this.inflight.delete(key);
    }
    
    const subject = new Subject<HttpEvent<any>>();
    const record = { subject, sub: null as Subscription | null };
    this.inflight.set(key, record);
    
    const network$ = next.handle(request).pipe(
      tap(evt => {
        if (evt instanceof HttpResponse) {
          if (evt.status === 304 && cached) {
            subject.next(cached.response.clone());
            subject.complete();
            return;
          }
          
          const etag = evt.headers.get('ETag') || undefined;
          this.cache.set(key, { 
            timestamp: Date.now(), 
            response: evt.clone(), 
            etag 
          });
        }
      }),
      finalize(() => {
        this.inflight.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    
    record.sub = network$.subscribe({
      next: ev => subject.next(ev),
      error: err => subject.error(err),
      complete: () => subject.complete(),
    });
    
    // SWR: serve cached data immediately, then update
    if (fresh) {
      queueMicrotask(() => subject.next(cached!.response.clone()));
    }
    
    return subject.asObservable();
  }
}
```

### Deployment Dettagliato

#### Vercel Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "public/index.php",
      "use": "@vercel/php",
      "config": {
        "maxDuration": 30
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "public/index.php"
    },
    {
      "src": "/(.*)",
      "dest": "public/index.php"
    }
  ],
  "env": {
    "APP_ENV": "production",
    "APP_DEBUG": "false",
    "LOG_CHANNEL": "stack"
  },
  "functions": {
    "public/index.php": {
      "maxDuration": 30
    }
  }
}
```

#### Environment Variables
```bash
# Backend Environment
APP_NAME="Portfolio Marzio Farina"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.marziofarina.it

# Database
DB_CONNECTION=pgsql
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-password
DB_SSLMODE=require

# Cache
CACHE_STORE=database
SESSION_DRIVER=database

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="your-email@gmail.com"
MAIL_FROM_NAME="Portfolio Marzio Farina"

# Sanctum
SANCTUM_STATEFUL_DOMAINS=marziofarina.it,www.marziofarina.it
```

### Testing Configuration

#### Backend Tests
```php
// tests/Feature/ApiTest.php
class ApiTest extends TestCase
{
    public function test_testimonials_endpoint()
    {
        $response = $this->getJson('/api/testimonials');
        
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'author',
                            'text',
                            'role',
                            'company',
                            'rating'
                        ]
                    ],
                    'meta' => [
                        'current_page',
                        'per_page',
                        'total',
                        'last_page'
                    ]
                ]);
    }
    
    public function test_projects_endpoint()
    {
        $response = $this->getJson('/api/projects');
        
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'title',
                            'description',
                            'poster',
                            'video',
                            'category',
                            'technologies'
                        ]
                    ]
                ]);
    }
}
```

#### Frontend Tests
```typescript
// src/app/services/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should login successfully', () => {
    const mockResponse: AuthResponse = {
      token: 'fake-token',
      user: { id: 1, name: 'Test User', email: 'test@example.com' }
    };
    
    service.login({ email: 'test@example.com', password: 'password' })
      .subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.isAuthenticated()).toBe(true);
      });
    
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
```

### Performance Monitoring

#### Backend Monitoring
```php
// app/Http/Middleware/PerformanceMonitor.php
class PerformanceMonitor
{
    public function handle(Request $request, Closure $next)
    {
        $start = microtime(true);
        $startMemory = memory_get_usage();
        
        $response = $next($request);
        
        $end = microtime(true);
        $endMemory = memory_get_usage();
        
        $duration = ($end - $start) * 1000; // milliseconds
        $memoryUsed = $endMemory - $startMemory;
        
        Log::info('Performance', [
            'url' => $request->url(),
            'method' => $request->method(),
            'duration_ms' => round($duration, 2),
            'memory_used' => $memoryUsed,
            'memory_peak' => memory_get_peak_usage()
        ]);
        
        return $response;
    }
}
```

#### Frontend Monitoring
```typescript
// src/app/core/performance.service.ts
@Injectable({ providedIn: 'root' })
export class PerformanceService {
  measurePageLoad(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        console.log('Performance Metrics:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        });
      });
    }
  }
}
```

---

*Documentazione tecnica aggiornata al 22 Ottobre 2025*
*Versione: 1.0.0*
