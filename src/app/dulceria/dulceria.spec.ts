import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dulceria } from './dulceria';

describe('Dulceria', () => {
  let component: Dulceria;
  let fixture: ComponentFixture<Dulceria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dulceria],
    }).compileComponents();

    fixture = TestBed.createComponent(Dulceria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
