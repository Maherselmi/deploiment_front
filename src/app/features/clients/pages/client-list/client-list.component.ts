// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Importation des composants de mise en page
import { SidebarComponent } from "../../../../layout/components/sidebar/sidebar.component";
import { TopbarComponent } from "../../../../layout/components/topbar/topbar.component";

// Importation du modèle Client et du service utilisé pour récupérer les clients
import { Client, ClientService } from "../../data-access/client.service";


// Déclaration du composant Angular responsable de l’affichage de la liste des clients
@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.css']
})
export class ClientListComponent implements OnInit {

  // Liste complète des clients récupérés depuis le backend
  clients: Client[] = [];

  // Liste filtrée des clients affichés après une recherche
  filtered: Client[] = [];

  // Indique si les clients sont encore en cours de chargement
  loading = true;

  // Terme saisi par l’utilisateur dans la barre de recherche
  searchTerm = '';

  // Client actuellement sélectionné pour afficher ou masquer ses détails
  selectedClient: Client | null = null;

  // Injection du service client et du routeur Angular
  constructor(
    private clientService: ClientService,
    private router: Router
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle lance la récupération de la liste des clients
  ngOnInit(): void {
    this.loadClients();
  }

  // Méthode responsable du chargement des clients depuis le backend
  // Elle initialise aussi la liste filtrée utilisée pour l’affichage
  loadClients(): void {
    this.loading = true;

    this.clientService.getAllClients().subscribe({
      next: (data) => {
        this.clients = data || [];
        this.filtered = [...this.clients];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement clients', err);
        this.loading = false;
      }
    });
  }

  // Méthode appelée lors de la recherche
  // Elle filtre les clients selon le prénom, le nom, l’email ou le téléphone
  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filtered = [...this.clients];
      return;
    }

    this.filtered = this.clients.filter((client) =>
      client.firstName?.toLowerCase().includes(term) ||
      client.lastName?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.phone?.toLowerCase().includes(term)
    );
  }

  // Méthode permettant de sélectionner ou désélectionner un client
  // Si le même client est cliqué deux fois, ses détails sont masqués
  selectClient(client: Client): void {
    this.selectedClient = this.selectedClient?.id === client.id ? null : client;
  }

  // Méthode permettant de générer les initiales d’un client
  // Elles peuvent être utilisées dans un avatar ou une carte client
  getInitials(client: Client): string {
    return ((client.firstName?.[0] || '') + (client.lastName?.[0] || '')).toUpperCase() || '?';
  }

  // Méthode qui retourne une couleur de fond pour l’avatar du client
  // La couleur est choisie selon l’identifiant du client
  getAvatarColor(id: number): string {
    const colors = ['#e8eeff', '#fff3e0', '#e8f5e9', '#fce4ec', '#f3e5f5', '#e0f2f1'];
    return colors[id % colors.length];
  }

  // Méthode qui retourne une couleur de texte adaptée à l’avatar du client
  // La couleur est également choisie selon l’identifiant du client
  getTextColor(id: number): string {
    const colors = ['#1a2460', '#e65100', '#1b5e20', '#880e4f', '#4a148c', '#004d40'];
    return colors[id % colors.length];
  }

  // Getter qui retourne le nombre de clients ayant une adresse email renseignée
  get totalWithEmail(): number {
    return this.clients.filter(client => !!client.email?.trim()).length;
  }

  // Getter qui retourne le nombre de clients ayant un numéro de téléphone renseigné
  get totalWithPhone(): number {
    return this.clients.filter(client => !!client.phone?.trim()).length;
  }

  // Méthode permettant de naviguer vers la page des dossiers
  // Elle peut être utilisée par un bouton d’action dans l’interface
  onNewClaim(): void {
    this.router.navigate(['/dossiers']);
  }
}
