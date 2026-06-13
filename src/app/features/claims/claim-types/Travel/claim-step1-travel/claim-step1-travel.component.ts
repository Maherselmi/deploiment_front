import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {ClaimData, ClaimService, Policy} from "../../../data-access/claim.service";

interface NavItem {
  label: string;
  route: string;
}

interface SupportTip {
  title: string;
  text: string;
}

@Component({
  selector: 'app-claim-step1-travel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './claim-step1-travel.component.html',
  styleUrls: ['./claim-step1-travel.component.css'],
  host: { ngSkipHydration: 'true' }
})
export class ClaimStep1TravelComponent implements OnInit {
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  travelClaimTypes = [
    { value: 'ANNULATION_VOYAGE', label: 'Annulation de voyage' },
    { value: 'RETARD_VOL', label: 'Retard de vol' },
    { value: 'PERTE_BAGAGES', label: 'Perte de bagages' },
    { value: 'VOL_BAGAGES', label: 'Vol de bagages' },
    { value: 'FRAIS_MEDICAUX_ETRANGER', label: 'Frais médicaux à l’étranger' },
    { value: 'RAPATRIEMENT', label: 'Rapatriement' },
    { value: 'INTERRUPTION_SEJOUR', label: 'Interruption du séjour' }
  ];

  supportTips: SupportTip[] = [
    {
      title: 'Décrivez l’incident',
      text: 'Indiquez le lieu, la date, le pays concerné et les circonstances du problème.'
    },
    {
      title: 'Contrat vérifié',
      text: 'Votre garantie voyage est contrôlée avant le passage à l’étape suivante.'
    },
    {
      title: 'Justificatifs utiles',
      text: 'Préparez billets, factures, attestations de retard, déclaration de perte ou rapport officiel.'
    }
  ];

  claim: ClaimData = {
    policyId: null,
    clientId: null,
    incidentDate: '',
    type: '',
    description: ''
  };

  policies: Policy[] = [];
  selectedPolicy: Policy | null = null;

  loadingPolicies = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private claimService: ClaimService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  isActiveNav(route: string): boolean {
    const currentUrl = this.router.url;

    if (route === '/Claim_Home') {
      return (
        currentUrl.startsWith('/Claim_Home') ||
        currentUrl.startsWith('/claim') ||
        currentUrl.startsWith('/Sante') ||
        currentUrl.startsWith('/Habitation') ||
        currentUrl.startsWith('/Life') ||
        currentUrl.startsWith('/Travel')
      );
    }

    return currentUrl === route;
  }

  loadPolicies(): void {
    this.loadingPolicies = true;
    this.errorMessage = '';

    const email = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('email')?.toLowerCase().trim()
      : null;

    if (!email) {
      this.loadingPolicies = false;
      this.errorMessage = 'Utilisateur non identifié. Veuillez vous reconnecter.';
      return;
    }

    this.claimService.getPolicies().subscribe({
      next: (res) => {
        const allPolicies = res || [];

        this.policies = allPolicies.filter((p) => {
          const policyType = this.normalizeType(p.type);
          const clientEmail = p.client?.email?.toLowerCase().trim();

          return (
            (policyType === 'TRAVEL' || policyType === 'VOYAGE') &&
            clientEmail === email &&
            this.isPolicyActive(p)
          );
        });

        this.loadingPolicies = false;
      },
      error: (err) => {
        this.loadingPolicies = false;
        this.errorMessage = 'Erreur lors du chargement des polices voyage.';
        console.error('Erreur chargement polices voyage:', err);
      }
    });
  }

  onPolicyChange(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.selectedPolicy =
      this.policies.find((p) => p.id === Number(this.claim.policyId)) || null;

    if (!this.selectedPolicy) {
      this.claim.clientId = null;
      return;
    }

    if (this.selectedPolicy.client?.id) {
      this.claim.clientId = this.selectedPolicy.client.id;
    } else {
      this.claim.clientId = null;
      this.errorMessage = 'Client introuvable pour cette police.';
      return;
    }

    const type = this.normalizeType(this.selectedPolicy.type);

    if (type !== 'TRAVEL' && type !== 'VOYAGE') {
      this.errorMessage = 'Veuillez sélectionner une police voyage valide.';
      this.selectedPolicy = null;
      this.claim.policyId = null;
      this.claim.clientId = null;
      return;
    }

    if (!this.isPolicyActive(this.selectedPolicy)) {
      this.errorMessage = 'Cette police voyage est expirée ou inactive.';
    }
  }

  validate(): boolean {
    this.errorMessage = '';

    if (!this.claim.policyId) {
      this.errorMessage = 'Veuillez sélectionner une police voyage.';
      return false;
    }

    if (!this.selectedPolicy) {
      this.errorMessage = 'Veuillez sélectionner une police valide.';
      return false;
    }

    const type = this.normalizeType(this.selectedPolicy.type);

    if (type !== 'TRAVEL' && type !== 'VOYAGE') {
      this.errorMessage = 'La police choisie doit être de type VOYAGE.';
      return false;
    }

    if (!this.isPolicyActive(this.selectedPolicy)) {
      this.errorMessage = 'La police sélectionnée n’est pas active.';
      return false;
    }

    if (!this.claim.clientId) {
      this.errorMessage = 'Client introuvable.';
      return false;
    }

    if (!this.claim.incidentDate) {
      this.errorMessage = 'La date de l’incident est obligatoire.';
      return false;
    }

    const incidentDate = new Date(this.claim.incidentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (incidentDate > today) {
      this.errorMessage = 'La date ne peut pas être dans le futur.';
      return false;
    }

    if (
      this.selectedPolicy.startDate &&
      incidentDate < new Date(this.selectedPolicy.startDate)
    ) {
      this.errorMessage =
        'La date du sinistre est antérieure au début de validité de la police.';
      return false;
    }

    if (
      this.selectedPolicy.endDate &&
      incidentDate > new Date(this.selectedPolicy.endDate)
    ) {
      this.errorMessage =
        'La date du sinistre dépasse la fin de validité de la police.';
      return false;
    }

    if (!this.claim.type || !this.claim.type.trim()) {
      this.errorMessage = 'Le type de sinistre voyage est obligatoire.';
      return false;
    }

    if (!this.claim.description || this.claim.description.trim().length < 10) {
      this.errorMessage = 'La description doit contenir au moins 10 caractères.';
      return false;
    }

    return true;
  }

  next(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validate()) return;

    this.loading = true;

    const payload: ClaimData = {
      policyId: this.claim.policyId ? Number(this.claim.policyId) : null,
      clientId: this.claim.clientId ? Number(this.claim.clientId) : null,
      incidentDate: this.claim.incidentDate,
      type: this.claim.type.trim().toUpperCase(),
      description: this.claim.description.trim()
    };

    this.claimService.createClaim(payload).subscribe({
      next: (res) => {
        this.loading = false;

        if (isPlatformBrowser(this.platformId) && res?.id) {
          localStorage.setItem('claimId', res.id.toString());
        }

        this.successMessage = 'Dossier voyage créé avec succès. Redirection en cours...';

        setTimeout(() => {
          this.router.navigate(['/Travel/step2']);
        }, 900);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.message || 'Erreur serveur lors de la création du dossier.';
        console.error('Erreur création claim voyage:', err);
      }
    });
  }

  getSelectedPolicyPeriod(): string {
    if (!this.selectedPolicy?.startDate || !this.selectedPolicy?.endDate) {
      return '-';
    }

    return `${this.formatDate(this.selectedPolicy.startDate)} → ${this.formatDate(this.selectedPolicy.endDate)}`;
  }

  getSelectedPolicyStatus(): string {
    if (!this.selectedPolicy) return '-';
    return this.isPolicyActive(this.selectedPolicy) ? 'Active' : 'Inactive';
  }

  formatDate(date: string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;

    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  goToClaimsHome(): void {
    this.router.navigate(['/Claim_Home']);
  }

  private normalizeType(type: string | undefined | null): string {
    return (type || '').trim().toUpperCase();
  }

  private isPolicyActive(policy: Policy): boolean {
    if (!policy?.startDate || !policy?.endDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(policy.startDate);
    const end = new Date(policy.endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return today >= start && today <= end;
  }
}
