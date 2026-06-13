// Importation des modules Angular nécessaires au composant
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {ClaimService} from "../../../data-access/claim.service";

// Importation du service utilisé pour gérer les dossiers de sinistre


// Interface représentant un lien de navigation dans l’espace client
interface NavItem {
  label: string;
  route: string;
}

// Interface représentant un conseil affiché dans la zone d’envoi des documents
interface UploadTip {
  title: string;
  text: string;
  icon: string;
}

// Déclaration du composant Angular responsable de la deuxième étape de déclaration d’un sinistre
@Component({
  selector: 'app-claim-step2',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './claim-step2.component.html',
  styleUrls: ['./claim-step2.component.css'],
  host: { ngSkipHydration: 'true' }
})
export class ClaimStep2Component implements OnInit {

  // Liste des liens de navigation affichés dans l’interface client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/contrats' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste des conseils affichés pour guider l’utilisateur dans l’ajout des documents
  uploadTips: UploadTip[] = [
    {
      title: 'Vue d’ensemble',
      text: 'Prenez une photo générale du véhicule et de la scène.',
      icon: 'P'
    },
    {
      title: 'Dégâts visibles',
      text: 'Ajoutez des gros plans des zones endommagées.',
      icon: 'D'
    },
    {
      title: 'Immatriculation',
      text: 'Ajoutez la plaque ou le contexte si possible.',
      icon: 'I'
    },
    {
      title: 'Lieu du sinistre',
      text: 'Une photo du lieu peut aider à l’analyse du dossier.',
      icon: 'L'
    }
  ];

  // Liste des fichiers sélectionnés par l’utilisateur
  files: File[] = [];

  // Identifiant du dossier de sinistre récupéré depuis le localStorage
  claimId = 0;

  // Variables utilisées pour gérer l’état de chargement, les messages et la progression
  loading = false;
  errorMessage = '';
  successMessage = '';
  uploadProgress = 0;

  // Injection du service de sinistre, du routeur Angular et de PLATFORM_ID
  // PLATFORM_ID permet de vérifier si le code s’exécute côté navigateur
  constructor(
    private claimService: ClaimService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle récupère l’identifiant du dossier créé à l’étape précédente
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('claimId');

      if (stored) {
        this.claimId = Number(stored);
        console.log('ClaimId récupéré :', this.claimId);
      } else {
        this.errorMessage = 'Aucun dossier trouvé. Retournez à l’étape 1.';
        console.error('claimId introuvable dans localStorage');
      }
    }
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  // Elle prend en compte les routes liées aux différentes étapes de sinistre
  isActiveNav(route: string): boolean {
    const currentUrl = this.router.url;

    if (route === '/Claim_Home') {
      return (
        currentUrl.startsWith('/Claim_Home') ||
        currentUrl.startsWith('/claim') ||
        currentUrl.startsWith('/Sante') ||
        currentUrl.startsWith('/Habitation')
      );
    }

    return currentUrl === route;
  }

  // Méthode appelée lorsque l’utilisateur sélectionne des fichiers depuis son ordinateur
  // Elle transforme les fichiers sélectionnés en tableau puis les ajoute à la liste
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles: File[] = Array.from(input.files || []);
    this.addFiles(selectedFiles);
  }

  // Méthode appelée lorsque l’utilisateur glisse un fichier au-dessus de la zone d’upload
  // Elle empêche le comportement par défaut du navigateur
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  // Méthode appelée lorsque l’utilisateur dépose des fichiers dans la zone d’upload
  // Elle récupère les fichiers déposés puis les ajoute à la liste
  onDrop(event: DragEvent): void {
    event.preventDefault();
    const droppedFiles: File[] = Array.from(event.dataTransfer?.files || []);
    this.addFiles(droppedFiles);
  }

  // Méthode privée permettant d’ajouter des fichiers à la liste
  // Elle vérifie le type, la taille et évite les doublons
  private addFiles(newFiles: File[]): void {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024;

    this.errorMessage = '';
    this.successMessage = '';

    newFiles.forEach((file) => {
      if (!allowed.includes(file.type)) {
        this.errorMessage = 'Seuls les fichiers JPG, PNG et PDF sont autorisés.';
        return;
      }

      if (file.size > maxSize) {
        this.errorMessage = 'Chaque fichier doit faire moins de 10 Mo.';
        return;
      }

      const alreadyExists = this.files.some(
        (f) =>
          f.name === file.name &&
          f.size === file.size &&
          f.lastModified === file.lastModified
      );

      if (!alreadyExists) {
        this.files.push(file);
      }
    });
  }

  // Méthode permettant de supprimer un fichier de la liste selon son index
  removeFile(index: number): void {
    this.files.splice(index, 1);
  }

  // Méthode permettant de vider la liste des fichiers sélectionnés
  // Elle réinitialise aussi les messages et la progression d’upload
  clearFiles(input?: HTMLInputElement): void {
    this.files = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.uploadProgress = 0;

    if (input) {
      input.value = '';
    }
  }

  // Méthode qui vérifie si un fichier est un document PDF
  isPdf(file: File): boolean {
    return file.type === 'application/pdf';
  }

  // Méthode qui vérifie si un fichier est une image
  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // Méthode permettant de formater la taille d’un fichier en Ko ou en Mo
  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' Ko';
    }

    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  // Getter qui retourne le nombre total de fichiers sélectionnés
  get totalFiles(): number {
    return this.files.length;
  }

  // Getter qui calcule et retourne la taille totale des fichiers sélectionnés
  get totalSize(): string {
    const total = this.files.reduce((sum, file) => sum + file.size, 0);
    return this.formatSize(total);
  }

  // Getter qui indique si l’utilisateur peut lancer l’envoi des fichiers
  // L’upload est possible si un dossier existe, au moins un fichier est sélectionné et aucun chargement n’est en cours
  get canUpload(): boolean {
    return !this.loading && this.files.length > 0 && !!this.claimId;
  }

  // Méthode permettant de revenir à la première étape de déclaration
  back(): void {
    this.router.navigate(['/claim/step1']);
  }

  // Méthode principale d’envoi des documents
  // Elle envoie chaque fichier au backend puis déclenche le traitement du dossier par l’orchestrateur
  upload(): void {
    if (!this.claimId) {
      this.errorMessage = 'ClaimId introuvable. Retournez à l’étape 1.';
      return;
    }

    if (this.files.length === 0) {
      this.errorMessage = 'Ajoutez au moins un fichier.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.uploadProgress = 0;

    let completed = 0;

    this.files.forEach((file) => {
      this.claimService.uploadDocument(this.claimId, file).subscribe({
        next: (res) => {
          completed++;
          this.uploadProgress = Math.round((completed / this.files.length) * 100);
          console.log(`Fichier ${completed}/${this.files.length} uploadé :`, res);

          // Lorsque tous les fichiers sont envoyés, le traitement du dossier est déclenché
          if (completed === this.files.length) {
            this.claimService.processClaim(this.claimId).subscribe({
              next: () => {
                this.loading = false;
                this.successMessage = 'Documents envoyés avec succès. Redirection...';
                console.log('Orchestrateur déclenché');

                setTimeout(() => {
                  this.router.navigate(['/claim/step3']);
                }, 1000);
              },
              error: (err) => {
                this.loading = false;
                this.errorMessage =
                  `Erreur traitement : ${err?.message || 'Erreur inconnue.'}`;
                console.error('Erreur orchestrateur :', err);
              }
            });
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage =
            `Erreur upload : ${err?.message || 'Erreur inconnue.'}`;
          console.error('Erreur upload :', err);
        }
      });
    });
  }

  // Méthode permettant de naviguer vers la page d’accueil
  goToHome(): void {
    this.router.navigate(['/']);
  }

  // Méthode permettant de naviguer vers la page de consultation des décisions ou dossiers
  goToDecisions(): void {
    this.router.navigate(['/Consulter']);
  }

  // Méthode permettant de naviguer vers la liste des polices d’assurance
  goToPolice(): void {
    this.router.navigate(['/PolicesList']);
  }

  // Méthode permettant de rediriger l’utilisateur vers la page de connexion
  logout(): void {
    this.router.navigate(['/login']);
  }
}
