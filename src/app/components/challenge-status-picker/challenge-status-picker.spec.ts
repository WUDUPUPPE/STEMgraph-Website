import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChallengeStatusPicker } from './challenge-status-picker';

describe('ChallengeStatusPicker', () => {
  let component: ChallengeStatusPicker;
  let fixture: ComponentFixture<ChallengeStatusPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeStatusPicker],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeStatusPicker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
