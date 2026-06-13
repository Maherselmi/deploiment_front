// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

// Importation du modèle représentant un dossier de sinistre
import { Claim } from "../../models/claim.model";

// Importation du service utilisé pour récupérer les dossiers de sinistre
import { ClaimService } from "../../data-access/claim.service";


// Interface représentant un lien de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Déclaration du composant Angular responsable de l’affichage du rapport d’un dossier de sinistre
@Component({
  selector: 'app-claim-report-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './claim-report-page.component.html',
  styleUrls: ['./claim-report-page.component.css']
})
export class ClaimReportPageComponent implements OnInit {

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Dossier de sinistre actuellement affiché dans la page
  claim: Claim | null = null;

  // Indique si les données du rapport sont en cours de chargement
  loading = true;

  // Identifiant du dossier récupéré depuis l’URL
  claimId = 0;

  // Injection des services nécessaires :
  // ActivatedRoute pour lire l’identifiant depuis l’URL,
  // Router pour gérer la navigation,
  // ClaimService pour récupérer les dossiers de sinistre
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private claimService: ClaimService
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle récupère l’identifiant du dossier puis charge les informations correspondantes
  ngOnInit(): void {
    this.claimId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.claimId) {
      this.loading = false;
      return;
    }

    this.claimService.getAllClaims().subscribe({
      next: (data) => {
        const claims = data || [];
        this.claim = claims.find(c => c.id === this.claimId) || null;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du rapport :', err);
        this.loading = false;
      }
    });
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  isActiveNav(route: string): boolean {
    return this.router.url === route;
  }

  // Méthode qui transforme le statut technique du dossier en libellé lisible
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
  // Elle permet d’afficher un style visuel différent selon l’état du sinistre
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
  getClientFullName(): string {
    if (!this.claim?.policy?.client) {
      return 'Client non renseigné';
    }

    const firstName = this.claim.policy.client.firstName || '';
    const lastName = this.claim.policy.client.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || 'Client non renseigné';
  }

  // Méthode permettant de récupérer le numéro de police associé au dossier
  getPolicyNumber(): string {
    return this.claim?.policy?.policyNumber || '-';
  }

  // Méthode permettant de revenir à la liste des dossiers du client
  goBack(): void {
    this.router.navigate(['/Consulter']);
  }

  // Méthode permettant de naviguer vers la page d’accueil
  goToHome(): void {
    this.router.navigate(['/']);
  }

  // Méthode permettant de naviguer vers la liste des polices d’assurance
  goToPolice(): void {
    this.router.navigate(['/PolicesList']);
  }

  // Méthode permettant de naviguer vers la page principale des sinistres
  goToClaimHome(): void {
    this.router.navigate(['/Claim_Home']);
  }

  // Méthode permettant de rediriger l’utilisateur vers la page de connexion
  logout(): void {
    this.router.navigate(['/login']);
  }
}
