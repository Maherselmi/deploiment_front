import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimStep1TravelComponent } from './claim-step1-travel.component';

describe('ClaimStep1TravelComponent', () => {
  let component: ClaimStep1TravelComponent;
  let fixture: ComponentFixture<ClaimStep1TravelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimStep1TravelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClaimStep1TravelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
