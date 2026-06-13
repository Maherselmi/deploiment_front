// Importation des modules Angular nécessaires au composant
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

// Importation du service utilisé pour gérer les dossiers de sinistre
import { ClaimService } from "../../../data-access/claim.service";


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

// Déclaration du composant Angular responsable de la deuxième étape
// de déclaration d’un sinistre habitation
@Component({
  selector: 'app-claim-step2-habitation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './claim-step2-habitation.component.html',
  styleUrls: ['./claim-step2-habitation.component.css'],
  host: { ngSkipHydration: 'true' }
})
export class ClaimStep2HabitationComponent implements OnInit {

  // Liste des liens de navigation affichés dans l’espace client
  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/Client_Space' },
    { label: 'Mes contrats', route: '/PolicesList' },
    { label: 'Sinistres', route: '/Claim_Home' },
    { label: 'Mes dossiers', route: '/Consulter' }
  ];

  // Liste des conseils affichés pour guider l’utilisateur
  // dans l’ajout des documents liés au sinistre habitation
  uploadTips: UploadTip[] = [
    {
      title: 'Vue générale',
      text: 'Ajoutez une photo complète de la pièce ou de la zone touchée.',
      icon: 'V'
    },
    {
      title: 'Dégâts détaillés',
      text: 'Ajoutez un gros plan des éléments endommagés.',
      icon: 'D'
    },
    {
      title: 'Origine visible',
      text: 'Montrez la fuite, fissure ou la source du sinistre si possible.',
      icon: 'O'
    },
    {
      title: 'Pièces utiles',
      text: 'Ajoutez devis, factures, constats ou autres justificatifs.',
      icon: 'P'
    }
  ];

  // Liste des fichiers sélectionnés par l’utilisateur
  files: File[] = [];

  // Identifiant du dossier de sinistre récupéré depuis le localStorage
  claimId = 0;

  // Variables utilisées pour gérer l’état de chargement, les messages et la progression d’envoi
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
      } else {
        this.errorMessage = 'Aucun dossier trouvé. Retournez à l’étape 1.';
      }
    }
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  // Elle prend aussi en compte les routes liées aux différentes catégories de sinistres
  isActiveNav(route: string): boolean {
    const currentUrl = this.router.url;

    if (route === '/Claim_Home') {
      return (
        currentUrl.startsWith('/Claim_Home') ||
        currentUrl.startsWith('/claim') ||
        currentUrl.startsWith('/Habitation') ||
        currentUrl.startsWith('/Sante')
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
  // Elle vérifie le type, la taille maximale et évite les doublons
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

  // Méthode permettant de vider tous les fichiers sélectionnés
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

  // Méthode qui vérifie si un fichier sélectionné est un PDF
  isPdf(file: File): boolean {
    return file.type === 'application/pdf';
  }

  // Méthode qui vérifie si un fichier sélectionné est une image
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

  // Getter qui indique si l’utilisateur peut envoyer les documents
  // L’envoi est possible si un dossier existe, si des fichiers sont sélectionnés et si aucun chargement n’est en cours
  get canUpload(): boolean {
    return !this.loading && this.files.length > 0 && !!this.claimId;
  }

  // Méthode permettant de revenir à la première étape de déclaration habitation
  back(): void {
    this.router.navigate(['/claim/habitation/step1']);
  }

  // Méthode principale d’envoi des documents habitation
  // Elle envoie chaque fichier au backend puis déclenche le traitement du dossier par l’orchestrateur
  upload(): void {
    if (!this.claimId) {
      this.errorMessage = 'ClaimId introuvable. Retournez à l’étape 1.';
      return;
    }

    if (this.files.length === 0) {
      this.errorMessage = 'Ajoutez au moins un document habitation.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.uploadProgress = 0;

    let completed = 0;

    this.files.forEach((file) => {
      this.claimService.uploadDocument(this.claimId, file).subscribe({
        next: () => {
          completed++;
          this.uploadProgress = Math.round((completed / this.files.length) * 100);

          // Lorsque tous les fichiers sont envoyés, le traitement automatique du dossier est lancé
          if (completed === this.files.length) {
            this.claimService.processClaim(this.claimId).subscribe({
              next: () => {
                this.loading = false;
                this.successMessage = 'Documents habitation envoyés avec succès. Redirection...';

                setTimeout(() => {
                  this.router.navigate(['/Habitation/step3']);
                }, 1000);
              },
              error: (err) => {
                this.loading = false;
                this.errorMessage =
                  `Erreur traitement : ${err?.message || 'Erreur inconnue.'}`;
              }
            });
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage =
            `Erreur upload : ${err?.message || 'Erreur inconnue.'}`;
        }
      });
    });
  }

  // Méthode permettant de retourner vers la page principale des sinistres
  goToClaimsHome(): void {
    this.router.navigate(['/Claim_Home']);
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
