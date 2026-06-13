// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Importation des éléments nécessaires pour afficher les graphiques avec ng2-charts et Chart.js
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  ChartOptions
} from 'chart.js';

// Importation des composants de mise en page
import { SidebarComponent } from "../../../../layout/components/sidebar/sidebar.component";
import { TopbarComponent } from "../../../../layout/components/topbar/topbar.component";

// Importation du service et du modèle utilisés pour récupérer les résultats des agents IA
import { AgentResult, AgentResultService } from "../../../agents/data-access/agent-result.service";


// Déclaration du composant Angular responsable du tableau de bord administrateur
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  // Injection du service des résultats agents et du routeur Angular
  constructor(
    private agentResultService: AgentResultService,
    private router: Router
  ) {}

  // Seuil de confiance utilisé pour décider si une validation humaine est nécessaire
  threshold = {
    value: 75,
    message: 'En dessous → Human-in-the-Loop activé'
  };

  // Type du graphique linéaire utilisé pour suivre l’évolution des scores dans le temps
  public lineChartType: 'line' = 'line';

  // Données du graphique linéaire représentant les scores des agents par date
  public lineChartData: ChartConfiguration<'line', number[], string>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Agent Routeur',
        data: [],
        tension: 0.35
      },
      {
        label: 'Agent Validateur',
        data: [],
        tension: 0.35
      },
      {
        label: 'Agent Estimateur',
        data: [],
        tension: 0.35
      }
    ]
  };

  // Options d’affichage du graphique linéaire
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100
      }
    }
  };

  // Type du graphique en barres utilisé pour comparer les scores moyens des agents
  public barChartType: 'bar' = 'bar';

  // Données du graphique en barres représentant le score moyen global de chaque agent
  public barChartData: ChartConfiguration<'bar', number[], string>['data'] = {
    labels: ['Routeur', 'Validateur', 'Estimateur'],
    datasets: [
      {
        label: 'Score moyen (%)',
        data: [0, 0, 0],
        borderRadius: 10
      }
    ]
  };

  // Options d’affichage du graphique en barres
  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100
      }
    }
  };

  // Type du graphique circulaire utilisé pour afficher la répartition des décisions
  public doughnutChartType: 'doughnut' = 'doughnut';

  // Données du graphique circulaire représentant les dossiers validés, en revue humaine ou refusés
  public doughnutChartData: ChartConfiguration<'doughnut', number[], string>['data'] = {
    labels: ['Validés', 'Human Review', 'Refusés'],
    datasets: [
      {
        data: [0, 0, 0]
      }
    ]
  };

  // Options d’affichage du graphique circulaire
  public doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        display: true,
        position: 'left'
      }
    }
  };

  // Méthode exécutée automatiquement au chargement du composant
  // Elle lance la récupération des résultats des agents IA
  ngOnInit(): void {
    this.loadAgentResults();
  }

  // Getter qui retourne le nombre total de décisions validées
  get totalValidated(): number {
    const data: number[] = this.doughnutChartData.datasets[0]?.data ?? [];
    return Number(data[0] ?? 0);
  }

  // Getter qui retourne le nombre total de dossiers nécessitant une revue humaine
  get totalHumanReview(): number {
    const data: number[] = this.doughnutChartData.datasets[0]?.data ?? [];
    return Number(data[1] ?? 0);
  }

  // Getter qui retourne le nombre total de dossiers refusés
  get totalRejected(): number {
    const data: number[] = this.doughnutChartData.datasets[0]?.data ?? [];
    return Number(data[2] ?? 0);
  }

  // Getter qui calcule le score moyen global des agents IA
  // Il se base sur les valeurs du graphique en barres
  get averageGlobalScore(): number {
    const values: number[] = this.barChartData.datasets[0]?.data ?? [];

    if (values.length === 0) {
      return 0;
    }

    const total = values.reduce<number>((sum, value) => {
      return sum + Number(value ?? 0);
    }, 0);

    return Math.round(total / values.length);
  }

  // Méthode responsable du chargement des résultats des agents IA depuis le backend
  // Après récupération, elle construit les trois graphiques du tableau de bord
  loadAgentResults(): void {
    this.agentResultService.getAll().subscribe({
      next: (results) => {
        this.buildLineChart(results);
        this.buildBarChart(results);
        this.buildDoughnutChart(results);
      },
      error: (error) => {
        console.error('Erreur chargement agent results', error);
      }
    });
  }

  // Méthode permettant de construire le graphique linéaire
  // Elle regroupe les scores moyens des agents par date de création
  buildLineChart(results: AgentResult[]): void {
    const sortedResults = [...results].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const labels: string[] = [
      ...new Set(
        sortedResults.map(r => new Date(r.createdAt).toLocaleDateString('fr-FR'))
      )
    ];

    this.lineChartData = {
      labels,
      datasets: [
        {
          label: 'Agent Routeur',
          data: this.getAverageScoresByAgent(labels, sortedResults, 'routeur'),
          tension: 0.35
        },
        {
          label: 'Agent Validateur',
          data: this.getAverageScoresByAgent(labels, sortedResults, 'validateur'),
          tension: 0.35
        },
        {
          label: 'Agent Estimateur',
          data: this.getAverageScoresByAgent(labels, sortedResults, 'estimateur'),
          tension: 0.35
        }
      ]
    };
  }

  // Méthode permettant de construire le graphique en barres
  // Elle calcule le score moyen global pour chaque agent IA
  buildBarChart(results: AgentResult[]): void {
    const routeur = this.getGlobalAverage(results, 'routeur');
    const validateur = this.getGlobalAverage(results, 'validateur');
    const estimateur = this.getGlobalAverage(results, 'estimateur');

    this.barChartData = {
      labels: ['Routeur', 'Validateur', 'Estimateur'],
      datasets: [
        {
          label: 'Score moyen (%)',
          data: [routeur, validateur, estimateur],
          borderRadius: 10
        }
      ]
    };
  }

  // Méthode permettant de construire le graphique circulaire
  // Elle classe les résultats selon leur conclusion : validés, revue humaine ou refusés
  buildDoughnutChart(results: AgentResult[]): void {
    const validated = results.filter(r =>
      !r.needsHumanReview &&
      this.normalizeScore(r.confidenceScore) >= this.threshold.value &&
      this.isCovered(r.conclusion)
    ).length;

    const humanReview = results.filter(r =>
      r.needsHumanReview || this.isUnknown(r.conclusion)
    ).length;

    const rejected = results.filter(r =>
      this.isRejected(r.conclusion)
    ).length;

    this.doughnutChartData = {
      labels: ['Validés', 'Human Review', 'Refusés'],
      datasets: [
        {
          data: [validated, humanReview, rejected]
        }
      ]
    };
  }

  // Méthode privée qui calcule les scores moyens d’un agent pour chaque date
  // Elle permet d’alimenter le graphique linéaire
  private getAverageScoresByAgent(
    labels: string[],
    results: AgentResult[],
    keyword: string
  ): number[] {
    return labels.map((label: string) => {
      const filtered = results.filter(r =>
        (r.agentName ?? '').toLowerCase().includes(keyword) &&
        new Date(r.createdAt).toLocaleDateString('fr-FR') === label
      );

      if (filtered.length === 0) {
        return 0;
      }

      const total = filtered.reduce<number>((sum, item) => {
        return sum + this.normalizeScore(item.confidenceScore);
      }, 0);

      return Math.round(total / filtered.length);
    });
  }

  // Méthode privée qui calcule le score moyen global d’un agent donné
  // Elle est utilisée pour alimenter le graphique en barres
  private getGlobalAverage(results: AgentResult[], keyword: string): number {
    const filtered = results.filter(r =>
      (r.agentName ?? '').toLowerCase().includes(keyword)
    );

    if (filtered.length === 0) {
      return 0;
    }

    const total = filtered.reduce<number>((sum, item) => {
      return sum + this.normalizeScore(item.confidenceScore);
    }, 0);

    return Math.round(total / filtered.length);
  }

  // Méthode privée qui normalise un score de confiance en pourcentage
  // Elle accepte les scores entre 0 et 1 ainsi que les scores déjà exprimés sur 100
  private normalizeScore(score: number | undefined | null): number {
    const value = Number(score ?? 0);

    if (value >= 0 && value <= 1) {
      return Math.round(value * 100);
    }

    return Math.round(value);
  }

  // Méthode privée qui vérifie si une conclusion correspond à un rejet
  private isRejected(conclusion: string | undefined | null): boolean {
    const value = (conclusion ?? '').toLowerCase();
    return value.includes('rejet') || value.includes('exclu') || value === 'exclu';
  }

  // Méthode privée qui vérifie si une conclusion correspond à un dossier couvert ou approuvé
  private isCovered(conclusion: string | undefined | null): boolean {
    const value = (conclusion ?? '').toLowerCase();
    return value.includes('couvert') || value.includes('approuv');
  }

  // Méthode privée qui vérifie si une conclusion indique un résultat inconnu
  private isUnknown(conclusion: string | undefined | null): boolean {
    const value = (conclusion ?? '').toLowerCase();
    return value.includes('inconnu');
  }

  // Méthode permettant de naviguer vers la page des dossiers
  // Elle peut être utilisée par un bouton d’action dans l’interface
  onNewClaim(): void {
    this.router.navigate(['/dossiers']);
  }
}
