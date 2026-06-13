import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminClaimReportsComponent } from './admin-claim-reports.component';

describe('AdminClaimReportsComponent', () => {
  let component: AdminClaimReportsComponent;
  let fixture: ComponentFixture<AdminClaimReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminClaimReportsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminClaimReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
