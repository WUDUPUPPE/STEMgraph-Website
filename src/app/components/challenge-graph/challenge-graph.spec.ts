import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChallengeGraph } from './challenge-graph';

describe('ChallengeGraph', () => {
  let component: ChallengeGraph;
  let fixture: ComponentFixture<ChallengeGraph>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeGraph],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeGraph);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
