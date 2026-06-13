// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Importation du modèle Policy et du service utilisé pour récupérer les polices
import { Policy, PolicyService } from "../../data-access/policy.service";

// Importation des composants de mise en page
import { SidebarComponent } from "../../../../layout/components/sidebar/sidebar.component";
import { TopbarComponent } from "../../../../layout/components/topbar/topbar.component";


// Déclaration du composant Angular responsable de l’affichage de la liste des polices côté administrateur
@Component({
  selector: 'app-policy-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    SidebarComponent,
    TopbarComponent
  ],
  templateUrl: './policy-list.component.html',
  styleUrls: ['./policy-list.component.css']
})
export class PolicyListComponent implements OnInit {

  // Liste complète des polices d’assurance récupérées depuis le backend
  policies: Policy[] = [];

  // Liste filtrée des polices affichées après une recherche
  filtered: Policy[] = [];

  // Indique si les polices sont encore en cours de chargement
  loading = true;

  // Terme saisi par l’utilisateur dans la barre de recherche
  searchTerm = '';

  // Police actuellement sélectionnée pour afficher ou masquer ses détails
  selectedPolicy: Policy | null = null;

  // Injection du service des polices et du routeur Angular
  constructor(
    private policyService: PolicyService,
    private router: Router
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle lance la récupération des polices d’assurance
  ngOnInit(): void {
    this.loadPolicies();
  }

  // Méthode responsable du chargement des polices depuis le backend
  // Elle initialise aussi la liste filtrée utilisée pour l’affichage
  loadPolicies(): void {
    this.loading = true;

    this.policyService.getAllPolicies().subscribe({
      next: (data) => {
        this.policies = data ?? [];
        this.filtered = [...this.policies];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement polices', err);
        this.policies = [];
        this.filtered = [];
        this.loading = false;
      }
    });
  }

  // Méthode appelée lors de la recherche
  // Elle filtre les polices selon le numéro, le type, la formule, le client ou les détails de couverture
  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filtered = [...this.policies];
      return;
    }

    this.filtered = this.policies.filter((p) =>
      (p.policyNumber ?? '').toLowerCase().includes(term) ||
      (p.type ?? '').toLowerCase().includes(term) ||
      (p.formule ?? '').toLowerCase().includes(term) ||
      (p.productCode ?? '').toLowerCase().includes(term) ||
      (p.coverageDetails ?? '').toLowerCase().includes(term) ||
      (p.client?.firstName ?? '').toLowerCase().includes(term) ||
      (p.client?.lastName ?? '').toLowerCase().includes(term) ||
      (p.client?.email ?? '').toLowerCase().includes(term)
    );
  }

  // Méthode qui calcule le nombre de polices selon un type donné
  getCountByType(type: string): number {
    return this.policies.filter(
      (p) => (p.type ?? '').toUpperCase() === type.toUpperCase()
    ).length;
  }

  // Méthode permettant de générer les initiales du client associé à une police
  getInitials(p: Policy): string {
    const first = p.client?.firstName?.charAt(0) ?? '';
    const last = p.client?.lastName?.charAt(0) ?? '';
    const initials = `${first}${last}`.toUpperCase();

    return initials || '?';
  }

  // Méthode permettant de récupérer le nom complet du client associé à une police
  // Si les informations sont absentes, une valeur par défaut est retournée
  getClientFullName(p: Policy): string {
    const first = p.client?.firstName ?? '';
    const last = p.client?.lastName ?? '';

    return `${first} ${last}`.trim() || 'Client non renseigné';
  }

  // Méthode permettant de sélectionner ou désélectionner une police
  // Si la même police est cliquée deux fois, ses détails sont masqués
  selectPolicy(p: Policy): void {
    this.selectedPolicy = this.selectedPolicy?.id === p.id ? null : p;
  }

  // Méthode qui retourne la classe CSS associée au type de police
  // Elle permet d’afficher un badge différent selon le type d’assurance
  getTypeBadgeClass(type: string | undefined): string {
    const normalized = (type ?? '').toUpperCase();

    const map: Record<string, string> = {
      AUTO: 'type-auto',
      SANTE: 'type-sante',
      HABITATION: 'type-habitation',
      VIE: 'type-vie'
    };

    return map[normalized] || 'type-default';
  }

  // Méthode qui vérifie si une police est expirée à partir de sa date de fin
  isExpired(endDate: string | undefined): boolean {
    if (!endDate) {
      return false;
    }

    const end = new Date(endDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return end < today;
  }

  // Getter qui retourne le nombre de polices encore actives
  get activePoliciesCount(): number {
    return this.policies.filter(p => !this.isExpired(p.endDate)).length;
  }

  // Getter qui retourne le nombre de polices expirées
  get expiredPoliciesCount(): number {
    return this.policies.filter(p => this.isExpired(p.endDate)).length;
  }

  // Méthode permettant d’afficher un aperçu court des détails de couverture
  // Si le texte est trop long, il est limité à 120 caractères
  getCoveragePreview(details: string | undefined): string {
    if (!details) {
      return 'Aucun détail de couverture renseigné.';
    }

    return details.length > 120 ? `${details.slice(0, 120)}...` : details;
  }

  // Méthode permettant de naviguer vers la page des dossiers
  // Elle peut être utilisée par un bouton d’action dans l’interface
  onNewClaim(): void {
    this.router.navigate(['/dossiers']);
  }
}
