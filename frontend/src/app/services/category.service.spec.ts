import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe recuperare lista categorie', (done) => {
    const mock = [
      { id: 1, title: 'Web', description: 'Web apps' },
      { id: 2, title: 'Mobile', description: 'Mobile apps' }
    ];

    service.list$().subscribe(cats => {
      expect(cats.length).toBe(2);
      expect(cats[0].title).toBe('Web');
      done();
    });

    httpMock.expectOne(req => req.url.includes('/categories')).flush(mock);
  });
});

