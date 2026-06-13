// Importation des modules nécessaires d’Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Importation de Observable pour gérer les réponses asynchrones du backend
import { Observable } from 'rxjs';


// Interface représentant les rapports liés à un dossier de sinistre côté administrateur
export interface AdminClaimReports {
  claimId: number;
  description: string;
  status: string;
  incidentDate: string;
  aiReport: string;
  clientReport: string;
}

// Déclaration du service comme injectable dans toute l’application
@Injectable({
  providedIn: 'root'
})
export class ClaimReportAdminService {

  // URL de base de l’API backend utilisée pour accéder aux dossiers de sinistre
  private apiUrl = 'http://localhost:8080/api/claims';

  // Injection de HttpClient pour envoyer des requêtes HTTP vers le backend
  constructor(private http: HttpClient) {}

  // Méthode permettant de récupérer les rapports d’un dossier de sinistre précis
  // Elle retourne à la fois le rapport généré par l’IA et le rapport client
  getReports(claimId: number): Observable<AdminClaimReports> {
    return this.http.get<AdminClaimReports>(`${this.apiUrl}/${claimId}/reports`);
  }
}
