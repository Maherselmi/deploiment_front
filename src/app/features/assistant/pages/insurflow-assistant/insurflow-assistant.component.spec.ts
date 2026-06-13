import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsurflowAssistantComponent } from './insurflow-assistant.component';

describe('InsurflowAssistantComponent', () => {
  let component: InsurflowAssistantComponent;
  let fixture: ComponentFixture<InsurflowAssistantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsurflowAssistantComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InsurflowAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
