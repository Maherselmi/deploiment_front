// Importation des modules Angular nécessaires au composant
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {ClaimData, ClaimService, Policy} from "../../../data-access/claim.service";

// Importation du service de gestion des sinistres et des modèles utilisés


// Interface représentant un élément de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Interface représentant un conseil affiché dans l’étape de déclaration
interface StepTip {
  title: string;
  text: string;
}

// Déclaration du composant Angular responsable de la première étape de déclaration d’un sinistre auto
@Component({
  selector: 'app-claim-step1',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './claim-step1.component.html',
  styleUrls: ['./claim-step1.component.css'],
  host: { ngSkipHydration: 'true' }
})
export class ClaimStep1Component implements OnInit {

  // Liste des liens de navigation affichés dans l’interface client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/contrats' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste des types de sinistres auto proposés à l’utilisateur
  autoClaimTypes = [
    { value: 'ACCIDENT_RESPONSABLE', label: 'Accident responsable' },
    { value: 'ACCIDENT_NON_RESPONSABLE', label: 'Accident non responsable' },
    { value: 'BRIS_GLACE', label: 'Bris de glace' },
    { value: 'INCENDIE', label: 'Incendie / Explosion' },
    { value: 'VOL', label: 'Vol / Vandalisme' },
    { value: 'CATASTROPHE', label: 'Catastrophe naturelle' }
  ];

  // Liste des conseils affichés pour guider l’utilisateur pendant la déclaration
  stepTips: StepTip[] = [
    {
      title: 'Déclarez rapidement',
      text: 'Renseignez les informations essentielles de l’accident pour lancer le dossier.'
    },
    {
      title: 'Police vérifiée',
      text: 'Votre contrat auto est contrôlé avant de passer à l’étape suivante.'
    },
    {
      title: 'Parcours guidé',
      text: 'Chaque étape est pensée pour rendre la déclaration plus simple.'
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

  // Liste des polices auto disponibles et police actuellement sélectionnée
  policies: Policy[] = [];
  selectedPolicy: Policy | null = null;

  // Variables utilisées pour gérer les états de chargement et les messages utilisateur
  loadingPolicies = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Injection du service de sinistre, du routeur Angular et de PLATFORM_ID pour vérifier l’environnement navigateur
  constructor(
    private claimService: ClaimService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle permet de charger les polices auto du client connecté
  ngOnInit(): void {
    this.loadPolicies();
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  // Elle gère aussi les routes liées aux différentes catégories de sinistres
  isActiveNav(route: string): boolean {
    const currentUrl = this.router.url;

    if (route === '/Claim_Home') {
      return (
        currentUrl.startsWith('/Claim_Home') ||
        currentUrl.startsWith('/claim') ||
        currentUrl.startsWith('/Sante') ||
        currentUrl.startsWith('/Habitation')
      );
    }

    return currentUrl === route;
  }

  // Méthode responsable du chargement des polices auto du client connecté
  // Elle récupère l’email depuis le localStorage puis filtre les contrats actifs de type AUTO
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
            policyType === 'AUTO' &&
            clientEmail === email &&
            this.isPolicyActive(p)
          );
        });

        this.loadingPolicies = false;
      },
      error: (err) => {
        this.loadingPolicies = false;
        this.errorMessage = 'Erreur lors du chargement des polices auto.';
        console.error('Erreur chargement polices auto:', err);
      }
    });
  }

  // Méthode appelée lorsque l’utilisateur sélectionne une police d’assurance
  // Elle met à jour la police choisie, récupère le client associé et vérifie la validité du contrat
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

    if (this.normalizeType(this.selectedPolicy.type) !== 'AUTO') {
      this.errorMessage = 'Veuillez sélectionner une police auto valide.';
      this.selectedPolicy = null;
      this.claim.policyId = null;
      this.claim.clientId = null;
      return;
    }

    if (!this.isPolicyActive(this.selectedPolicy)) {
      this.errorMessage = 'Cette police auto est expirée ou inactive.';
    }
  }

  // Méthode permettant de valider les données du formulaire avant création du dossier
  // Elle vérifie la police, le client, la date du sinistre, le type et la description
  validate(): boolean {
    this.errorMessage = '';

    if (!this.claim.policyId) {
      this.errorMessage = 'Veuillez sélectionner une police auto.';
      return false;
    }

    if (!this.selectedPolicy) {
      this.errorMessage = 'Veuillez sélectionner une police valide.';
      return false;
    }

    if (this.normalizeType(this.selectedPolicy.type) !== 'AUTO') {
      this.errorMessage = 'La police choisie doit être de type AUTO.';
      return false;
    }

    if (!this.isPolicyActive(this.selectedPolicy)) {
      this.errorMessage = 'La police sélectionnée n’est pas active.';
      return false;
    }

    if (!this.claim.clientId) {
      this.errorMessage = 'Client introuvable pour cette police.';
      return false;
    }

    if (!this.claim.incidentDate) {
      this.errorMessage = 'La date du sinistre est obligatoire.';
      return false;
    }

    const incidentDate = new Date(this.claim.incidentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (incidentDate > today) {
      this.errorMessage = 'La date du sinistre ne peut pas être dans le futur.';
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
      this.errorMessage = 'Le type de sinistre est obligatoire.';
      return false;
    }

    if (!this.claim.description || this.claim.description.trim().length < 10) {
      this.errorMessage = 'La description doit contenir au moins 10 caractères.';
      return false;
    }

    return true;
  }

  // Méthode appelée pour passer à l’étape suivante
  // Elle valide le formulaire, crée le dossier de sinistre, sauvegarde son identifiant puis redirige vers l’étape 2
  next(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validate()) {
      return;
    }

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

        this.successMessage = 'Dossier auto créé avec succès. Redirection en cours...';

        setTimeout(() => {
          this.router.navigate(['/claim/step2']);
        }, 900);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.message || 'Erreur serveur lors de la création du dossier.';
        console.error('Erreur création claim auto:', err);
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
    if (!this.selectedPolicy) {
      return '-';
    }

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

  // Méthode privée permettant de normaliser le type d’une police
  // Elle évite les problèmes liés aux espaces ou à la casse
  private normalizeType(type: string | undefined | null): string {
    return (type || '').trim().toUpperCase();
  }

  // Méthode privée permettant de vérifier si une police est actuellement active
  // Une police est active si la date du jour est comprise entre sa date de début et sa date de fin
  private isPolicyActive(policy: Policy): boolean {
    if (!policy?.startDate || !policy?.endDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(policy.startDate);
    const end = new Date(policy.endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return today >= start && today <= end;
  }
}
