// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';


// Interface représentant un lien de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Interface représentant une étape suivante affichée après la déclaration du sinistre
interface NextStepItem {
  id: string;
  title: string;
  text: string;
}

// Déclaration du composant Angular responsable de la troisième étape de déclaration
// Cette étape confirme la création du dossier et affiche les prochaines actions
@Component({
  selector: 'app-claim-step3',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './claim-step3.component.html',
  styleUrls: ['./claim-step3.component.css']
})
export class ClaimStep3Component implements OnInit {

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/contrats' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste des prochaines étapes affichées après l’envoi du dossier
  // Elles permettent d’expliquer au client ce qui va se passer après la déclaration
  nextSteps: NextStepItem[] = [
    {
      id: '1',
      title: 'Analyse du dossier',
      text: 'Vérification des informations et des documents envoyés.'
    },
    {
      id: '2',
      title: 'Étude du sinistre',
      text: 'Évaluation du dossier avant décision de traitement.'
    },
    {
      id: '3',
      title: 'Suivi dans votre espace',
      text: 'Consultez l’avancement depuis vos dossiers InSurFlow.'
    }
  ];

  // Référence du dossier affichée à l’utilisateur après la déclaration
  reference = '';

  // Injection du routeur Angular pour gérer les redirections
  constructor(private router: Router) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle génère la référence du dossier à afficher
  ngOnInit(): void {
    this.reference = this.generateReference();
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  // Elle prend aussi en compte les routes liées aux différentes catégories de sinistres
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

  // Méthode permettant de générer une référence pour le dossier de sinistre
  // Si un claimId existe dans le localStorage, il est utilisé pour créer une référence stable
  generateReference(): string {
    const storedClaimId =
      typeof localStorage !== 'undefined' ? localStorage.getItem('claimId') : null;

    if (storedClaimId) {
      return `AUTO-${storedClaimId}-${new Date().getFullYear()}`;
    }

    // Si aucun identifiant n’est trouvé, une référence temporaire est générée
    const rand = Math.floor(Math.random() * 10000);
    return `SIN-AUTO-${new Date().getFullYear()}-${rand}`;
  }

  // Méthode permettant de démarrer une nouvelle déclaration de sinistre auto
  newClaim(): void {
    this.router.navigate(['/claim/step1']);
  }

  // Méthode permettant de retourner vers la page principale des sinistres
  goToClaimsHome(): void {
    this.router.navigate(['/Claim_Home']);
  }

  // Méthode permettant d’accéder à la liste des dossiers du client
  goToMyFiles(): void {
    this.router.navigate(['/Consulter']);
  }

  // Méthode permettant de naviguer vers la page d’accueil
  goToHome(): void {
    this.router.navigate(['/']);
  }

  // Méthode permettant de naviguer vers la page de consultation des décisions ou dossiers
  goToDecisions(): void {
    this.router.navigate(['/Consulter']);
  }

  // Méthode permettant de naviguer vers la liste des polices d’assurance
  goToPolice(): void {
    this.router.navigate(['/PolicesList']);
  }

  // Méthode permettant de rediriger l’utilisateur vers la page de connexion
  logout(): void {
    this.router.navigate(['/login']);
  }
}
