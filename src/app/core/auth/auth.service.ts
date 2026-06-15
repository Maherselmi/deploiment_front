// Importation des modules nécessaires d’Angular et RxJS
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';


// Interface représentant les données envoyées lors de la connexion
export interface LoginRequest {
  email: string;
  password: string;
}

// Interface représentant la réponse retournée par l’API après une connexion réussie
export interface AuthResponse {
  token: string;
  email: string;
  role: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}
// Déclaration du service d’authentification comme service injectable globalement
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // URL de base de l’API d’authentification côté backend
  private apiUrl = `${environment.apiUrl}/api/auth`;
  constructor(private http: HttpClient, private router: Router) {}

  // Méthode utilisée pour connecter un utilisateur
  // Elle envoie les identifiants au backend, puis stocke les informations reçues
  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => {
        // Sauvegarde des informations d’authentification dans le localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('email', response.email);
        localStorage.setItem('role', response.role);
      })
    );
  }

  // Méthode utilisée pour déconnecter l’utilisateur
  // Elle supprime les informations d’authentification stockées localement
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  }

  // Méthode qui permet de récupérer le token JWT de l’utilisateur connecté
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Méthode qui permet de récupérer le rôle de l’utilisateur connecté
  getRole(): string | null {
    return localStorage.getItem('role');
  }

  // Méthode qui vérifie si un utilisateur est connecté
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
  registerClient(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register/client`, data).pipe(
      tap((response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('email', response.email);
        localStorage.setItem('role', response.role);
      })
    );
  }
}
