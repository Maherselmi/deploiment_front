// Importation des modules Angular nécessaires au composant
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Importation des services utilisés pour les polices et l’authentification
import { PolicyService } from "../../data-access/policy.service";
import { AuthService } from "../../../../core/auth/auth.service";
import {Policy} from "../../../claims/data-access/claim.service";

// Importation du modèle représentant une police d’assurance


// Interface représentant un lien de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Déclaration du composant Angular responsable de l’affichage
// des polices d’assurance du client connecté
@Component({
  selector: 'app-polices',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterModule],
  templateUrl: './polices.component.html',
  styleUrls: ['./polices.component.css']
})
export class PolicesComponent implements OnInit {

  // Liste complète des polices récupérées depuis le backend
  allPolicies: Policy[] = [];

  // Liste des polices appartenant uniquement au client connecté
  policies: Policy[] = [];

  // Liste des polices filtrées selon la recherche et le type sélectionné
  filteredPolicies: Policy[] = [];

  // Variables utilisées pour gérer le chargement, les erreurs et les filtres
  loading = true;
  errorMessage = '';
  searchTerm = '';
  selectedType = 'TOUS';

  // Identifiant de la police dont les détails sont actuellement affichés
  expandedPolicyId: number | null = null;

  // Email du client connecté récupéré depuis le localStorage
  currentClientEmail: string | null = null;

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Injection des services nécessaires :
  // PolicyService pour récupérer les polices,
  // AuthService pour vérifier la connexion,
  // Router pour gérer la navigation,
  // PLATFORM_ID pour vérifier si le code s’exécute côté navigateur
  constructor(
    private policyService: PolicyService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle vérifie l’authentification, récupère l’email du client, puis charge ses polices
  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadCurrentClientEmail();

    if (!this.currentClientEmail) {
      this.loading = false;
      this.errorMessage = 'Utilisateur non identifié. Veuillez vous reconnecter.';
      return;
    }

    this.loadPolicies();
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  isActiveNav(route: string): boolean {
    return this.router.url === route;
  }

  // Méthode permettant de récupérer l’email du client connecté depuis le localStorage
  // La vérification isPlatformBrowser évite les erreurs lors du rendu côté serveur
  loadCurrentClientEmail(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.currentClientEmail = localStorage.getItem('email');
  }

  // Méthode responsable du chargement des polices depuis le backend
  // Elle filtre ensuite les polices pour garder uniquement celles du client connecté
  loadPolicies(): void {
    this.loading = true;
    this.errorMessage = '';

    this.policyService.getAllPolicies().subscribe({
      next: (data) => {
        this.allPolicies = data ?? [];

        const email = this.currentClientEmail?.toLowerCase().trim();

        this.policies = this.allPolicies.filter((policy) => {
          const policyClientEmail = policy.client?.email?.toLowerCase().trim();
          return policyClientEmail === email;
        });

        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement polices', err);
        this.errorMessage = 'Impossible de charger vos polices.';
        this.loading = false;
      }
    });
  }

  // Méthode permettant d’appliquer les filtres de recherche et de type
  // Elle filtre les polices selon le numéro, le type, la formule, le code produit ou les détails de couverture
  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredPolicies = this.policies.filter((policy) => {
      const matchesSearch =
        !term ||
        (policy.policyNumber ?? '').toLowerCase().includes(term) ||
        (policy.type ?? '').toLowerCase().includes(term) ||
        (policy.formule ?? '').toLowerCase().includes(term) ||
        (policy.productCode ?? '').toLowerCase().includes(term) ||
        (policy.coverageDetails ?? '').toLowerCase().includes(term);

      const matchesType =
        this.selectedType === 'TOUS' ||
        (policy.type ?? '').toUpperCase() === this.selectedType;

      return matchesSearch && matchesType;
    });
  }

  // Méthode appelée lorsque l’utilisateur modifie le champ de recherche
  // Elle relance l’application des filtres
  onSearchChange(): void {
    this.applyFilters();
  }

  // Méthode appelée lorsque l’utilisateur sélectionne un type de police
  // Elle met à jour le type sélectionné puis applique les filtres
  onTypeChange(type: string): void {
    this.selectedType = type;
    this.applyFilters();
  }

  // Méthode permettant d’afficher ou masquer les détails d’une police
  // Si la même police est cliquée deux fois, ses détails sont masqués
  toggleDetails(policyId: number): void {
    this.expandedPolicyId = this.expandedPolicyId === policyId ? null : policyId;
  }

  // Méthode qui vérifie si une police est actuellement développée dans l’interface
  isExpanded(policyId: number): boolean {
    return this.expandedPolicyId === policyId;
  }

  // Méthode permettant de vérifier si une police est active
  // Une police est active si la date du jour est comprise entre sa date de début et sa date de fin
  isActive(policy: Policy): boolean {
    if (!policy.startDate || !policy.endDate) {
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

  // Méthode qui calcule le nombre de jours restants avant l’expiration d’une police
  getRemainingDays(policy: Policy): number {
    if (!policy.endDate) {
      return 0;
    }

    const today = new Date();
    const end = new Date(policy.endDate);

    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Méthode qui retourne la classe CSS associée au type de police
  // Elle permet de personnaliser l’affichage selon le type : auto, santé ou habitation
  getTypeClass(type: string | undefined): string {
    const normalized = (type ?? '').toUpperCase();

    if (normalized === 'AUTO') return 'type-auto';
    if (normalized === 'SANTE') return 'type-sante';
    if (normalized === 'HABITATION') return 'type-habitation';

    return 'type-default';
  }

  // Méthode qui retourne le nombre de polices actives du client connecté
  getActiveCount(): number {
    return this.policies.filter((policy) => this.isActive(policy)).length;
  }

  // Méthode qui retourne le nombre de polices expirées ou inactives
  getExpiredCount(): number {
    return this.policies.filter((policy) => !this.isActive(policy)).length;
  }

  // Méthode permettant de récupérer le nom complet du titulaire de la police
  // Si aucune information n’est disponible, une valeur par défaut est retournée
  getPolicyHolder(policy: Policy): string {
    const firstName = policy.client?.firstName ?? '';
    const lastName = policy.client?.lastName ?? '';

    return `${firstName} ${lastName}`.trim() || 'Client';
  }

  // Méthode qui retourne le libellé du type de police en majuscules
  getTypeLabel(type: string | undefined): string {
    return (type ?? 'NON DÉFINI').toUpperCase();
  }

  // Méthode permettant de naviguer vers la page d’accueil
  goToHome(): void {
    this.router.navigate(['/']);
  }

  // Méthode permettant de naviguer vers la page de consultation des dossiers
  goToDecisions(): void {
    this.router.navigate(['/Consulter']);
  }

  // Méthode permettant de déconnecter le client puis de le rediriger vers la page de connexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Méthode permettant de naviguer vers la liste des polices
  goToPolice(): void {
    this.router.navigate(['/PolicesList']);
  }
}
