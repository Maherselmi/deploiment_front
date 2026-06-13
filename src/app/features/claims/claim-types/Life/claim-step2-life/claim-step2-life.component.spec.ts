import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimStep2LifeComponent } from './claim-step2-life.component';

describe('ClaimStep2LifeComponent', () => {
  let component: ClaimStep2LifeComponent;
  let fixture: ComponentFixture<ClaimStep2LifeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimStep2LifeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClaimStep2LifeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
