import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodeDetailCarousel } from './node-detail-carousel';

describe('NodeDetailCarousel', () => {
    let component: NodeDetailCarousel;
    let fixture: ComponentFixture<NodeDetailCarousel>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NodeDetailCarousel],
        }).compileComponents();

        fixture = TestBed.createComponent(NodeDetailCarousel);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
