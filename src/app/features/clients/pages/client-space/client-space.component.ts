// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Importation des modèles et services utilisés dans l’espace client
import { Policy }  from "../../../claims/data-access/claim.service";
import { Client, ClientService } from "../../data-access/client.service";
import { AuthService } from "../../../../core/auth/auth.service";
import { PolicyService } from "../../../policies/data-access/policy.service";
import { AssistantService } from "../../../assistant/data-access/assistant.service";


// Interface représentant un lien de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Interface représentant un dossier ou une alerte de sinistre affichée dans le tableau de bord
interface ClaimItem {
  status: string;
  statusClass: 'danger' | 'warning' | 'info';
  title: string;
  meta: string;
  message: string;
}

// Interface représentant une action rapide disponible dans l’espace client
interface QuickAction {
  title: string;
  text: string;
  route: string;
  icon: 'contracts' | 'claims' | 'documents';
}

// Interface représentant un message échangé avec l’assistant chatbot
interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

// Déclaration du composant Angular responsable du tableau de bord client
@Component({
  selector: 'app-client-space',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './client-space.component.html',
  styleUrls: ['./client-space.component.css']
})
export class ClientSpaceComponent implements OnInit {

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste des actions rapides permettant au client d’accéder aux fonctionnalités principales
  quickActions: QuickAction[] = [
    {
      title: 'Mes contrats',
      text: 'Consultez vos polices, garanties et échéances.',
      route: '/PolicesList',
      icon: 'contracts'
    },
    {
      title: 'Déclarer un sinistre',
      text: 'Lancez une nouvelle démarche en quelques étapes.',
      route: '/Claim_Home',
      icon: 'claims'
    },
    {
      title: 'Mes dossiers',
      text: 'Suivez vos décisions, rapports et validations.',
      route: '/Consulter',
      icon: 'documents'
    }
  ];

  // Liste des suggestions rapides proposées dans le chatbot
  chatSuggestions: string[] = [
    'Afficher mes polices',
    'Afficher mes dossiers de sinistre',
    'Comment déclarer un sinistre ?'
  ];

  // Profil du client connecté et liste de ses contrats
  client: Client | null = null;
  policies: Policy[] = [];

  // États de chargement du profil client et des contrats
  loadingProfile = true;
  loadingPolicies = true;

  // Messages d’erreur liés au profil et aux contrats
  profileError = '';
  policiesError = '';

  // États liés à l’affichage et au fonctionnement du chatbot
  chatbotOpen = false;
  chatbotLoading = false;
  chatInput = '';

  // Messages affichés dans le chatbot
  chatMessages: ChatMessage[] = [
    {
      sender: 'bot',
      text: 'Bonjour 👋 Je suis votre assistant InSurFlow. Je peux vous aider à consulter vos polices, vos sinistres ou à comprendre les étapes de déclaration.'
    }
  ];

  // Liste d’exemples de sinistres ou alertes affichés dans le tableau de bord client
  claims: ClaimItem[] = [
    {
      status: 'Action requise',
      statusClass: 'danger',
      title: 'Dégât des eaux — Cuisine',
      meta: 'Ouvert le 18 oct. 2024 · Habitation',
      message: 'Veuillez transmettre le devis de votre plombier pour finaliser l’évaluation.'
    },
    {
      status: 'Expertise programmée',
      statusClass: 'warning',
      title: 'Bris de glace — Pare-brise',
      meta: 'Ouvert le 02 oct. 2024 · Auto',
      message: 'Rendez-vous le 24 oct. à 09h30 chez le réparateur agréé.'
    }
  ];

  // Injection des services nécessaires :
  // AuthService pour vérifier la connexion,
  // ClientService pour charger le profil,
  // PolicyService pour récupérer les contrats,
  // AssistantService pour communiquer avec le chatbot,
  // Router pour gérer la navigation
  constructor(
    private authService: AuthService,
    private clientService: ClientService,
    private policyService: PolicyService,
    private assistantService: AssistantService,
    private router: Router
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle vérifie l’authentification puis charge le profil client et ses contrats
  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const email = this.getStoredEmail();

    if (!email) {
      this.loadingProfile = false;
      this.loadingPolicies = false;
      this.profileError = 'Utilisateur non identifié.';
      this.policiesError = 'Impossible de charger les contrats.';
      return;
    }

    this.loadCurrentClient(email);
    this.loadPolicies(email);
  }

  // Méthode permettant d’ouvrir ou fermer le chatbot
  toggleChatbot(): void {
    this.chatbotOpen = !this.chatbotOpen;
  }

  // Méthode permettant de fermer le chatbot
  closeChatbot(): void {
    this.chatbotOpen = false;
  }

  // Méthode permettant d’envoyer rapidement un message prédéfini au chatbot
  sendQuickChatMessage(message: string): void {
    if (this.chatbotLoading) return;

    this.chatInput = message;
    this.sendChatMessage();
  }

  // Méthode principale d’envoi d’un message au chatbot
  // Elle ajoute le message utilisateur, vérifie le profil client, puis contacte le backend
  sendChatMessage(): void {
    const message = this.chatInput.trim();

    if (!message || this.chatbotLoading) return;

    this.chatMessages.push({
      sender: 'user',
      text: message
    });

    this.chatInput = '';

    if (this.loadingProfile) {
      this.chatMessages.push({
        sender: 'bot',
        text: 'Votre profil client est encore en cours de chargement. Veuillez réessayer dans quelques instants.'
      });
      return;
    }

    if (!this.client?.id) {
      this.chatMessages.push({
        sender: 'bot',
        text: 'Je ne peux pas accéder à vos données personnelles car votre profil client est introuvable.'
      });
      return;
    }

    this.chatbotLoading = true;

    this.assistantService.sendMessage(message, this.client.id).subscribe({
      next: response => {
        this.chatMessages.push({
          sender: 'bot',
          text: response.answer || 'Je n’ai pas trouvé de réponse.'
        });

        this.chatbotLoading = false;
      },
      error: err => {
        console.error(err);

        this.chatMessages.push({
          sender: 'bot',
          text: 'Désolé, une erreur est survenue lors de la communication avec l’assistant. Veuillez réessayer.'
        });

        this.chatbotLoading = false;
      }
    });
  }

  // Méthode permettant de charger le profil du client connecté à partir de son email
  loadCurrentClient(email: string): void {
    this.clientService.getAllClients().subscribe({
      next: clients => {
        const found = clients.find(
          c => c.email?.toLowerCase() === email.toLowerCase()
        );

        this.client = found ?? null;
        this.loadingProfile = false;

        if (!found) {
          this.profileError = 'Aucun profil client trouvé pour cet email.';
        }
      },
      error: err => {
        console.error(err);
        this.loadingProfile = false;
        this.profileError = 'Impossible de charger les données client.';
      }
    });
  }

  // Méthode permettant de charger les contrats du client connecté
  // Les contrats sont filtrés selon l’email du client
  loadPolicies(email: string): void {
    this.policyService.getAllPolicies().subscribe({
      next: policies => {
        this.policies = policies.filter(
          policy => policy.client?.email?.toLowerCase() === email.toLowerCase()
        );

        this.loadingPolicies = false;
      },
      error: err => {
        console.error(err);
        this.loadingPolicies = false;
        this.policiesError = 'Impossible de charger les contrats.';
      }
    });
  }

  // Méthode permettant de récupérer l’email de l’utilisateur depuis le localStorage
  getStoredEmail(): string | null {
    return localStorage.getItem('email');
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
  // Elles peuvent être utilisées dans l’avatar du profil
  get initials(): string {
    if (!this.client) return 'CI';

    const first = this.client.firstName?.charAt(0) || '';
    const last = this.client.lastName?.charAt(0) || '';

    return `${first}${last}`.toUpperCase();
  }

  // Getter qui retourne le nombre de contrats actifs du client
  get activeContractsCount(): number {
    return this.policies.filter(policy => this.getPolicyStatus(policy) === 'ACTIF').length;
  }

  // Getter qui retourne le nombre de contrats expirés du client
  get expiredContractsCount(): number {
    return this.policies.filter(policy => this.getPolicyStatus(policy) === 'EXPIRÉ').length;
  }

  // Getter qui retourne le nombre de sinistres actifs affichés dans le tableau de bord
  get activeClaimsCount(): number {
    return this.claims.length;
  }

  // Getter qui retourne le nombre de types de contrats différents détenus par le client
  get totalTypesCount(): number {
    return new Set(
      this.policies
        .map(policy => (policy.type || '').trim())
        .filter(type => !!type)
    ).size;
  }

  // Getter qui retourne les contrats triés
  // Les contrats actifs sont affichés en premier, puis classés selon leur date d’échéance
  get sortedPolicies(): Policy[] {
    return [...this.policies].sort((a, b) => {
      const aActive = this.isPolicyActive(a) ? 0 : 1;
      const bActive = this.isPolicyActive(b) ? 0 : 1;

      if (aActive !== bActive) {
        return aActive - bActive;
      }

      const aEnd = new Date(a.endDate).getTime();
      const bEnd = new Date(b.endDate).getTime();

      if (isNaN(aEnd) && isNaN(bEnd)) return 0;
      if (isNaN(aEnd)) return 1;
      if (isNaN(bEnd)) return -1;

      return aEnd - bEnd;
    });
  }

  // Getter qui retourne uniquement les contrats actifs
  get activePolicies(): Policy[] {
    return this.sortedPolicies.filter(policy => this.isPolicyActive(policy));
  }

  // Getter qui retourne la prochaine échéance de renouvellement parmi les contrats actifs
  get nextRenewalLabel(): string {
    const activePolicies = this.sortedPolicies.filter(policy => this.isPolicyActive(policy));

    if (!activePolicies.length) {
      return 'Aucune échéance active disponible';
    }

    const nextPolicy = activePolicies[0];
    return `${nextPolicy.policyNumber} · ${this.formatDate(nextPolicy.endDate)}`;
  }

  // Méthode permettant de formater une date au format français
  formatDate(date: string | undefined): string {
    if (!date) return '-';

    const d = new Date(date);

    if (isNaN(d.getTime())) return date;

    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Méthode qui construit le titre d’un contrat à partir de son type et de sa formule
  getPolicyTitle(policy: Policy): string {
    const type = policy.type || 'Contrat';
    const formule = policy.formule ? ` ${policy.formule}` : '';

    return `${type}${formule}`;
  }

  // Méthode qui construit le sous-titre d’un contrat
  // Elle affiche les détails de couverture, le code produit ou un texte par défaut
  getPolicySubtitle(policy: Policy): string {
    if (policy.coverageDetails && policy.coverageDetails.trim()) {
      return policy.coverageDetails;
    }

    if (policy.productCode && policy.productCode.trim()) {
      return `Code produit : ${policy.productCode}`;
    }

    return 'Contrat d’assurance enregistré';
  }

  // Méthode qui retourne le statut d’un contrat selon sa date de fin
  // Un contrat est considéré comme expiré si sa date de fin est dépassée
  getPolicyStatus(policy: Policy): string {
    const today = new Date();
    const end = new Date(policy.endDate);

    if (!isNaN(end.getTime()) && end < today) {
      return 'EXPIRÉ';
    }

    return 'ACTIF';
  }

  // Méthode qui vérifie si un contrat est actif
  isPolicyActive(policy: Policy): boolean {
    return this.getPolicyStatus(policy) === 'ACTIF';
  }

  // Méthode qui retourne la classe CSS associée au type de contrat
  // Elle permet d’adapter l’apparence visuelle de chaque carte de police
  getPolicyTone(policy: Policy): string {
    const type = (policy.type || '').toUpperCase();

    switch (type) {
      case 'AUTO':
        return 'tone-auto';

      case 'SANTE':
      case 'HEALTH':
        return 'tone-health';

      case 'HABITATION':
      case 'HOME':
        return 'tone-home';

      case 'TRAVEL':
      case 'VOYAGE':
        return 'tone-travel';

      case 'LIFE':
      case 'VIE':
        return 'tone-life';

      default:
        return 'tone-default';
    }
  }

  // Méthode permettant de déconnecter le client puis de le rediriger vers la page de connexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Méthode permettant d’ouvrir la page complète de l’assistant chatbot
  openAssistantPage(): void {
    this.router.navigate(['/chatbot']);
  }
}
