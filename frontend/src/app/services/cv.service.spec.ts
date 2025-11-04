import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpResponse } from '@angular/common/http';
import { CvService } from './cv.service';

/**
 * Test CVService
 */
describe('CvService', () => {
  let service: CvService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CvService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(CvService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('dovrebbe creare il servizio', () => {
    expect(service).toBeTruthy();
  });

  describe('get$()', () => {
    it('dovrebbe recuperare CV con education e experience', (done) => {
      const mockResponse = {
        education: [
          { title: 'Laurea', years: '2015-2019', description: 'Computer Science' },
          { title: 'Master', years: '2019-2021', description: 'Software Engineering' }
        ],
        experience: [
          { title: 'Developer', years: '2021-2023', description: 'Full Stack Dev' }
        ]
      };

      service.get$().subscribe(cv => {
        expect(cv.education.length).toBe(2);
        expect(cv.experience.length).toBe(1);
        expect(cv.education[0].title).toBe('Laurea');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv'));
      expect(req.request.method).toBe('GET');
      
      // Flush con HttpResponse per supportare observe: 'events'
      req.event(new HttpResponse({ body: mockResponse }));
    });

    it('dovrebbe filtrare per userId se fornito', (done) => {
      service.get$(55).subscribe(() => done());

      const req = httpMock.expectOne(req => req.url.includes('/cv'));
      expect(req.request.params.get('user_id')).toBe('55');
      
      req.event(new HttpResponse({ body: { education: [], experience: [] } }));
    });

    it('dovrebbe gestire description null', (done) => {
      const mockResponse = {
        education: [
          { title: 'Test', years: '2020', description: null }
        ],
        experience: []
      };

      service.get$().subscribe(cv => {
        expect(cv.education[0].description).toBe('');
        done();
      });

      const req = httpMock.expectOne(req => req.url.includes('/cv'));
      req.event(new HttpResponse({ body: mockResponse }));
    });
  });
});

