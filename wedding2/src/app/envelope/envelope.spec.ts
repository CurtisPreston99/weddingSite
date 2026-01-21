import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Envelope } from './envelope';

describe('Envelope', () => {
  let component: Envelope;
  let fixture: ComponentFixture<Envelope>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Envelope]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Envelope);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
