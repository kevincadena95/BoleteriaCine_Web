import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Boleteria } from './boleteria';

describe('Boleteria', () => {
  let component: Boleteria;
  let fixture: ComponentFixture<Boleteria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Boleteria],
    }).compileComponents();

    fixture = TestBed.createComponent(Boleteria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
