import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Graph3d } from './graph3d';

describe('Graph3d', () => {
  let component: Graph3d;
  let fixture: ComponentFixture<Graph3d>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Graph3d],
    }).compileComponents();

    fixture = TestBed.createComponent(Graph3d);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
