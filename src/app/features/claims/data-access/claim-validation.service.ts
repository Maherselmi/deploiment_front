// Importation des modules nécessaires d’Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Importation de Observable pour gérer les réponses asynchrones du backend
import { Observable } from 'rxjs';

// Importation du modèle représentant un dossier de sinistre
import { Claim } from "../models/claim.model";
import {environment} from "../../../../environments/environment";


// Interface représentant les données détaillées d’un dossier à valider par un expert humain
export interface ReviewData {
  id: number;
  description: string;
  incidentDate: string;
  createdAt: string;
  status: string;
  aiReport: string;
}

// Interface représentant la décision humaine envoyée lors de l’approbation ou du rejet
// Elle peut contenir un commentaire ainsi qu’une estimation finale optionnelle
export interface HumanDecisionRequest {
  comment: string;
  finalEstimationMin?: number | null;
  finalEstimationMoyenne?: number | null;
  finalEstimationMax?: number | null;
}

// Interface représentant la réponse retournée par le backend après une décision humaine
export interface DecisionResponse {
  message: string;
  claimId: number;
  status: string;
}

// Déclaration du service comme injectable dans toute l’application
@Injectable({
  providedIn: 'root'
})
export class ClaimValidationService {

  // URL de base de l’API backend utilisée pour gérer la validation des dossiers de sinistre
  private readonly BASE_URL = `${environment.apiUrl}/api/claims`;

  // Injection de HttpClient pour envoyer des requêtes HTTP vers le backend
  constructor(private http: HttpClient) {}

  // Méthode permettant de récupérer les dossiers en attente de validation humaine
  getPendingClaims(): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.BASE_URL}/pending-validation`);
  }

  // Méthode permettant de récupérer les informations détaillées d’un dossier à examiner
  // Elle est utilisée par l’expert pour consulter le rapport IA avant de prendre une décision
  getClaimReview(id: number): Observable<ReviewData> {
    return this.http.get<ReviewData>(`${this.BASE_URL}/${id}/review`);
  }

  // Méthode permettant d’approuver un dossier de sinistre
  // Elle envoie au backend le commentaire de l’expert et les estimations finales si elles existent
  approveClaim(
    id: number,
    payload: HumanDecisionRequest
  ): Observable<DecisionResponse> {
    return this.http.post<DecisionResponse>(
      `${this.BASE_URL}/${id}/approve`,
      payload
    );
  }

  // Méthode permettant de rejeter un dossier de sinistre
  // Elle envoie au backend un commentaire expliquant la raison du rejet
  rejectClaim(
    id: number,
    comment: string
  ): Observable<DecisionResponse> {
    return this.http.post<DecisionResponse>(
      `${this.BASE_URL}/${id}/reject`,
      { comment }
    );
  }
}
