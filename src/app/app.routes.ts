import { Routes } from '@angular/router';
import {
  InsurflowAssistantComponent
} from "./features/assistant/pages/insurflow-assistant/insurflow-assistant.component";
import {ClaimStep1LifeComponent} from "./features/claims/claim-types/Life/claim-step1-life/claim-step1-life.component";
import {ClaimStep2LifeComponent} from "./features/claims/claim-types/Life/claim-step2-life/claim-step2-life.component";
import {ClaimStep3LifeComponent} from "./features/claims/claim-types/Life/claim-step3-life/claim-step3-life.component";
import {
  ClaimStep1TravelComponent
} from "./features/claims/claim-types/Travel/claim-step1-travel/claim-step1-travel.component";
import {
  ClaimStep2TravelComponent
} from "./features/claims/claim-types/Travel/claim-step2-travel/claim-step2-travel.component";
import {
  ClaimStep3TravelComponent
} from "./features/claims/claim-types/Travel/claim-step3-travel/claim-step3-travel.component";
import {PolicesComponent} from "./features/policies/pages/polices/polices.component";
import {ClaimsHomeComponent} from "./features/claims/pages/claims-home/claims-home.component";
import {AdminClaimReportsComponent} from "./features/claims/pages/admin-claim-reports/admin-claim-reports.component";
import {ParametresIaComponent} from "./features/ai-settings/pages/parametres-ia/parametres-ia.component";
import {ExpertSpaceComponent} from "./features/experts/pages/expert-space/expert-space.component";
import {FeedbackClaimsListComponent} from "./features/claims/pages/feedback-claims-list/feedback-claims-list.component";
import {
  ExpertFeedbackFormComponent
} from "./features/experts/pages/expert-feedback-form/expert-feedback-form.component";
import {ClientSpaceComponent} from "./features/clients/pages/client-space/client-space.component";
import {ClaimReportPageComponent} from "./features/claims/pages/claim-report-page/claim-report-page.component";
import {LoginComponent} from "./features/auth/login/login.component";
import {
  ConsultationDecisionsComponent
} from "./features/decisions/pages/consultation-decisions/consultation-decisions.component";
import {
  ClaimStep3HabitationComponent
} from "./features/claims/claim-types/Habitation/claim-step3-habitation/claim-step3-habitation.component";
import {
  ClaimStep2HabitationComponent
} from "./features/claims/claim-types/Habitation/claim-step2-habitation/claim-step2-habitation.component";
import {
  ClaimStep1HabitationComponent
} from "./features/claims/claim-types/Habitation/claim-step1-habitation/claim-step1-habitation.component";
import {
  ClaimStep3SanteComponent
} from "./features/claims/claim-types/Sante/claim-step3-sante/claim-step3-sante.component";
import {
  ClaimStep2SanteComponent
} from "./features/claims/claim-types/Sante/claim-step2-sante/claim-step2-sante.component";
import {
  ClaimStep1SanteComponent
} from "./features/claims/claim-types/Sante/claim-step1-sante/claim-step1-sante.component";
import {ClientListComponent} from "./features/clients/pages/client-list/client-list.component";
import {PolicyListComponent} from "./features/policies/pages/policy-list/policy-list.component";
import {AgentResultListComponent} from "./features/agents/pages/agent-result-list/agent-result-list.component";
import {InsuranceHomeComponent} from "./features/home/pages/insurance-home/insurance-home.component";
import {DashboardComponent} from "./features/dashboard/pages/dashboard/dashboard.component";
import {DossierSinistreComponent} from "./features/claims/pages/dossier-sinistre/dossier-sinistre.component";
import {ClaimStep1Component} from "./features/claims/claim-types/Auto/claim-step1/claim-step1.component";
import {ClaimStep2Component} from "./features/claims/claim-types/Auto/claim-step2/claim-step2.component";
import {ClaimStep3Component} from "./features/claims/claim-types/Auto/claim-step3/claim-step3.component";
import {RegisterClientComponent} from "./features/register-client/register-client.component";



export const routes: Routes = [

  { path: 'chatbot', component: InsurflowAssistantComponent },
  { path: 'Register', component: RegisterClientComponent },

  { path: 'Life/step1', component: ClaimStep1LifeComponent },
  { path: 'Life/step2', component: ClaimStep2LifeComponent },
  { path: 'Life/step3', component: ClaimStep3LifeComponent },


  { path: 'travel/step1', component: ClaimStep1TravelComponent },
  { path: 'travel/step2', component: ClaimStep2TravelComponent },
  { path: 'travel/step3', component: ClaimStep3TravelComponent },


  { path: 'PolicesList', component: PolicesComponent },
  { path: 'Claim_Home', component: ClaimsHomeComponent },
  { path: 'rapport', component:AdminClaimReportsComponent },

  { path: 'ia_param', component: ParametresIaComponent },
  { path: 'expert-space', component:ExpertSpaceComponent },

  { path: 'feedback-claims', component: FeedbackClaimsListComponent },
  { path: 'expert-feedback/:claimId', component: ExpertFeedbackFormComponent },
  { path: 'Client_Space', component: ClientSpaceComponent },
  {path: 'claim-report/:id', component: ClaimReportPageComponent},

  { path: 'login', component: LoginComponent },
  { path: 'Consulter', component: ConsultationDecisionsComponent },

  { path: 'Habitation/step3', component: ClaimStep3HabitationComponent },
  { path: 'Habitation/step2', component: ClaimStep2HabitationComponent },
  { path: 'Habitation/step1', component: ClaimStep1HabitationComponent },

  { path: 'Sante/step3', component: ClaimStep3SanteComponent },
  { path: 'Sante/step2', component: ClaimStep2SanteComponent },
  { path: 'Sante/step1', component: ClaimStep1SanteComponent },

  { path: 'clients', component: ClientListComponent },
  { path: 'polices', component: PolicyListComponent },
  { path: 'agents', component: AgentResultListComponent },

  { path: '', component: InsuranceHomeComponent },

  { path: 'dashboard', component: DashboardComponent },
  { path: 'dossiers', component: DossierSinistreComponent },

  {
    path: 'claim',
    children: [
      { path: 'step1', component: ClaimStep1Component },
      { path: 'step2', component: ClaimStep2Component },
      { path: 'step3', component: ClaimStep3Component }
    ]
  },

  { path: '**', redirectTo: '' }
];
