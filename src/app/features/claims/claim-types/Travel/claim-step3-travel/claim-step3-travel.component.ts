// Importation des modules Angular nécessaires au composant
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';


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

// Déclaration du composant Angular responsable de la troisième étape
// de déclaration d’un sinistre voyage
@Component({
  selector: 'app-claim-step3-travel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './claim-step3-travel.component.html',
  styleUrls: ['./claim-step3-travel.component.css'],
  host: { ngSkipHydration: 'true' }
})
export class ClaimStep3TravelComponent implements OnInit {

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste des prochaines étapes affichées après l’envoi du dossier voyage
  // Elles expliquent au client le déroulement du traitement après la déclaration
  nextSteps: NextStepItem[] = [
    {
      id: '1',
      title: 'Vérification du contrat voyage',
      text: 'Analyse des garanties voyage, exclusions et conditions de prise en charge.'
    },
    {
      id: '2',
      title: 'Étude des justificatifs',
      text: 'Contrôle des billets, attestations, factures ou rapports transmis.'
    },
    {
      id: '3',
      title: 'Suivi dans votre espace',
      text: 'Retrouvez l’avancement complet depuis vos dossiers InSurFlow.'
    }
  ];

  // Référence du dossier voyage affichée à l’utilisateur
  reference = '';

  // Injection du routeur Angular et de PLATFORM_ID
  // PLATFORM_ID permet de vérifier si le code s’exécute côté navigateur
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle génère la référence du dossier voyage
  ngOnInit(): void {
    this.reference = this.generateReference();
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  // Elle prend en compte les routes liées aux différentes catégories de sinistres
  isActiveNav(route: string): boolean {
    const currentUrl = this.router.url;

    if (route === '/Claim_Home') {
      return (
        currentUrl.startsWith('/Claim_Home') ||
        currentUrl.startsWith('/claim') ||
        currentUrl.startsWith('/Sante') ||
        currentUrl.startsWith('/Habitation') ||
        currentUrl.startsWith('/Life') ||
        currentUrl.startsWith('/Travel')
      );
    }

    return currentUrl === route;
  }

  // Méthode permettant de générer une référence pour le dossier voyage
  // Si un claimId existe dans le localStorage, il est utilisé pour créer une référence stable
  generateReference(): string {
    if (isPlatformBrowser(this.platformId)) {
      const storedClaimId = localStorage.getItem('claimId');

      if (storedClaimId) {
        return `VOYAGE-${storedClaimId}-${new Date().getFullYear()}`;
      }
    }

    // Si aucun identifiant n’est trouvé, une référence temporaire est générée
    const rand = Math.floor(Math.random() * 10000);
    return `VOYAGE-${new Date().getFullYear()}-${rand}`;
  }

  // Méthode permettant de démarrer une nouvelle déclaration de sinistre voyage
  newClaim(): void {
    this.router.navigate(['/Travel/step1']);
  }

  // Méthode permettant de retourner vers la page principale des sinistres
  goToClaimsHome(): void {
    this.router.navigate(['/Claim_Home']);
  }

  // Méthode permettant d’accéder à la liste des dossiers du client
  goToMyFiles(): void {
    this.router.navigate(['/Consulter']);
  }

  // Méthode permettant de naviguer vers la liste des polices d’assurance
  goToPolice(): void {
    this.router.navigate(['/PolicesList']);
  }

  // Méthode permettant de naviguer vers la page d’accueil
  goToHome(): void {
    this.router.navigate(['/']);
  }

  // Méthode permettant de rediriger l’utilisateur vers la page de connexion
  logout(): void {
    this.router.navigate(['/login']);
  }
}
