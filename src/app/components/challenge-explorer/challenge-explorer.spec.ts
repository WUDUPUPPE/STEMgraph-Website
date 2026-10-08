import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChallengeExplorer } from './challenge-explorer';

describe('ChallengeExplorer', () => {
  let component: ChallengeExplorer;
  let fixture: ComponentFixture<ChallengeExplorer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeExplorer],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeExplorer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
