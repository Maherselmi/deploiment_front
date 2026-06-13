// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

// Importation du service d’authentification
import { AuthService } from "../../../../core/auth/auth.service";


// Interface représentant un lien de navigation dans l’espace expert
interface ExpertNavItem {
  label: string;
  route: string;
}

// Interface représentant une carte d’action rapide affichée dans l’espace expert
interface ExpertActionCard {
  title: string;
  text: string;
  button: string;
  route: string;
}

// Déclaration du composant Angular responsable de l’espace expert
@Component({
  selector: 'app-expert-space',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './expert-space.component.html',
  styleUrls: ['./expert-space.component.css']
})
export class ExpertSpaceComponent implements OnInit {

  // Liste des liens de navigation affichés dans l’espace expert
  navItems: ExpertNavItem[] = [
    { label: 'Espace expert', route: '/expert-space' },
    { label: 'Validation humaine', route: '/feedback-claims' },
  ];

  // Liste des actions rapides proposées à l’expert
  // Chaque carte redirige vers une fonctionnalité spécifique de l’espace expert
  quickActions: ExpertActionCard[] = [
    {
      title: 'Validation humaine',
      text: 'Traitez les dossiers en attente et prenez une décision finale.',
      button: 'Accéder à la validation',
      route: '/HumanValidationList'
    },
    {
      title: 'Feedback expert',
      text: 'Corrigez les résultats IA et alimentez la mémoire des agents.',
      button: 'Ouvrir les feedbacks',
      route: '/ExpertFeedbackList'
    },
    {
      title: 'Suivi des dossiers',
      text: 'Consultez les sinistres analysés et l’état global du traitement.',
      button: 'Voir les dossiers',
      route: '/AdminClaimsList'
    }
  ];

  // Informations de l’expert connecté affichées dans l’interface
  expertName = 'Expert';
  expertEmail = '';
  role = '';

  // Injection du service d’authentification et du routeur Angular
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle vérifie que l’utilisateur est connecté et possède bien le rôle expert
  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const role = this.authService.getRole() || '';
    this.role = role;

    if (!this.isExpert(role)) {
      this.router.navigate(['/login']);
      return;
    }

    const email = localStorage.getItem('email') || '';
    this.expertEmail = email;
    this.expertName = this.buildExpertName(email);
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  isActiveNav(route: string): boolean {
    return this.router.url === route;
  }

  // Méthode privée permettant de vérifier si le rôle correspond à un expert
  // Elle accepte les formats EXPERT et ROLE_EXPERT
  private isExpert(role: string): boolean {
    const normalized = role.trim().toUpperCase();
    return normalized === 'EXPERT' || normalized === 'ROLE_EXPERT';
  }

  // Méthode privée permettant de construire un nom lisible à partir de l’email de l’expert
  // Si aucun email n’est disponible, un nom par défaut est retourné
  private buildExpertName(email: string): string {
    if (!email) return 'Expert InSurFlow';

    const localPart = email.split('@')[0] || 'expert';

    const formatted = localPart
      .replace(/[._-]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return formatted || 'Expert InSurFlow';
  }

  // Méthode générique permettant de naviguer vers une route donnée
  // Elle est utilisée par les cartes d’action rapide
  goTo(route: string): void {
    this.router.navigate([route]);
  }

  // Méthode permettant de déconnecter l’expert puis de le rediriger vers la page de connexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
