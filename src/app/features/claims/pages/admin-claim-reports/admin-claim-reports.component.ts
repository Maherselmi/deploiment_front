// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

// Importation du modèle représentant les résultats des agents IA
import { AgentResult } from "../../../agents/models/agent-result.model";

// Importation du service permettant de récupérer les résultats des agents
import { AgentResultService } from "../../../agents/data-access/agent-result.service";

// Importation du service et du modèle utilisés pour récupérer les rapports d’un dossier
import { AdminClaimReports, ClaimReportAdminService } from "../../data-access/claim-report-admin.service";


// Déclaration du composant Angular responsable de l’affichage des rapports d’un dossier côté administrateur
@Component({
  selector: 'app-admin-claim-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-claim-reports.component.html',
  styleUrls: ['./admin-claim-reports.component.css']
})
export class AdminClaimReportsComponent implements OnInit {

  // Identifiant du dossier récupéré depuis les paramètres de l’URL
  claimId = 0;

  // Rapports liés au dossier sélectionné
  reports: AdminClaimReports | null = null;

  // Liste des résultats produits par les agents IA pour ce dossier
  agentResults: AgentResult[] = [];

  // Variables utilisées pour gérer l’état de chargement et les messages d’erreur
  loading = true;
  errorMessage = '';

  // Injection des services nécessaires :
  // ActivatedRoute pour lire les paramètres de l’URL,
  // ClaimReportAdminService pour charger les rapports,
  // AgentResultService pour récupérer les résultats des agents IA
  constructor(
    private route: ActivatedRoute,
    private reportService: ClaimReportAdminService,
    private agentResultService: AgentResultService
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle récupère l’identifiant du dossier depuis l’URL puis lance le chargement des rapports
  ngOnInit(): void {
    this.claimId = Number(this.route.snapshot.queryParamMap.get('claimId'));

    if (!this.claimId || this.claimId <= 0) {
      this.errorMessage = 'ID dossier invalide.';
      this.loading = false;
      return;
    }

    this.loadReports();
  }

  // Méthode responsable du chargement des rapports du dossier
  // Après récupération des rapports, elle charge aussi les résultats des agents associés
  loadReports(): void {
    this.loading = true;
    this.errorMessage = '';

    this.reportService.getReports(this.claimId).subscribe({
      next: data => {
        this.reports = data;
        this.loadAgentResults();
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Erreur lors du chargement des rapports.';
        this.loading = false;
      }
    });
  }

  // Méthode permettant de charger les résultats des agents IA liés au dossier courant
  // Les résultats sont filtrés selon l’identifiant du dossier sélectionné
  loadAgentResults(): void {
    this.agentResultService.getAll().subscribe({
      next: data => {
        this.agentResults = (data || []).filter(
          result => result.claim?.id === this.claimId
        );
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.agentResults = [];
        this.loading = false;
      }
    });
  }

  // Méthode qui retourne la classe CSS associée au statut du dossier
  // Elle permet d’afficher visuellement l’état du dossier dans l’interface
  getStatusClass(status?: string): string {
    switch (status) {
      case 'APPROVED': return 'approved';
      case 'REJECTED': return 'rejected';
      case 'PENDING_VALIDATION': return 'pending';
      case 'CLOSED': return 'closed';
      default: return 'default';
    }
  }

  // Méthode qui retourne la classe CSS associée au type d’agent IA
  // Elle permet d’afficher un badge différent pour chaque agent
  getAgentBadgeClass(name?: string): string {
    const map: Record<string, string> = {
      AgentRouteur: 'badge-routeur',
      AgentValidateur: 'badge-validateur',
      AgentEstimateur: 'badge-estimateur'
    };

    return map[name || ''] || 'badge-progress';
  }

  // Méthode qui formate le score de confiance sous forme de pourcentage
  // Elle prend en charge les valeurs entre 0 et 1 ou entre 0 et 100
  formatConfidence(score: number): string {
    if (score == null) return '0%';

    return score > 1 ? `${score.toFixed(0)}%` : `${(score * 100).toFixed(0)}%`;
  }

  // Méthode qui calcule la largeur de la barre de confiance
  // Elle limite la valeur maximale affichée à 100%
  getConfidenceWidth(score: number): string {
    if (score == null) return '0%';

    const value = score > 1 ? score : score * 100;

    return `${Math.min(value, 100)}%`;
  }

  // Méthode permettant de formater la réponse brute du LLM
  // Si la réponse contient du JSON, elle est transformée en texte lisible
  // Sinon, le texte brut est simplement nettoyé
  formatLlmResponse(raw?: string): string {
    if (!raw || !raw.trim()) {
      return 'Aucune réponse disponible.';
    }

    const cleaned = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      const json = JSON.parse(cleaned);
      return this.jsonToReadableText(json);
    } catch {
      return this.cleanRawText(cleaned);
    }
  }

  // Méthode privée permettant de transformer un objet JSON en texte lisible
  // Elle parcourt les clés du JSON et les convertit en libellés compréhensibles
  private jsonToReadableText(value: any): string {
    if (!value || typeof value !== 'object') {
      return String(value || '');
    }

    const lines: string[] = [];

    Object.entries(value).forEach(([key, val]) => {
      const label = this.humanizeKey(key);

      if (Array.isArray(val)) {
        lines.push(`${label} : ${val.join(', ')}`);
      } else if (val && typeof val === 'object') {
        lines.push(`${label} :`);

        Object.entries(val).forEach(([subKey, subVal]) => {
          lines.push(`- ${this.humanizeKey(subKey)} : ${subVal}`);
        });
      } else {
        lines.push(`${label} : ${val}`);
      }
    });

    return lines.join('\n');
  }

  // Méthode privée permettant de transformer les clés techniques en libellés lisibles
  // Elle améliore l’affichage des réponses JSON générées par les agents IA
  private humanizeKey(key: string): string {
    const labels: Record<string, string> = {
      type: 'Type détecté',
      decision: 'Décision',
      confidence: 'Confiance',
      justification: 'Justification',
      estimationMin: 'Estimation minimale',
      estimationMoyenne: 'Estimation moyenne',
      estimationMax: 'Estimation maximale',
      elementsEndommages: 'Éléments endommagés',
      imageAnalysis: 'Analyse de l’image',
      damageIndicators: 'Indices de dommage',
      detectedObjects: 'Objets détectés'
    };

    return labels[key] || key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim();
  }

  // Méthode privée permettant de nettoyer un texte brut non JSON
  // Elle supprime certains caractères techniques pour rendre la réponse plus lisible
  private cleanRawText(text: string): string {
    return text
      .replace(/[{}"]/g, '')
      .replace(/,/g, '\n')
      .replace(/:/g, ' : ')
      .trim();
  }
}
