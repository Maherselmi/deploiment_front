// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// Importation des composants de mise en page
import { SidebarComponent } from "../../../../layout/components/sidebar/sidebar.component";
import { TopbarComponent } from "../../../../layout/components/topbar/topbar.component";

// Importation du modèle représentant un dossier de sinistre
import { Claim } from "../../models/claim.model";

// Importation du service utilisé pour récupérer les dossiers de sinistre
import { ClaimService } from "../../data-access/claim.service";


// Déclaration du composant Angular responsable de l’affichage des dossiers de sinistre
@Component({
  selector: 'app-dossier-sinistre',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, SidebarComponent, TopbarComponent, RouterLink],
  templateUrl: './dossier-sinistre.component.html',
  styleUrls: ['./dossier-sinistre.component.css']
})
export class DossierSinistreComponent implements OnInit {

  // Liste complète des dossiers de sinistre récupérés depuis le backend
  claims: Claim[] = [];

  // Liste filtrée des dossiers affichés dans l’interface après recherche
  filteredClaims: Claim[] = [];

  // Indique si les dossiers sont encore en cours de chargement
  loading = true;

  // Terme saisi par l’utilisateur dans la barre de recherche
  searchTerm = '';

  // Injection du service des dossiers de sinistre et du routeur Angular
  constructor(
    private claimService: ClaimService,
    private router: Router
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle lance la récupération des dossiers de sinistre
  ngOnInit(): void {
    this.loadClaims();
  }

  // Méthode responsable du chargement des dossiers depuis le backend
  // Elle initialise aussi la liste filtrée utilisée pour l’affichage
  loadClaims(): void {
    this.loading = true;

    this.claimService.getAllClaims().subscribe({
      next: (data) => {
        this.claims = data || [];
        this.filteredClaims = [...this.claims];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement dossiers', err);
        this.loading = false;
      }
    });
  }

  // Méthode appelée lors de la recherche
  // Elle filtre les dossiers selon la description, le client, la police, le type ou le statut
  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredClaims = [...this.claims];
      return;
    }

    this.filteredClaims = this.claims.filter((claim) =>
      claim.description?.toLowerCase().includes(term) ||
      claim.policy?.client?.firstName?.toLowerCase().includes(term) ||
      claim.policy?.client?.lastName?.toLowerCase().includes(term) ||
      claim.policy?.policyNumber?.toLowerCase().includes(term) ||
      claim.policy?.type?.toLowerCase().includes(term) ||
      claim.status?.toLowerCase().includes(term)
    );
  }

  // Méthode qui calcule le nombre de dossiers correspondant à un statut donné
  getCountByStatus(status: string): number {
    return this.claims.filter(claim => claim.status === status).length;
  }

  // Méthode permettant de générer les initiales du client associé au dossier
  getInitials(claim: Claim): string {
    const firstName = claim.policy?.client?.firstName || '';
    const lastName = claim.policy?.client?.lastName || '';

    return ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?';
  }

  // Méthode permettant de récupérer le nom complet du client associé au dossier
  // Si les informations sont absentes, une valeur par défaut est retournée
  getClientFullName(claim: Claim): string {
    const firstName = claim.policy?.client?.firstName || '';
    const lastName = claim.policy?.client?.lastName || '';

    return `${firstName} ${lastName}`.trim() || 'Client non renseigné';
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
  // Elle permet d’afficher une couleur différente selon l’état du sinistre
  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'status-approved';

      case 'REJECTED':
        return 'status-rejected';

      case 'PENDING_VALIDATION':
        return 'status-pending';

      case 'IN_ANALYSIS':
      case 'SUBMITTED':
        return 'status-progress';

      case 'CLOSED':
        return 'status-closed';

      default:
        return 'status-progress';
    }
  }

  // Getter qui retourne le nombre de dossiers en attente de validation
  get pendingCount(): number {
    return this.getCountByStatus('PENDING_VALIDATION');
  }

  // Getter qui retourne le nombre de dossiers approuvés
  get approvedCount(): number {
    return this.getCountByStatus('APPROVED');
  }

  // Getter qui retourne le nombre de dossiers rejetés
  get rejectedCount(): number {
    return this.getCountByStatus('REJECTED');
  }

  // Getter qui retourne le nombre de dossiers en cours d’analyse
  get inAnalysisCount(): number {
    return this.getCountByStatus('IN_ANALYSIS');
  }

  // Méthode permettant de naviguer vers la page des dossiers
  // Elle peut être utilisée par un bouton d’action dans l’interface
  onNewClaim(): void {
    this.router.navigate(['/dossiers']);
  }
}
