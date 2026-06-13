// Importation des modules nécessaires d’Angular
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Importation du service utilisé pour gérer la configuration des agents IA
import { AiAgentConfig, AiConfigService } from "../../data-access/ai-config.service";

// Importation des composants de mise en page
import { SidebarComponent } from "../../../../layout/components/sidebar/sidebar.component";
import { TopbarComponent } from "../../../../layout/components/topbar/topbar.component";


// Interface utilisée pour enrichir la configuration IA avec des informations d’affichage
interface AgentUiItem extends AiAgentConfig {
  title: string;
  description: string;
  icon: string;
  saving?: boolean;
}

// Déclaration du composant responsable de la page des paramètres IA
@Component({
  selector: 'app-parametres-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './parametres-ia.component.html',
  styleUrls: ['./parametres-ia.component.css']
})
export class ParametresIaComponent implements OnInit {

  // Indique si les paramètres sont en cours de chargement
  loading = false;

  // Message affiché lorsqu’une opération réussit
  successMessage = '';

  // Message affiché lorsqu’une erreur se produit
  errorMessage = '';

  // Liste des configurations IA affichées dans l’interface
  configs: AgentUiItem[] = [];

  // Métadonnées utilisées pour personnaliser l’affichage de chaque agent IA
  // Elles permettent d’associer un titre, une description et une icône à chaque agent
  private readonly agentMeta: Record<string, { title: string; description: string; icon: string }> = {
    AGENT_ROUTEUR: {
      title: 'Agent Routeur',
      description: 'Détermine le type de sinistre et oriente le dossier vers le bon circuit.',
      icon: 'R'
    },
    AGENT_VALIDATION: {
      title: 'Agent Validation',
      description: 'Vérifie la conformité du dossier avec les règles métier et la police.',
      icon: 'V'
    },
    AGENT_ESTIMATEUR: {
      title: 'Agent Estimateur',
      description: 'Estime le coût potentiel du sinistre à partir des données disponibles.',
      icon: 'E'
    }
  };

  // Injection du service permettant de récupérer et modifier les paramètres IA
  constructor(private aiConfigService: AiConfigService) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle lance la récupération des configurations des agents IA
  ngOnInit(): void {
    this.loadConfigs();
  }

  // Méthode responsable du chargement des paramètres IA depuis le backend
  // Elle normalise les données reçues pour les adapter à l’affichage dans l’interface
  loadConfigs(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.aiConfigService.getAllConfigs().subscribe({
      next: (data) => {
        const existing = data || [];

        // Création d’une liste complète des agents à afficher
        // Si un agent n’existe pas encore en base, un seuil par défaut est utilisé
        const normalized: AgentUiItem[] = Object.keys(this.agentMeta).map((key) => {
          const found = existing.find(item => item.agentName === key);

          return {
            id: found?.id,
            agentName: key,
            confidenceThreshold: found?.confidenceThreshold ?? this.getDefaultThreshold(key),
            title: this.agentMeta[key].title,
            description: this.agentMeta[key].description,
            icon: this.agentMeta[key].icon,
            saving: false
          };
        });

        this.configs = normalized;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement config IA:', err);
        this.errorMessage = 'Erreur lors du chargement des paramètres IA.';
        this.loading = false;
      }
    });
  }

  // Méthode permettant d’enregistrer la configuration d’un agent IA
  // Elle vérifie d’abord que le seuil de confiance est valide avant l’envoi au backend
  saveConfig(config: AgentUiItem): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
      this.errorMessage = `Le seuil de ${config.title} doit être entre 0 et 1.`;
      return;
    }

    config.saving = true;

    this.aiConfigService.updateConfig(config).subscribe({
      next: (updated) => {
        config.id = updated.id;
        config.confidenceThreshold = updated.confidenceThreshold;
        config.saving = false;
        this.successMessage = `Seuil mis à jour avec succès pour ${config.title}.`;
      },
      error: (err) => {
        console.error('Erreur sauvegarde config IA:', err);
        config.saving = false;
        this.errorMessage = `Erreur lors de l’enregistrement de ${config.title}.`;
      }
    });
  }

  // Méthode qui transforme un seuil entre 0 et 1 en pourcentage lisible
  formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  // Méthode appelée lorsque l’utilisateur change la valeur du slider
  // Elle met à jour le seuil de confiance de l’agent concerné
  onSliderChange(config: AgentUiItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    config.confidenceThreshold = Number(input.value);
  }

  // Méthode privée qui retourne un seuil de confiance par défaut selon l’agent IA
  private getDefaultThreshold(agentName: string): number {
    switch (agentName) {
      case 'AGENT_ROUTEUR':
        return 0.70;
      case 'AGENT_VALIDATION':
        return 0.60;
      case 'AGENT_ESTIMATEUR':
        return 0.70;
      default:
        return 0.70;
    }
  }

  // Méthode qui génère le fond visuel du slider selon la valeur du seuil
  // La partie remplie représente le pourcentage du seuil sélectionné
  getSliderBackground(value: number): string {
    const percent = value * 100;
    return `linear-gradient(to right, #2563eb ${percent}%, #dbeafe ${percent}%)`;
  }
}
