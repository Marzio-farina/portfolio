import { ComponentFixture, TestBed } from '@angular/core/testing';
import { COMMON_TEST_PROVIDERS } from '../../../testing/test-utils';
import { Avatar } from './avatar';

describe('Avatar', () => {
  let component: Avatar;
  let fixture: ComponentFixture<Avatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Avatar],
      providers: COMMON_TEST_PROVIDERS
    })
    .compileComponents();

    fixture = TestBed.createComponent(Avatar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
