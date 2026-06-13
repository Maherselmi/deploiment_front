// Importation des modules Angular nécessaires au composant
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from "@angular/router";


// Interface représentant un lien de navigation dans la page d’accueil
interface NavItem {
  label: string;
  href: string;
}

// Interface représentant une statistique affichée dans la section principale
interface StatItem {
  value: string;
  label: string;
}

// Interface représentant une offre d’assurance affichée sous forme de carte
interface OfferItem {
  id: string;
  title: string;
  description: string;
  cta: string;
  image: string;
}

// Interface représentant une étape du processus de déclaration de sinistre
interface ClaimStep {
  id: string;
  title: string;
  text: string;
  icon: 'edit' | 'user' | 'check';
}

// Interface représentant un avantage mis en avant dans la page
interface AdvantageItem {
  title: string;
  text: string;
  icon: 'user' | 'clock' | 'pin' | 'shield';
}

// Interface représentant une méthode de contact proposée à l’utilisateur
interface ContactMethod {
  title: string;
  text: string;
  action: string;
  href: string;
  icon: 'phone' | 'mail' | 'chat';
}

// Interface représentant une solution ou fonctionnalité principale de la plateforme
interface HomeSolution {
  title: string;
  text: string;
  icon: 'pilot' | 'claim' | 'safe';
}

// Interface représentant une carte produit liée aux modules de la plateforme
interface ProductCard {
  title: string;
  text: string;
}

// Déclaration du composant Angular responsable de la page d’accueil publique d’InSurFlow
@Component({
  selector: 'app-insurance-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './insurance-home.component.html',
  styleUrls: ['./insurance-home.component.css']
})
export class InsuranceHomeComponent {

  // Liste des liens de navigation affichés dans l’en-tête de la page
  navItems: NavItem[] = [
    { label: 'Nos offres', href: '#offres' },
    { label: 'Plateforme', href: '#plateforme' },
    { label: 'Sinistres', href: '#sinistres' },
    { label: 'Pourquoi InSurFlow', href: '#pourquoi' },
    { label: 'Contact', href: '#contact' }
  ];

  // Liste des statistiques affichées pour renforcer la crédibilité de la plateforme
  stats: StatItem[] = [
    { value: '98%', label: 'Sinistres traités sous 7 jours' },
    { value: '24/7', label: "Assistance d'urgence" },
    { value: '180k', label: 'Assurés en France' },
    { value: '1962', label: 'Année de fondation' }
  ];

  // Liste des offres d’assurance présentées dans la page d’accueil
  // Chaque offre contient un titre, une description, un bouton d’action et une image
  offers: OfferItem[] = [
    {
      id: '01',
      title: 'Auto',
      description: 'Tous risques, intermédiaire ou tiers. Assistance 24/7 et véhicule de remplacement.',
      cta: 'Découvrir l’offre',
      image: 'assets/images/auto-insurance.jpg'
    },
    {
      id: '02',
      title: 'Habitation',
      description: 'Résidence principale, secondaire ou locative. Couverture multirisque sur mesure.',
      cta: 'Découvrir l’offre',
      image: 'assets/images/home-insurance.jpg'
    },
    {
      id: '03',
      title: 'Santé',
      description: 'Complémentaires individuelles et familiales. Tiers payant généralisé.',
      cta: 'Découvrir l’offre',
      image: 'assets/images/health-insurance.jpg'
    },
    {
      id: '04',
      title: 'Vie & Prévoyance',
      description: 'Épargne, transmission, garantie décès. Conseillers patrimoniaux dédiés.',
      cta: 'Découvrir l’offre',
      image: 'assets/images/Vie.png'
    }
  ];

  // Liste des solutions principales proposées par la plateforme InSurFlow
  // Elles expliquent la valeur ajoutée de l’espace client et du suivi numérique
  solutions: HomeSolution[] = [
    {
      title: 'Expérience assurée centralisée',
      text: 'Une seule interface pour les contrats, les documents, les échanges et le suivi global.',
      icon: 'pilot'
    },
    {
      title: 'Gestion des sinistres plus fluide',
      text: 'Déclaration, dépôt de justificatifs et suivi du dossier dans un parcours beaucoup plus clair.',
      icon: 'claim'
    },
    {
      title: 'Environnement sécurisé',
      text: 'Protection des données, accès contrôlé et documents sensibles accessibles dans un espace fiable.',
      icon: 'safe'
    }
  ];

  // Liste des cartes présentant les principaux modules fonctionnels de la plateforme
  productCards: ProductCard[] = [
    {
      title: 'Client Space',
      text: 'Un espace moderne pour consulter les contrats, suivre les dossiers et retrouver tous les documents.'
    },
    {
      title: 'ClaimFlow',
      text: 'Un parcours de sinistre plus lisible et plus rassurant, pensé pour réduire la friction.'
    },
    {
      title: 'DocFlow',
      text: 'Une organisation claire des justificatifs, rapports et pièces importantes du dossier.'
    }
  ];

  // Liste des étapes expliquant le parcours général de traitement d’un sinistre
  claimSteps: ClaimStep[] = [
    {
      id: '01',
      title: 'Déclarez',
      text: 'En ligne ou par téléphone, 24/7.',
      icon: 'edit'
    },
    {
      id: '02',
      title: 'Expertise',
      text: 'Un expert indépendant sous 48h.',
      icon: 'user'
    },
    {
      id: '03',
      title: 'Indemnisation',
      text: 'Versement sous 7 jours en moyenne.',
      icon: 'check'
    }
  ];

  // Liste des avantages mis en avant pour rassurer l’utilisateur
  advantages: AdvantageItem[] = [
    {
      title: 'Conseiller dédié',
      text: 'Un interlocuteur unique pour tous vos contrats.',
      icon: 'user'
    },
    {
      title: 'Réponse sous 24h',
      text: 'Engagement contractuel sur tous nos canaux.',
      icon: 'clock'
    },
    {
      title: 'Expertise sur place',
      text: 'Experts mandatés et indépendants partout en France.',
      icon: 'pin'
    },
    {
      title: 'Documents sécurisés',
      text: 'Coffre-fort numérique chiffré, accessible à vie.',
      icon: 'shield'
    }
  ];

  // Liste des moyens de contact proposés aux visiteurs
  // Chaque méthode contient un lien d’action adapté : téléphone, email ou espace client
  contactMethods: ContactMethod[] = [
    {
      title: 'Par téléphone',
      text: 'Parlez à un conseiller pour un besoin immédiat ou une situation urgente.',
      action: 'Nous appeler',
      href: 'tel:+33100000000',
      icon: 'phone'
    },
    {
      title: 'Par email',
      text: 'Recevez une réponse claire et centralisée sur vos contrats et vos démarches.',
      action: 'Nous écrire',
      href: 'mailto:contact@insurflow.com',
      icon: 'mail'
    },
    {
      title: 'Depuis votre espace',
      text: 'Retrouvez vos documents, votre suivi et vos échanges au même endroit.',
      action: 'Accéder à mon espace',
      href: '/login',
      icon: 'chat'
    }
  ];
}
