import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimStep2TravelComponent } from './claim-step2-travel.component';

describe('ClaimStep2TravelComponent', () => {
  let component: ClaimStep2TravelComponent;
  let fixture: ComponentFixture<ClaimStep2TravelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimStep2TravelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClaimStep2TravelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
