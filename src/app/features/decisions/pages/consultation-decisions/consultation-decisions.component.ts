// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

// Importation des services nécessaires pour les dossiers et l’authentification
import { ClaimService } from "../../../claims/data-access/claim.service";
import { AuthService } from "../../../../core/auth/auth.service";

// Importation du modèle représentant un dossier de sinistre
import { Claim } from "../../../claims/models/claim.model";


// Interface représentant un lien de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Déclaration du composant Angular responsable de la consultation
// des décisions et dossiers de sinistre du client connecté
@Component({
  selector: 'app-consultation-decisions',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './consultation-decisions.component.html',
  styleUrls: ['./consultation-decisions.component.css']
})
export class ConsultationDecisionsComponent implements OnInit {

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste complète des dossiers récupérés depuis le backend
  allClaims: Claim[] = [];

  // Liste des dossiers appartenant uniquement au client connecté
  claims: Claim[] = [];

  // Variables utilisées pour gérer l’état de chargement et les erreurs
  loading = true;
  errorMessage = '';

  // Injection du service des sinistres, du service d’authentification et du routeur Angular
  constructor(
    private claimService: ClaimService,
    private authService: AuthService,
    private router: Router
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle vérifie l’authentification, récupère l’email du client, puis charge ses dossiers
  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const email = this.getStoredEmail();

    if (!email) {
      this.loading = false;
      this.errorMessage = 'Utilisateur non identifié. Veuillez vous reconnecter.';
      return;
    }

    this.loadClaims(email);
  }

  // Méthode responsable du chargement des dossiers depuis le backend
  // Elle filtre ensuite les dossiers pour afficher seulement ceux du client connecté
  loadClaims(email: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.claimService.getAllClaims().subscribe({
      next: (data) => {
        this.allClaims = data || [];

        const connectedEmail = email.toLowerCase().trim();

        this.claims = this.allClaims.filter((claim) => {
          const policyClientEmail = claim.policy?.client?.email
            ?.toLowerCase()
            .trim();

          const directClientEmail = (claim as any).client?.email
            ?.toLowerCase()
            .trim();

          return (
            policyClientEmail === connectedEmail ||
            directClientEmail === connectedEmail
          );
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des dossiers :', err);
        this.errorMessage = 'Impossible de charger vos dossiers.';
        this.loading = false;
      }
    });
  }

  // Méthode permettant de récupérer l’email de l’utilisateur depuis le localStorage
  getStoredEmail(): string | null {
    return localStorage.getItem('email');
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  isActiveNav(route: string): boolean {
    return this.router.url === route;
  }

  // Getter qui retourne le nombre total de dossiers du client connecté
  get totalClaims(): number {
    return this.claims.length;
  }

  // Getter qui retourne le nombre de dossiers approuvés
  get approvedClaims(): number {
    return this.claims.filter((claim) => claim.status === 'APPROVED').length;
  }

  // Getter qui retourne le nombre de dossiers encore en cours de traitement
  get pendingClaims(): number {
    return this.claims.filter(
      (claim) =>
        claim.status === 'PENDING_VALIDATION' ||
        claim.status === 'IN_ANALYSIS' ||
        claim.status === 'SUBMITTED'
    ).length;
  }

  // Getter qui retourne le nombre de dossiers rejetés
  get rejectedClaims(): number {
    return this.claims.filter((claim) => claim.status === 'REJECTED').length;
  }

  // Getter qui retourne le nombre de dossiers clôturés
  get closedClaims(): number {
    return this.claims.filter((claim) => claim.status === 'CLOSED').length;
  }

  // Getter qui retourne les dossiers triés du plus récent au plus ancien selon leur identifiant
  get sortedClaims(): Claim[] {
    return [...this.claims].sort((a, b) => {
      return (b.id || 0) - (a.id || 0);
    });
  }

  // Méthode qui transforme le statut technique d’un dossier en libellé lisible
  formatStatus(status: string): string {
    const map: Record<string, string> = {
      SUBMITTED: 'Soumis',
      IN_ANALYSIS: 'En analyse',
      PENDING_VALIDATION: 'En attente',
      APPROVED: 'Approuvé',
      REJECTED: 'Rejeté',
      CLOSED: 'Clôturé'
    };

    return map[status] || status;
  }

  // Méthode qui retourne la classe CSS associée au statut du dossier
  // Elle permet d’afficher une apparence différente selon l’état du sinistre
  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'approved';

      case 'REJECTED':
        return 'rejected';

      case 'PENDING_VALIDATION':
      case 'IN_ANALYSIS':
        return 'pending';

      case 'CLOSED':
        return 'closed';

      default:
        return 'submitted';
    }
  }

  // Méthode permettant de récupérer le nom complet du client associé au dossier
  // Si les informations sont absentes, une valeur par défaut est retournée
  getClientFullName(claim: Claim): string {
    const firstName = claim.policy?.client?.firstName || '';
    const lastName = claim.policy?.client?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || 'Client non renseigné';
  }

  // Méthode qui retourne la classe CSS associée au type de contrat du dossier
  // Elle permet de personnaliser l’apparence selon le type : auto, santé ou habitation
  getClaimTone(claim: Claim): string {
    const type = (claim.policy?.type || '').toUpperCase();

    switch (type) {
      case 'AUTO':
        return 'tone-auto';

      case 'SANTE':
        return 'tone-health';

      case 'HABITATION':
        return 'tone-home';

      default:
        return 'tone-default';
    }
  }

  // Méthode permettant d’ouvrir la page de rapport détaillé d’un dossier
  goToReport(claim: Claim): void {
    this.router.navigate(['/claim-report', claim.id]);
  }

  // Méthode permettant de naviguer vers la page d’accueil
  goToHome(): void {
    this.router.navigate(['/']);
  }

  // Méthode permettant de naviguer vers la page de consultation des dossiers
  goToDecisions(): void {
    this.router.navigate(['/Consulter']);
  }

  // Méthode permettant de naviguer vers la liste des polices d’assurance
  goToPolice(): void {
    this.router.navigate(['/PolicesList']);
  }

  // Méthode permettant de naviguer vers la page principale des sinistres
  goToClaimsHome(): void {
    this.router.navigate(['/Claim_Home']);
  }

  // Méthode permettant de déconnecter le client puis de le rediriger vers la page de connexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
