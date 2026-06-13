// Importation des modules Angular nécessaires au composant
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Importation du service de gestion des sinistres et des modèles utilisés
import { ClaimData, ClaimService, Policy } from "../../../data-access/claim.service";


// Interface représentant un lien de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Interface représentant un conseil affiché dans l’interface de déclaration
interface SupportTip {
  title: string;
  text: string;
}

// Déclaration du composant Angular responsable de la première étape
// de déclaration d’un sinistre vie
@Component({
  selector: 'app-claim-step1-life',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './claim-step1-life.component.html',
  styleUrls: ['./claim-step1-life.component.css'],
  host: { ngSkipHydration: 'true' }
})
export class ClaimStep1LifeComponent implements OnInit {

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste des types de sinistres vie proposés à l’utilisateur
  lifeClaimTypes = [
    { value: 'DECES', label: 'Décès' },
    { value: 'INVALIDITE', label: 'Invalidité' },
    { value: 'INCAPACITE', label: 'Incapacité de travail' },
    { value: 'MALADIE_GRAVE', label: 'Maladie grave' },
    { value: 'CAPITAL_VIE', label: 'Demande de capital assuré' },
    { value: 'RENTE', label: 'Demande de rente' }
  ];

  // Liste des conseils affichés pour guider l’utilisateur
  // pendant la déclaration d’un sinistre vie
  supportTips: SupportTip[] = [
    {
      title: 'Informations sensibles',
      text: 'Indiquez clairement le contexte du sinistre vie et les personnes concernées.'
    },
    {
      title: 'Contrat vérifié',
      text: 'La couverture vie est contrôlée avant le passage à l’étape suivante.'
    },
    {
      title: 'Pièces justificatives',
      text: 'Préparez les documents nécessaires : acte, certificat, justificatifs ou attestations.'
    }
  ];

  // Objet contenant les informations du sinistre saisies dans le formulaire
  claim: ClaimData = {
    policyId: null,
    clientId: null,
    incidentDate: '',
    type: '',
    description: ''
  };

  // Liste des polices vie disponibles et police actuellement sélectionnée
  policies: Policy[] = [];
  selectedPolicy: Policy | null = null;

  // Variables utilisées pour gérer les états de chargement et les messages utilisateur
  loadingPolicies = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Injection du service de sinistre, du routeur Angular et de PLATFORM_ID
  // PLATFORM_ID permet de vérifier si le code s’exécute côté navigateur
  constructor(
    private claimService: ClaimService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle permet de charger les polices vie du client connecté
  ngOnInit(): void {
    this.loadPolicies();
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  // Elle prend en compte les routes liées aux différentes catégories de sinistres
  isActiveNav(route: string): boolean {
    const currentUrl = this.router.url;

    if (route === '/Claim_Home') {
      return (
        currentUrl.startsWith('/Claim_Home') ||
        currentUrl.startsWith('/claim') ||
        currentUrl.startsWith('/Sante') ||
        currentUrl.startsWith('/Habitation') ||
        currentUrl.startsWith('/Life')
      );
    }

    return currentUrl === route;
  }

  // Méthode responsable du chargement des polices vie du client connecté
  // Elle récupère l’email depuis le localStorage puis filtre les contrats actifs de type LIFE ou VIE
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
            (policyType === 'LIFE' || policyType === 'VIE') &&
            clientEmail === email &&
            this.isPolicyActive(p)
          );
        });

        this.loadingPolicies = false;
      },
      error: (err) => {
        this.loadingPolicies = false;
        this.errorMessage = 'Erreur lors du chargement des polices vie.';
        console.error('Erreur chargement polices vie:', err);
      }
    });
  }

  // Méthode appelée lorsque l’utilisateur sélectionne une police d’assurance
  // Elle met à jour la police choisie, récupère le client associé et vérifie sa validité
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

    if (type !== 'LIFE' && type !== 'VIE') {
      this.errorMessage = 'Veuillez sélectionner une police vie valide.';
      this.selectedPolicy = null;
      this.claim.policyId = null;
      this.claim.clientId = null;
      return;
    }

    if (!this.isPolicyActive(this.selectedPolicy)) {
      this.errorMessage = 'Cette police vie est expirée ou inactive.';
    }
  }

  // Méthode permettant de valider les données du formulaire avant création du dossier
  // Elle vérifie la police, le client, la date de l’événement, le type et la description
  validate(): boolean {
    this.errorMessage = '';

    if (!this.claim.policyId) {
      this.errorMessage = 'Veuillez sélectionner une police vie.';
      return false;
    }

    if (!this.selectedPolicy) {
      this.errorMessage = 'Veuillez sélectionner une police valide.';
      return false;
    }

    const type = this.normalizeType(this.selectedPolicy.type);

    if (type !== 'LIFE' && type !== 'VIE') {
      this.errorMessage = 'La police choisie doit être de type VIE.';
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
      this.errorMessage = 'La date de l’événement est obligatoire.';
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
      this.errorMessage = 'Le type de sinistre vie est obligatoire.';
      return false;
    }

    if (!this.claim.description || this.claim.description.trim().length < 10) {
      this.errorMessage = 'La description doit contenir au moins 10 caractères.';
      return false;
    }

    return true;
  }

  // Méthode appelée pour passer à l’étape suivante
  // Elle valide le formulaire, crée le dossier vie, sauvegarde son identifiant puis redirige vers l’étape 2
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

        this.successMessage = 'Dossier vie créé avec succès. Redirection en cours...';

        setTimeout(() => {
          this.router.navigate(['/Life/step2']);
        }, 900);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.message || 'Erreur serveur lors de la création du dossier.';
        console.error('Erreur création claim vie:', err);
      }
    });
  }

  // Méthode qui retourne la période de validité de la police sélectionnée
  getSelectedPolicyPeriod(): string {
    if (!this.selectedPolicy?.startDate || !this.selectedPolicy?.endDate) {
      return '-';
    }

    return `${this.formatDate(this.selectedPolicy.startDate)} → ${this.formatDate(this.selectedPolicy.endDate)}`;
  }

  // Méthode qui retourne le statut lisible de la police sélectionnée
  getSelectedPolicyStatus(): string {
    if (!this.selectedPolicy) return '-';

    return this.isPolicyActive(this.selectedPolicy) ? 'Active' : 'Inactive';
  }

  // Méthode permettant de formater une date au format français
  formatDate(date: string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;

    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Méthode permettant de retourner vers la page principale des sinistres
  goToClaimsHome(): void {
    this.router.navigate(['/Claim_Home']);
  }

  // Méthode privée permettant de normaliser le type d’une police
  // Elle évite les problèmes liés aux espaces ou à la casse
  private normalizeType(type: string | undefined | null): string {
    return (type || '').trim().toUpperCase();
  }

  // Méthode privée permettant de vérifier si une police est actuellement active
  // Une police est active si la date du jour est comprise entre sa date de début et sa date de fin
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
