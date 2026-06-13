// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

// Importation des services et modèles utilisés pour gérer le client connecté
import { Client, ClientService } from "../../../clients/data-access/client.service";
import { AuthService } from "../../../../core/auth/auth.service";


// Interface représentant un lien de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Type représentant les différents codes de sinistres disponibles dans l’application
type ClaimCode = 'AUTO' | 'SANTE' | 'HABITATION' | 'TRAVEL' | 'LIFE';

// Interface représentant une carte de type de sinistre affichée dans la page
interface ClaimTypeCard {
  code: ClaimCode;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  icon: string;
  action: string;
}

// Interface représentant un avantage affiché dans la page d’accueil des sinistres
interface BenefitItem {
  title: string;
  text: string;
}

// Interface représentant une étape du processus de déclaration
interface ProcessStep {
  id: string;
  title: string;
  text: string;
  icon: 'edit' | 'upload' | 'follow';
}

// Déclaration du composant Angular responsable de la page principale des sinistres
@Component({
  selector: 'app-claims-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './claims-home.component.html',
  styleUrls: ['./claims-home.component.css']
})
export class ClaimsHomeComponent implements OnInit {

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste des types de sinistres disponibles dans l’application
  // Chaque carte contient les informations nécessaires à l’affichage et à la redirection
  claimTypes: ClaimTypeCard[] = [
    {
      code: 'AUTO',
      title: 'Sinistre Auto',
      subtitle: 'Déclaration véhicule',
      description: 'Accidents, collisions, bris de glace et dommages véhicule avec un parcours rapide et guidé.',
      image: 'assets/images/auto-insurance.jpg',
      icon: 'A',
      action: 'Déclarer un sinistre auto'
    },
    {
      code: 'SANTE',
      title: 'Sinistre Santé',
      subtitle: 'Prise en charge médicale',
      description: 'Hospitalisation, soins, remboursement et documents médicaux dans un parcours clair.',
      image: 'assets/images/health-insurance.jpg',
      icon: 'S',
      action: 'Déclarer un sinistre santé'
    },
    {
      code: 'HABITATION',
      title: 'Sinistre Habitation',
      subtitle: 'Dommages logement',
      description: 'Incendie, dégâts des eaux, vol, vandalisme et autres dommages sur votre habitation.',
      image: 'assets/images/home-insurance.jpg',
      icon: 'H',
      action: 'Déclarer un sinistre habitation'
    },
    {
      code: 'TRAVEL',
      title: 'Sinistre Voyage',
      subtitle: 'Assurance voyage',
      description: 'Annulation de voyage, retard de vol, perte de bagages ou incident survenu à l’étranger.',
      image: 'assets/images/Voyage_sinistre.png',
      icon: 'T',
      action: 'Déclarer un sinistre voyage'
    },
    {
      code: 'LIFE',
      title: 'Sinistre Vie',
      subtitle: 'Assurance vie',
      description: 'Décès, invalidité ou demande de capital assuré avec un parcours encadré et sécurisé.',
      image: 'assets/images/sinistre_vie.png',
      icon: 'V',
      action: 'Déclarer un sinistre vie'
    }
  ];

  // Liste des avantages présentés à l’utilisateur sur la page des sinistres
  benefits: BenefitItem[] = [
    {
      title: 'Déclaration simplifiée',
      text: 'Un parcours fluide pour démarrer rapidement sans complexité inutile.'
    },
    {
      title: 'Suivi centralisé',
      text: 'Toutes les étapes, documents et informations restent visibles dans le même espace.'
    },
    {
      title: 'Vision plus claire',
      text: 'Chaque type de sinistre est présenté de façon lisible et professionnelle.'
    }
  ];

  // Liste des étapes expliquant le processus général de déclaration d’un sinistre
  processSteps: ProcessStep[] = [
    {
      id: '01',
      title: 'Choisissez votre type de sinistre',
      text: 'Sélectionnez auto, santé, habitation, voyage ou vie pour démarrer le bon parcours.',
      icon: 'edit'
    },
    {
      id: '02',
      title: 'Ajoutez vos pièces et justificatifs',
      text: 'Déposez vos documents, photos et informations utiles dans le même espace.',
      icon: 'upload'
    },
    {
      id: '03',
      title: 'Suivez l’avancement du dossier',
      text: 'Consultez les décisions, rapports et évolutions de traitement à chaque étape.',
      icon: 'follow'
    }
  ];

  // Profil du client actuellement connecté
  client: Client | null = null;

  // Indique si le profil client est encore en cours de chargement
  loadingProfile = true;

  // Injection du routeur, du service d’authentification et du service client
  constructor(
    private router: Router,
    private authService: AuthService,
    private clientService: ClientService
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle vérifie l’authentification puis charge le profil du client connecté
  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadCurrentClient();
  }

  // Méthode permettant de charger le profil du client connecté à partir de son email
  // L’email est récupéré depuis le localStorage puis comparé avec la liste des clients
  loadCurrentClient(): void {
    const email = localStorage.getItem('email');

    if (!email) {
      this.loadingProfile = false;
      return;
    }

    this.clientService.getAllClients().subscribe({
      next: (clients) => {
        const found = clients.find(
          (c) => c.email?.toLowerCase() === email.toLowerCase()
        );

        this.client = found ?? null;
        this.loadingProfile = false;
      },
      error: () => {
        this.loadingProfile = false;
      }
    });
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  isActiveNav(route: string): boolean {
    return this.router.url === route;
  }

  // Getter qui retourne le nom complet du client connecté
  // Si le profil n’est pas encore disponible, une valeur par défaut est affichée
  get fullName(): string {
    if (!this.client) return 'Client InSurFlow';

    return `${this.client.firstName} ${this.client.lastName}`;
  }

  // Getter qui génère les initiales du client connecté
  // Elles peuvent être utilisées dans l’interface pour représenter le profil
  get initials(): string {
    if (!this.client) return 'CI';

    const first = this.client.firstName?.charAt(0) || '';
    const last = this.client.lastName?.charAt(0) || '';

    return `${first}${last}`.toUpperCase();
  }

  // Méthode appelée lorsqu’un utilisateur choisit un type de sinistre
  // Elle redirige vers le parcours correspondant selon le type sélectionné
  handleClaim(type: ClaimCode): void {
    if (type === 'AUTO') {
      this.goToClaim('AUTO');
      return;
    }

    if (type === 'SANTE') {
      this.goToClaimSante('SANTE');
      return;
    }

    if (type === 'HABITATION') {
      this.goToClaimHabitation('HABITATION');
      return;
    }

    if (type === 'TRAVEL') {
      this.goToClaimTravel('TRAVEL');
      return;
    }

    if (type === 'LIFE') {
      this.goToClaimLife('LIFE');
      return;
    }
  }

  // Méthode permettant de rediriger vers le parcours de déclaration auto
  goToClaim(type: string): void {
    this.router.navigate(['/claim/step1'], {
      queryParams: { type }
    });
  }

  // Méthode permettant de rediriger vers le parcours de déclaration santé
  goToClaimSante(type: string): void {
    this.router.navigate(['/Sante/step1'], {
      queryParams: { type }
    });
  }

  // Méthode permettant de rediriger vers le parcours de déclaration habitation
  goToClaimHabitation(type: string): void {
    this.router.navigate(['/Habitation/step1'], {
      queryParams: { type }
    });
  }

  // Méthode permettant de rediriger vers le parcours de déclaration voyage
  goToClaimTravel(type: string): void {
    this.router.navigate(['/travel/step1'], {
      queryParams: { type }
    });
  }

  // Méthode permettant de rediriger vers le parcours de déclaration vie
  goToClaimLife(type: string): void {
    this.router.navigate(['/Life/step1'], {
      queryParams: { type }
    });
  }

  // Méthode permettant de naviguer vers la liste des dossiers
  goToClaims(): void {
    this.router.navigate(['/dossiers']);
  }

  // Méthode permettant de déconnecter l’utilisateur puis de le rediriger vers la page de connexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
