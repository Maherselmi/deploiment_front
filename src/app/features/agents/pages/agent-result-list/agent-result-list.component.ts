// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Importation du service permettant de récupérer les résultats des agents
import { AgentResult, AgentResultService } from "../../data-access/agent-result.service";

// Importation des composants de layout utilisés dans la page
import { SidebarComponent } from "../../../../layout/components/sidebar/sidebar.component";
import { TopbarComponent } from "../../../../layout/components/topbar/topbar.component";


// Interface représentant un groupe de résultats liés à un même sinistre
interface ClaimGroup {
  claimId: number;
  clientInitials: string;
  clientName: string;
  claimDescription: string;
  agents: AgentResult[];
}

// Déclaration du composant Angular responsable de l’affichage des résultats des agents
@Component({
  selector: 'app-agent-result-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, SidebarComponent, TopbarComponent],
  templateUrl: './agent-result-list.component.html',
  styleUrls: ['./agent-result-list.component.css']
})
export class AgentResultListComponent implements OnInit {

  // Liste complète des résultats retournés par les agents
  results: AgentResult[] = [];

  // Liste des résultats regroupés par sinistre
  claimGroups: ClaimGroup[] = [];

  // Liste filtrée des groupes affichés après recherche
  filteredGroups: ClaimGroup[] = [];

  // Indique si les données sont encore en cours de chargement
  loading = true;

  // Terme saisi par l’utilisateur dans la barre de recherche
  searchTerm = '';

  // Groupe sélectionné pour afficher ou masquer ses détails
  selectedGroup: ClaimGroup | null = null;

  // Injection du service des résultats agents et du routeur Angular
  constructor(
    private agentResultService: AgentResultService,
    private router: Router
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle permet de lancer le chargement des résultats agents
  ngOnInit(): void {
    this.loadResults();
  }

  // Méthode responsable du chargement des résultats depuis le backend
  // Elle récupère les données, les regroupe par sinistre, puis prépare l’affichage
  loadResults(): void {
    this.loading = true;

    this.agentResultService.getAll().subscribe({
      next: (data) => {
        this.results = data || [];
        this.claimGroups = this.groupByClaim(this.results);
        this.filteredGroups = [...this.claimGroups];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement résultats agents', err);
        this.loading = false;
      }
    });
  }

  // Méthode permettant de regrouper les résultats des agents par identifiant de sinistre
  // Chaque sinistre contient la liste des agents qui ont participé à son analyse
  groupByClaim(results: AgentResult[]): ClaimGroup[] {
    const map = new Map<number, AgentResult[]>();

    results.forEach(result => {
      const claimId = result.claim?.id ?? 0;

      if (!map.has(claimId)) {
        map.set(claimId, []);
      }

      map.get(claimId)!.push(result);
    });

    return Array.from(map.entries()).map(([claimId, agents]) => ({
      claimId,
      clientInitials: this.getInitials(agents[0]),
      clientName: this.getClientName(agents[0]),
      claimDescription: agents[0]?.claim?.description || 'Aucune description',

      // Tri des résultats du plus récent au plus ancien
      agents: agents.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }));
  }

  // Méthode appelée lors de la recherche
  // Elle filtre les groupes selon l’identifiant du sinistre, le client, la description ou les résultats des agents
  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredGroups = [...this.claimGroups];
      return;
    }

    this.filteredGroups = this.claimGroups.filter(group =>
      `${group.claimId}`.includes(term) ||
      group.clientName.toLowerCase().includes(term) ||
      group.claimDescription.toLowerCase().includes(term) ||
      group.agents.some(agent =>
        (agent.agentName ?? '').toLowerCase().includes(term) ||
        (agent.conclusion ?? '').toLowerCase().includes(term)
      )
    );
  }

  // Méthode permettant de sélectionner ou désélectionner un groupe de sinistre
  // Si le même groupe est cliqué deux fois, ses détails sont masqués
  selectGroup(group: ClaimGroup): void {
    this.selectedGroup = this.selectedGroup?.claimId === group.claimId ? null : group;
  }

  // Méthode qui vérifie si au moins un agent du groupe nécessite une revue humaine
  groupNeedsHuman(group: ClaimGroup): boolean {
    return group.agents.some(agent => agent.needsHumanReview);
  }

  // Méthode permettant de récupérer un agent précis dans un groupe selon son nom
  getAgentFromGroup(group: ClaimGroup, agentName: string): AgentResult | undefined {
    return group.agents.find(agent => agent.agentName === agentName);
  }

  // Méthode qui calcule le nombre total de résultats générés par un agent donné
  getCountByAgent(name: string): number {
    return this.results.filter(result => result.agentName === name).length;
  }

  // Méthode qui calcule le nombre total de résultats nécessitant une intervention humaine
  getCountNeedsHuman(): number {
    return this.results.filter(result => result.needsHumanReview).length;
  }

  // Méthode permettant de générer les initiales du client lié au sinistre
  getInitials(result: AgentResult): string {
    const firstName = result.claim?.policy?.client?.firstName || '';
    const lastName = result.claim?.policy?.client?.lastName || '';

    return ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?';
  }

  // Méthode permettant de récupérer le nom complet du client
  // Si les informations du client sont absentes, une valeur par défaut est retournée
  getClientName(result: AgentResult): string {
    const firstName = result.claim?.policy?.client?.firstName || '';
    const lastName = result.claim?.policy?.client?.lastName || '';

    return `${firstName} ${lastName}`.trim() || 'Client non renseigné';
  }

  // Méthode qui retourne la classe CSS correspondant au type d’agent
  // Elle permet d’afficher un badge spécifique pour chaque agent
  getAgentBadgeClass(name: string): string {
    const map: Record<string, string> = {
      AgentRouteur: 'badge-routeur',
      AgentValidateur: 'badge-validateur',
      AgentEstimateur: 'badge-estimateur'
    };

    return map[name] || 'badge-progress';
  }

  // Méthode qui retourne la classe CSS associée à la conclusion d’un agent
  // Elle permet d’afficher visuellement l’état du résultat : accepté, rejeté, en attente ou en cours
  getConclusionClass(conclusion: string): string {
    if (!conclusion) return 'badge-progress';

    const value = conclusion.toUpperCase();

    if (
      value.includes('COUVERT') ||
      value.includes('AUTO') ||
      value.includes('SANTE') ||
      value.includes('HABITATION')
    ) {
      return 'badge-ok';
    }

    if (value.includes('EXCLU') || value.includes('INCONNU')) {
      return 'badge-reject';
    }

    if (value.includes('ESTIMATION') || value.includes('PARTIEL')) {
      return 'badge-pending';
    }

    return 'badge-progress';
  }

  // Méthode qui formate le score de confiance sous forme de pourcentage
  // Elle prend en charge les scores exprimés entre 0 et 1 ou entre 0 et 100
  formatConfidence(score: number): string {
    if (score == null) return '0%';

    return score > 1 ? `${score.toFixed(0)}%` : `${(score * 100).toFixed(0)}%`;
  }

  // Méthode qui calcule la largeur de la barre de confiance affichée dans l’interface
  getConfidenceWidth(score: number): string {
    if (score == null) return '0%';

    const value = score > 1 ? score : score * 100;

    return `${Math.min(value, 100)}%`;
  }

  // Méthode qui retourne la couleur associée au score de confiance
  // Vert pour un score élevé, orange pour un score moyen, rouge pour un score faible
  getConfidenceColor(score: number): string {
    if (score == null) return '#dc2626';

    const value = score > 1 ? score : score * 100;

    if (value >= 75) return '#059669';
    if (value >= 50) return '#f0a500';

    return '#dc2626';
  }

  // Méthode qui retourne la date de création du résultat le plus récent dans un groupe
  getLatestCreatedAt(group: ClaimGroup): string | undefined {
    return group.agents[0]?.createdAt;
  }

  // Méthode permettant de naviguer vers la page des dossiers/sinistres
  onNewClaim(): void {
    this.router.navigate(['/dossiers']);
  }
}
