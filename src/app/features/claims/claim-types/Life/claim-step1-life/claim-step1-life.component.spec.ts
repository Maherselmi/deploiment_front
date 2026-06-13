import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimStep1LifeComponent } from './claim-step1-life.component';

describe('ClaimStep1LifeComponent', () => {
  let component: ClaimStep1LifeComponent;
  let fixture: ComponentFixture<ClaimStep1LifeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimStep1LifeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ClaimStep1LifeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
