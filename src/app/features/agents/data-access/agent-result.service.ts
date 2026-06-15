// Importation des modules nécessaires d’Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from "../../../../environments/environment";


// Interface représentant le résultat retourné par un agent intelligent
export interface AgentResult {
  id: number;
  agentName: string;
  conclusion: string;
  confidenceScore: number;
  needsHumanReview: boolean;
  rawLlmResponse: string;
  createdAt: string;

  // Informations optionnelles liées au sinistre analysé par l’agent
  claim?: {
    id: number;
    description: string;
    status: string;

    // Informations optionnelles liées à la police d’assurance du sinistre
    policy?: {
      type: string;
      policyNumber: string;

      // Informations optionnelles du client associé à la police
      client?: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

// Déclaration du service comme injectable dans toute l’application
@Injectable({ providedIn: 'root' })
export class AgentResultService {

  // URL de base de l’API backend pour gérer les résultats des agents
  private apiUrl = `${environment.apiUrl}/api/agent-results`;
  // Injection de HttpClient pour envoyer des requêtes HTTP vers le backend
  constructor(private http: HttpClient) {}

  // Méthode permettant de récupérer tous les résultats générés par les agents
  getAll(): Observable<AgentResult[]> {
    return this.http.get<AgentResult[]>(this.apiUrl);
  }

  // Méthode permettant de récupérer les résultats des agents liés à un sinistre spécifique
  getClaimById(claimId: number): Observable<AgentResult[]> {
    return this.http.get<AgentResult[]>(`${this.apiUrl}/claim/${claimId}`);
  }

  // Méthode permettant de récupérer les résultats des agents à partir de l’identifiant d’un sinistre
  getResultsByClaimId(claimId: number): Observable<AgentResult[]> {
    return this.http.get<AgentResult[]>(`${this.apiUrl}/claim/${claimId}`);
  }
}
