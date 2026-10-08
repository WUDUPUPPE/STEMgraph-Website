import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Keywords } from './keywords';

describe('Keywords', () => {
  let component: Keywords;
  let fixture: ComponentFixture<Keywords>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Keywords],
    }).compileComponents();

    fixture = TestBed.createComponent(Keywords);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
