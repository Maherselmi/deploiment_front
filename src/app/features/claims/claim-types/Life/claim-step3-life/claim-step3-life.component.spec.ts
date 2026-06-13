import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimStep3LifeComponent } from './claim-step3-life.component';

describe('ClaimStep3LifeComponent', () => {
  let component: ClaimStep3LifeComponent;
  let fixture: ComponentFixture<ClaimStep3LifeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimStep3LifeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClaimStep3LifeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
