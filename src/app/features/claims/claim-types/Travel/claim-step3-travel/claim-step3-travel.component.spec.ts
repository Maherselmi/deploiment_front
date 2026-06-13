import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimStep3TravelComponent } from './claim-step3-travel.component';

describe('ClaimStep3TravelComponent', () => {
  let component: ClaimStep3TravelComponent;
  let fixture: ComponentFixture<ClaimStep3TravelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimStep3TravelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClaimStep3TravelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
