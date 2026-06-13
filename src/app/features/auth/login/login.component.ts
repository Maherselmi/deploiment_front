// Importation des modules Angular nécessaires au composant
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Importation du service d’authentification
import { AuthService } from "../../../core/auth/auth.service";


// Interface représentant un élément de confiance affiché dans la page de connexion
interface LoginTrustItem {
  value: string;
  label: string;
}

// Interface représentant une fonctionnalité mise en avant dans l’interface de connexion
interface LoginFeatureItem {
  title: string;
  text: string;
  icon: 'shield' | 'folder' | 'clock';
}

// Déclaration du composant Angular responsable de la page de connexion
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  // Champs liés au formulaire de connexion
  email = '';
  password = '';

  // Indique si une requête de connexion est en cours
  loading = false;

  // Message d’erreur affiché en cas de problème de connexion ou de saisie
  errorMessage = '';

  // Permet d’afficher ou masquer le mot de passe dans le formulaire
  showPassword = false;

  // Liste des éléments de confiance affichés sur la page de connexion
  trustItems: LoginTrustItem[] = [
    { value: '24/7', label: 'Accès continu à votre espace' },
    { value: '100%', label: 'Données centralisées et sécurisées' },
    { value: '1', label: 'Plateforme unique pour tous vos suivis' }
  ];

  // Liste des fonctionnalités présentées à l’utilisateur sur la page de connexion
  featureItems: LoginFeatureItem[] = [
    {
      title: 'Connexion sécurisée',
      text: 'Accès protégé à vos informations personnelles et à vos contrats.',
      icon: 'shield'
    },
    {
      title: 'Documents organisés',
      text: 'Retrouvez vos pièces, justificatifs et dossiers au même endroit.',
      icon: 'folder'
    },
    {
      title: 'Suivi instantané',
      text: 'Consultez l’état de vos démarches et sinistres en temps réel.',
      icon: 'clock'
    }
  ];

  // Injection du service d’authentification et du routeur Angular
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Méthode appelée lors de la soumission du formulaire de connexion
  // Elle vérifie les champs, envoie les identifiants au backend puis redirige selon le rôle
  onLogin(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading = true;

    this.authService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.loading = false;

        // Redirection de l’utilisateur selon son rôle après une connexion réussie
        switch (response.role) {
          case 'ROLE_ADMIN':
            this.router.navigate(['/dashboard']);
            break;

          case 'ROLE_EXPERT':
            this.router.navigate(['/expert-space']);
            break;

          case 'ROLE_CLIENT':
            this.router.navigate(['/Client_Space']);
            break;

          default:
            this.router.navigate(['/']);
            break;
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Erreur login:', err);
        this.errorMessage = 'Email ou mot de passe incorrect.';
      }
    });
  }

  // Méthode permettant d’afficher ou masquer le mot de passe
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
