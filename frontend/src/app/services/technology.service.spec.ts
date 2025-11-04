import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TechnologyService } from './technology.service';

describe('TechnologyService', () => {
  let service: TechnologyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TechnologyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe recuperare lista tecnologie', (done) => {
    const mock = [
      { id: 1, name: 'Angular' },
      { id: 2, name: 'TypeScript' }
    ];

    service.list$().subscribe(techs => {
      expect(techs.length).toBe(2);
      done();
    });

    httpMock.expectOne(req => req.url.includes('/technologies')).flush(mock);
  });
});

