// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

// Importation du modèle représentant un dossier de sinistre
import { Claim } from "../../models/claim.model";

// Importation du service utilisé pour récupérer les dossiers de sinistre
import { ClaimService } from "../../data-access/claim.service";

// Importation du service d’authentification pour gérer la déconnexion
import { AuthService } from "../../../../core/auth/auth.service";


// Interface représentant un lien de navigation dans l’espace expert
interface NavItem {
  label: string;
  route: string;
}

// Déclaration du composant Angular responsable de l’affichage
// des dossiers à traiter par l’expert humain
@Component({
  selector: 'app-feedback-claims-list',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './feedback-claims-list.component.html',
  styleUrls: ['./feedback-claims-list.component.css']
})
export class FeedbackClaimsListComponent implements OnInit {

  // Liste des dossiers de sinistre récupérés depuis le backend
  claims: Claim[] = [];

  // Indique si les dossiers sont encore en cours de chargement
  loading = true;

  // Message affiché en cas d’erreur lors du chargement
  errorMessage = '';

  // Informations de base de l’expert connecté
  expertName = 'Expert';
  expertEmail = '';
  role = '';

  // Liste des liens de navigation affichés dans l’espace expert
  navItems: NavItem[] = [
    { label: 'Espace expert', route: '/expert-space' },
    { label: 'Validation humaine', route: '/feedback-claims' },
  ];

  // Injection du service des dossiers, du routeur et du service d’authentification
  constructor(
    private claimService: ClaimService,
    private router: Router,
    private authService: AuthService,
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle lance la récupération des dossiers de sinistre
  ngOnInit(): void {
    this.loadClaims();
  }

  // Méthode responsable du chargement des dossiers depuis le backend
  // Elle met à jour la liste des dossiers et gère les erreurs éventuelles
  loadClaims(): void {
    this.loading = true;
    this.errorMessage = '';

    this.claimService.getAllClaims().subscribe({
      next: (data) => {
        this.claims = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Erreur lors du chargement des dossiers.';
        this.loading = false;
      }
    });
  }

  // Méthode permettant d’ouvrir la page de feedback d’un dossier précis
  // L’expert est redirigé vers la page de validation humaine du dossier sélectionné
  openFeedback(claimId: number): void {
    this.router.navigate(['/expert-feedback', claimId]);
  }

  // Méthode permettant de récupérer le nom complet du client associé au dossier
  // Si les informations sont absentes, une valeur par défaut est retournée
  getClientFullName(claim: Claim): string {
    const firstName = claim.policy?.client?.firstName || '';
    const lastName = claim.policy?.client?.lastName || '';

    return `${firstName} ${lastName}`.trim() || 'Client non renseigné';
  }

  // Méthode permettant de vérifier si un dossier est en attente de validation humaine
  isPendingValidation(claim: Claim): boolean {
    return claim.status === 'PENDING_VALIDATION';
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  isActiveNav(route: string): boolean {
    return this.router.url === route;
  }

  // Getter qui retourne le nombre total de dossiers
  get totalClaims(): number {
    return this.claims.length;
  }

  // Getter qui retourne le nombre de dossiers en attente de validation humaine
  get pendingClaims(): number {
    return this.claims.filter(claim => claim.status === 'PENDING_VALIDATION').length;
  }

  // Getter qui retourne le nombre de dossiers déjà traités
  get processedClaims(): number {
    return this.claims.filter(claim => claim.status !== 'PENDING_VALIDATION').length;
  }

  // Getter qui retourne un message résumé pour indiquer les dossiers urgents à traiter
  get reviewLabel(): string {
    return this.pendingClaims > 0
      ? `${this.pendingClaims} dossier(s) à traiter`
      : 'Aucun dossier urgent';
  }

  // Méthode qui transforme le statut technique d’un dossier en libellé lisible
  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING_VALIDATION: 'En attente expert',
      APPROVED: 'Approuvé',
      REJECTED: 'Rejeté',
      CLOSED: 'Clôturé',
      IN_ANALYSIS: 'En analyse',
      SUBMITTED: 'Soumis'
    };

    return map[status] || status;
  }

  // Méthode qui retourne la classe CSS associée au statut du dossier
  // Elle permet d’afficher visuellement l’état du dossier dans l’interface expert
  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_VALIDATION':
        return 'pending';

      case 'APPROVED':
        return 'approved';

      case 'REJECTED':
        return 'rejected';

      case 'CLOSED':
        return 'closed';

      default:
        return 'default';
    }
  }

  // Méthode permettant de déconnecter l’expert puis de le rediriger vers la page de connexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
