// Importation des modules Angular nécessaires au composant
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


// Type représentant un élément de navigation dans la sidebar
type NavItem = {
  label: string;
  route: string;
  icon: 'dashboard' | 'clients' | 'policies' | 'claims' | 'agents' | 'ai' | 'reports' | 'settings';
  badge?: string;
  badgeClass?: 'red';
};

// Type représentant un groupe de navigation contenant plusieurs liens
type NavGroup = {
  title: string;
  items: NavItem[];
};

// Déclaration du composant Angular responsable de la barre latérale d’administration
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  // Liste des groupes de navigation affichés dans la sidebar
  // Chaque groupe contient un titre et une liste de liens vers les différentes pages
  navGroups: NavGroup[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', route: 'dashboard', icon: 'dashboard' },
        { label: 'Clients', route: 'clients', icon: 'clients' },
        { label: 'Polices', route: 'polices', icon: 'policies' },
        { label: 'Sinistres', route: 'dossiers', icon: 'claims', badge: '12', badgeClass: 'red' },
      ]
    },
    {
      title: 'IA & Agents',
      items: [
        { label: 'Analyse IA', route: '/ia_param', icon: 'ai' }
      ]
    },
  ];

  // Injection du routeur Angular pour gérer la navigation entre les pages
  constructor(private router: Router) {}

  // Méthode permettant de naviguer vers une route donnée
  // Si aucune route n’est fournie, aucune action n’est effectuée
  navigate(route: string): void {
    if (!route) return;

    this.router.navigateByUrl(route);
  }

  // Méthode permettant de déconnecter l’utilisateur
  // Elle supprime les informations d’authentification stockées localement puis redirige vers la page de connexion
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('email');

    sessionStorage.clear();

    this.router.navigateByUrl('/login');
  }

  // Méthode permettant de vérifier si un lien de la sidebar est actif
  // Elle compare l’URL courante avec la route de l’élément sélectionné
  isActive(route: string): boolean {
    return !!route && this.router.url.startsWith(route);
  }

}
