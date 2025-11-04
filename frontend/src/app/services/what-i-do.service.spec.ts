import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpResponse } from '@angular/common/http';
import { WhatIDoService } from './what-i-do.service';

describe('WhatIDoService', () => {
  let service: WhatIDoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(WhatIDoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('dovrebbe creare', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe recuperare lista what-i-do items', (done) => {
    const mock = {
      items: [
        { id: 1, title: 'Web Dev', description: 'Build apps', icon: '💻' },
        { id: 2, title: 'Mobile', description: 'Apps', icon: '📱' }
      ]
    };

    service.get$().subscribe(items => {
      expect(items.length).toBe(2);
      expect(items[0].title).toBe('Web Dev');
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('/what-i-do'));
    req.event(new HttpResponse({ body: mock }));
  });

  it('dovrebbe filtrare per userId', (done) => {
    service.get$(77).subscribe(() => done());

    const req = httpMock.expectOne(req => req.url.includes('/what-i-do'));
    expect(req.request.params.get('user_id')).toBe('77');
    req.event(new HttpResponse({ body: { items: [] } }));
  });
});

