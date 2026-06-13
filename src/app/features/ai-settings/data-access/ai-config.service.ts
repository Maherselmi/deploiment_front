// Importation des modules nécessaires d’Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


// Interface représentant la configuration d’un agent IA
export interface AiAgentConfig {
  id?: number;
  agentName: string;
  confidenceThreshold: number;
}

// Déclaration du service comme injectable dans toute l’application
@Injectable({
  providedIn: 'root'
})
export class AiConfigService {

  // URL de l’API backend utilisée pour gérer la configuration des agents IA
  private readonly apiUrl = 'http://localhost:8080/api/admin/ai-config';

  // Injection de HttpClient pour communiquer avec le backend
  constructor(private http: HttpClient) {}

  // Méthode permettant de récupérer toutes les configurations des agents IA
  getAllConfigs(): Observable<AiAgentConfig[]> {
    return this.http.get<AiAgentConfig[]>(this.apiUrl);
  }

  // Méthode permettant de mettre à jour la configuration d’un agent IA
  // Elle envoie au backend le nom de l’agent et son seuil de confiance
  updateConfig(config: AiAgentConfig): Observable<AiAgentConfig> {
    return this.http.put<AiAgentConfig>(this.apiUrl, {
      agentName: config.agentName,
      confidenceThreshold: config.confidenceThreshold
    });
  }
}
