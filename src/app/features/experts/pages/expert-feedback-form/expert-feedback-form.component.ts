// Importation des modules Angular nécessaires au composant
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Importation des outils RxJS utilisés pour charger plusieurs données en parallèle
// et enchaîner la sauvegarde du feedback avec la décision humaine
import { forkJoin, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Importation du modèle utilisé pour envoyer le feedback expert au backend
import { ExpertFeedbackRequest } from '../../models/expert-feedback.model';

// Importation des modèles liés au dossier, aux documents et aux résultats des agents IA
import { Claim, ClaimDocument } from "../../../claims/models/claim.model";
import { AgentResult } from "../../../agents/models/agent-result.model";

// Importation des services nécessaires à la page de validation humaine
import { ExpertFeedbackService } from "../../data-access/expert-feedback.service";
import { AuthService } from "../../../../core/auth/auth.service";
import { ClaimValidationService, ReviewData } from "../../../claims/data-access/claim-validation.service";
import { ClaimService } from "../../../claims/data-access/claim.service";
import { AgentResultService } from "../../../agents/data-access/agent-result.service";


// Interface représentant un lien de navigation dans l’espace expert
interface NavItem {
  label: string;
  route: string;
}

// Type représentant les deux décisions possibles de l’expert humain
type HumanAction = 'approve' | 'reject';

// Déclaration du composant Angular responsable du formulaire de feedback expert
// Ce composant permet de consulter un dossier, analyser les résultats IA,
// corriger les prédictions et approuver ou rejeter le dossier
@Component({
  selector: 'app-expert-feedback-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './expert-feedback-form.component.html',
  styleUrls: ['./expert-feedback-form.component.css']
})
export class ExpertFeedbackFormComponent implements OnInit {

  // Identifiant du dossier récupéré depuis l’URL
  claimId!: number;

  // Dossier de sinistre actuellement consulté par l’expert
  claim: Claim | null = null;

  // Données de revue du dossier retournées par le backend
  reviewData: ReviewData | null = null;

  // Résultats générés par les différents agents IA pour ce dossier
  agentResults: AgentResult[] = [];

  // États utilisés pour gérer le chargement, la sauvegarde et les actions de décision
  loading = true;
  saving = false;
  actionLoading = false;
  actionType: HumanAction | null = null;

  // Messages affichés dans l’interface en cas de succès ou d’erreur
  errorMessage = '';
  successMessage = '';

  // Commentaire utilisé lors de l’approbation ou du rejet du dossier
  decisionComment = '';

  // Informations de base de l’expert connecté
  expertName = 'Expert';
  expertEmail = '';
  role = '';

  // Liens de navigation affichés dans l’espace expert
  navItems: NavItem[] = [
    { label: 'Espace expert', route: '/expert-space' },
    { label: 'Validation humaine', route: '/feedback-claims' },
  ];

  // Formulaire contenant les évaluations et corrections de l’expert
  feedbackForm: ExpertFeedbackRequest = this.createEmptyFeedback();

  // Injection des services nécessaires :
  // ActivatedRoute pour lire l’ID du dossier,
  // Router pour gérer la navigation,
  // ClaimService pour récupérer le dossier,
  // ClaimValidationService pour approuver ou rejeter,
  // AgentResultService pour récupérer les résultats IA,
  // ExpertFeedbackService pour sauvegarder le feedback,
  // DomSanitizer pour sécuriser l’affichage des PDF,
  // AuthService pour gérer la déconnexion
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private claimService: ClaimService,
    private claimValidationService: ClaimValidationService,
    private agentResultService: AgentResultService,
    private expertFeedbackService: ExpertFeedbackService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
  ) {}

  // Méthode exécutée automatiquement au chargement du composant
  // Elle récupère l’identifiant du dossier depuis l’URL puis charge toutes les données nécessaires
  ngOnInit(): void {
    this.claimId = Number(this.route.snapshot.paramMap.get('claimId'));
    this.feedbackForm.claimId = this.claimId;
    this.loadData();
  }

  // Getter qui indique si le dossier est en attente de validation humaine
  get isPendingValidation(): boolean {
    return this.claim?.status === 'PENDING_VALIDATION';
  }

  // Getter qui vérifie si au moins un agent IA a demandé une revue humaine
  get hasHumanReviewFlag(): boolean {
    return this.agentResults.some(agent => !!agent.needsHumanReview);
  }

  // Getter qui détermine si les documents du dossier doivent être affichés à l’expert
  get shouldShowExpertDocuments(): boolean {
    return this.isPendingValidation || this.hasHumanReviewFlag;
  }

  // Getter qui retourne uniquement les documents de type image
  get imageDocuments(): ClaimDocument[] {
    return (this.claim?.documents || []).filter(
      doc => !!doc.fileType && doc.fileType.startsWith('image/')
    );
  }

  // Getter qui retourne uniquement les documents PDF
  get pdfDocuments(): ClaimDocument[] {
    return (this.claim?.documents || []).filter(
      doc => doc.fileType === 'application/pdf'
    );
  }

  // Getter qui retourne le nombre total de documents associés au dossier
  get totalDocuments(): number {
    return this.claim?.documents?.length || 0;
  }

  // Getter qui retourne le libellé affiché selon l’état du dossier
  get pendingLabel(): string {
    return this.isPendingValidation ? 'Validation humaine requise' : 'Feedback expert';
  }

  // Getter qui indique si l’estimation IA doit être corrigée par l’expert
  // Si l’estimation n’est pas correcte, les champs finaux deviennent éditables
  get estimationNeedsCorrection(): boolean {
    return this.feedbackForm.estimateEvaluation !== 'CORRECTE';
  }

  // Méthode permettant de vérifier si un lien de navigation est actif
  isActiveNav(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  // Méthode qui transforme le statut technique d’un dossier en libellé lisible
  getStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      PENDING_VALIDATION: 'En attente expert',
      APPROVED: 'Approuvé',
      REJECTED: 'Rejeté',
      CLOSED: 'Clôturé',
      IN_ANALYSIS: 'En analyse',
      SUBMITTED: 'Soumis'
    };

    return map[status || ''] || (status || '-');
  }

  // Méthode qui retourne la classe CSS associée au statut du dossier
  getStatusClass(status?: string): string {
    switch (status) {
      case 'PENDING_VALIDATION': return 'pending';
      case 'APPROVED':           return 'approved';
      case 'REJECTED':           return 'rejected';
      case 'CLOSED':             return 'closed';
      default:                   return 'default';
    }
  }


  // Méthode responsable du chargement complet de la page
  // Elle récupère en parallèle le dossier, les résultats IA, le feedback existant et les données de revue
  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    forkJoin({
      claim: this.claimService.getClaimById(this.claimId),
      agentResults: this.agentResultService.getResultsByClaimId(this.claimId),
      feedback: this.expertFeedbackService.getFeedbackByClaimId(this.claimId).pipe(
        catchError(() => of(null))
      ),
      review: this.claimValidationService.getClaimReview(this.claimId).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: ({ claim, agentResults, feedback, review }) => {
        this.claim = claim;
        this.agentResults = agentResults || [];
        this.reviewData = review;

        // Initialisation du formulaire avec les valeurs par défaut
        this.feedbackForm = this.createEmptyFeedback();
        this.feedbackForm.claimId = this.claimId;

        // Préremplissage du formulaire avec l’identité de l’expert et les résultats IA
        this.prefillExpertIdentity();
        this.prefillFromAgentResults(this.agentResults);

        // Si un feedback existe déjà, il est utilisé pour restaurer les corrections précédentes
        if (feedback) {
          this.prefillFromExistingFeedback(feedback);
        }

        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Erreur chargement dossier.';
        this.loading = false;
      }
    });
  }


  // Méthode permettant de sauvegarder uniquement le feedback expert
  // Elle n’approuve pas et ne rejette pas le dossier
  submit(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.preparePayload();

    this.expertFeedbackService.saveFeedback(payload).subscribe({
      next: res => {
        this.saving = false;
        const saved = res?.learningItemsSaved ?? 0;
        this.successMessage = `Feedback expert enregistré avec succès. ${saved} exemple(s) learning sauvegardé(s).`;
      },
      error: err => {
        console.error(err);
        this.saving = false;
        this.errorMessage = this.extractBackendError(err) || "Erreur lors de l'enregistrement du feedback.";
      }
    });
  }

  // Méthode appelée lorsque l’expert décide d’approuver le dossier
  approveClaim(): void {
    this.submitDecision('approve');
  }

  // Méthode appelée lorsque l’expert décide de rejeter le dossier
  rejectClaim(): void {
    this.submitDecision('reject');
  }

  // Méthode privée qui soumet une décision humaine complète
  // Elle sauvegarde d’abord le feedback expert, puis envoie la décision au backend
  private submitDecision(action: HumanAction): void {
    if (!this.claim || this.actionLoading) return;

    this.actionLoading = true;
    this.actionType = action;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.preparePayload(action);

    this.expertFeedbackService.saveFeedback(payload).pipe(
      switchMap(() => {
        const comment = this.decisionComment || payload.globalComment || '';

        return action === 'approve'
          ? this.claimValidationService.approveClaim(this.claimId, {
            comment: comment,
            finalEstimationMin: payload.finalEstimationMin,
            finalEstimationMoyenne: payload.finalEstimationMoyenne,
            finalEstimationMax: payload.finalEstimationMax
          })
          : this.claimValidationService.rejectClaim(this.claimId, comment);
      })
    ).subscribe({
      next: res => {
        if (this.claim) {
          this.claim.status = res.status;
        }

        this.actionLoading = false;
        this.actionType = null;

        this.successMessage = action === 'approve'
          ? `Dossier #${res.claimId} approuvé avec feedback enregistré.`
          : `Dossier #${res.claimId} rejeté avec feedback enregistré.`;
      },
      error: err => {
        console.error(err);
        this.actionLoading = false;
        this.actionType = null;
        this.errorMessage = this.extractBackendError(err) || 'Erreur lors du traitement du dossier.';
      }
    });
  }

  // Méthode permettant de revenir à la liste des dossiers à valider
  back(): void {
    this.router.navigate(['/FeedbackClaimsList']);
  }

  // Méthode qui construit l’URL publique d’un fichier stocké côté backend
  buildFileUrl(filePath?: string): string {
    if (!filePath) return '';

    const normalized = filePath.replace(/\\/g, '/');
    const fileName = normalized.split('/').pop();

    return `http://localhost:8080/uploads/${fileName}`;
  }

  // Méthode qui sécurise l’URL d’un PDF pour permettre son affichage dans l’interface Angular
  getSafePdfUrl(filePath?: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.buildFileUrl(filePath));
  }



  // Méthode appelée lorsque l’expert modifie le type final du routeur
  // Elle met à jour automatiquement l’indicateur indiquant si l’agent routeur avait raison
  onRouteurFinalTypeChange(): void {
    this.feedbackForm.routeurCorrect = this.sameText(
      this.feedbackForm.predictedType,
      this.feedbackForm.finalType
    );
  }

  // Méthode appelée lorsque l’expert modifie la décision finale du validateur
  // Elle met à jour automatiquement l’indicateur indiquant si l’agent validateur avait raison
  onValidationFinalDecisionChange(): void {
    this.feedbackForm.validationCorrect = this.sameText(
      this.feedbackForm.predictedDecision,
      this.feedbackForm.finalDecision
    );
  }

  // Méthode appelée lorsque l’expert change l’évaluation de l’estimation
  // Si l’estimation est correcte, les valeurs finales reprennent les valeurs IA
  // Sinon, les valeurs restent préremplies mais deviennent modifiables
  onEstimateEvaluationChange(): void {
    if (this.feedbackForm.estimateEvaluation === 'CORRECTE') {
      this.feedbackForm.estimateurCorrect = true;
      this.feedbackForm.finalEstimationMin = this.feedbackForm.predictedEstimationMin;
      this.feedbackForm.finalEstimationMoyenne = this.feedbackForm.predictedEstimationMoyenne;
      this.feedbackForm.finalEstimationMax = this.feedbackForm.predictedEstimationMax;
    } else {
      this.feedbackForm.estimateurCorrect = false;
    }
  }



  // Méthode qui préremplit le formulaire à partir des résultats générés par les agents IA
  // Elle extrait les prédictions du routeur, du validateur et de l’estimateur
  prefillFromAgentResults(results: AgentResult[]): void {
    const routeur = results.find(r => r.agentName === 'AgentRouteur');
    const validateur = results.find(r => r.agentName === 'AgentValidateur');
    const estimateur = results.find(r => r.agentName === 'AgentEstimateur');

    const routeurJson = this.safeParseJson(routeur?.rawLlmResponse);
    const validateurJson = this.safeParseJson(validateur?.rawLlmResponse);
    const estimateurJson = this.safeParseJson(estimateur?.rawLlmResponse);

    // Préremplissage des données de l’agent routeur
    const predictedType = this.normalizeType(
      routeurJson?.type || this.extractTypeFromConclusion(routeur?.conclusion) || ''
    );

    this.feedbackForm.predictedType = predictedType;
    this.feedbackForm.finalType = predictedType;
    this.feedbackForm.routeurConfidence = this.toNumber(routeurJson?.confidence, routeur?.confidenceScore, 0);
    this.feedbackForm.routeurCorrect = predictedType ? true : null;
    this.feedbackForm.routeurJustification = this.extractJustification(
      routeur?.rawLlmResponse,
      routeurJson,
      routeur?.conclusion
    );

    // Préremplissage des données de l’agent validateur
    const predictedDecision = this.normalizeDecision(
      validateurJson?.decision || validateur?.conclusion || ''
    );

    this.feedbackForm.predictedDecision = predictedDecision;
    this.feedbackForm.finalDecision = predictedDecision;
    this.feedbackForm.validationConfidence = this.toNumber(validateurJson?.confidence, validateur?.confidenceScore, 0);
    this.feedbackForm.validationCorrect = predictedDecision ? true : null;
    this.feedbackForm.validationJustification = this.extractJustification(
      validateur?.rawLlmResponse,
      validateurJson,
      validateur?.conclusion
    );

    // Préremplissage des données de l’agent estimateur
    const parsedEstimate = this.extractEstimateFromConclusion(estimateur?.conclusion);
    const predMin = this.toNullableNumber(estimateurJson?.estimationMin, parsedEstimate.min);
    const predMoy = this.toNullableNumber(estimateurJson?.estimationMoyenne, parsedEstimate.moyenne);
    const predMax = this.toNullableNumber(estimateurJson?.estimationMax, parsedEstimate.max);

    this.feedbackForm.predictedEstimationMin = predMin;
    this.feedbackForm.predictedEstimationMoyenne = predMoy;
    this.feedbackForm.predictedEstimationMax = predMax;
    this.feedbackForm.estimateurConfidence = this.toNumber(estimateurJson?.confidence, estimateur?.confidenceScore, 0);
    this.feedbackForm.estimateurCorrect = (predMin !== null && predMoy !== null && predMax !== null) ? true : null;
    this.feedbackForm.estimateEvaluation = 'CORRECTE';

    // Les valeurs finales commencent avec les valeurs proposées par l’IA
    this.feedbackForm.finalEstimationMin = predMin;
    this.feedbackForm.finalEstimationMoyenne = predMoy;
    this.feedbackForm.finalEstimationMax = predMax;

    this.feedbackForm.estimateurJustification = this.extractJustification(
      estimateur?.rawLlmResponse,
      estimateurJson,
      estimateur?.conclusion
    );
  }

  // Méthode qui restaure le formulaire à partir d’un feedback déjà enregistré
  // Elle garde les corrections précédentes de l’expert si elles existent
  prefillFromExistingFeedback(feedback: any): void {
    this.feedbackForm = {
      claimId: feedback.claimId || feedback.claim?.id || this.claimId,
      reviewedBy: feedback.reviewedBy || this.feedbackForm.reviewedBy || '',
      useForLearning: feedback.useForLearning ?? true,
      satisfactionScore: this.toNullableNumber(feedback.satisfactionScore) ?? 5,
      globalComment: feedback.globalComment || feedback.expertComment || '',

      predictedType: feedback.predictedType || this.feedbackForm.predictedType || '',
      routeurConfidence: this.toNullableNumber(feedback.routeurConfidence) ?? this.feedbackForm.routeurConfidence,
      routeurCorrect: feedback.routeurCorrect ?? this.feedbackForm.routeurCorrect,
      finalType: feedback.finalType || this.feedbackForm.finalType || '',
      routeurComment: feedback.routeurComment || '',
      routeurJustification: feedback.routeurJustification || this.feedbackForm.routeurJustification || '',

      predictedDecision: feedback.predictedDecision || this.feedbackForm.predictedDecision || '',
      validationConfidence: this.toNullableNumber(feedback.validationConfidence) ?? this.feedbackForm.validationConfidence,
      validationCorrect: feedback.validationCorrect ?? this.feedbackForm.validationCorrect,
      finalDecision: feedback.finalDecision || this.feedbackForm.finalDecision || '',
      validationComment: feedback.validationComment || '',
      validationJustification: feedback.validationJustification || this.feedbackForm.validationJustification || '',

      predictedEstimationMin: this.toNullableNumber(feedback.predictedEstimationMin) ?? this.feedbackForm.predictedEstimationMin,
      predictedEstimationMoyenne: this.toNullableNumber(feedback.predictedEstimationMoyenne) ?? this.feedbackForm.predictedEstimationMoyenne,
      predictedEstimationMax: this.toNullableNumber(feedback.predictedEstimationMax) ?? this.feedbackForm.predictedEstimationMax,
      estimateurConfidence: this.toNullableNumber(feedback.estimateurConfidence) ?? this.feedbackForm.estimateurConfidence,
      estimateurCorrect: feedback.estimateurCorrect ?? this.feedbackForm.estimateurCorrect,
      estimateEvaluation: feedback.estimateEvaluation || this.feedbackForm.estimateEvaluation || 'CORRECTE',

      // Priorité aux valeurs finales sauvegardées
      // Si elles sont absentes, les valeurs prédites sont utilisées comme point de départ
      finalEstimationMin: this.toNullableNumber(feedback.finalEstimationMin)
        ?? this.toNullableNumber(feedback.predictedEstimationMin)
        ?? this.feedbackForm.predictedEstimationMin,
      finalEstimationMoyenne: this.toNullableNumber(feedback.finalEstimationMoyenne)
        ?? this.toNullableNumber(feedback.predictedEstimationMoyenne)
        ?? this.feedbackForm.predictedEstimationMoyenne,
      finalEstimationMax: this.toNullableNumber(feedback.finalEstimationMax)
        ?? this.toNullableNumber(feedback.predictedEstimationMax)
        ?? this.feedbackForm.predictedEstimationMax,

      estimateurComment: feedback.estimateurComment || '',
      estimateurJustification: feedback.estimateurJustification || this.feedbackForm.estimateurJustification || ''
    };

    this.decisionComment = this.feedbackForm.globalComment || '';
  }



  // Méthode qui prépare les données avant l’envoi au backend
  // Elle normalise les valeurs, complète les champs manquants et sécurise les scores
  private preparePayload(action?: HumanAction): ExpertFeedbackRequest {
    const payload: ExpertFeedbackRequest = {
      ...this.feedbackForm,
      claimId: this.claimId,
      reviewedBy: (this.feedbackForm.reviewedBy || '').trim(),
      globalComment: (this.feedbackForm.globalComment || this.decisionComment || '').trim(),
      satisfactionScore: this.clampSatisfaction(this.feedbackForm.satisfactionScore)
    };

    payload.finalType = this.normalizeType(payload.finalType || payload.predictedType);
    payload.finalDecision = this.normalizeDecision(payload.finalDecision || payload.predictedDecision);

    // Ajustement automatique de la décision finale selon l’action choisie
    if (action === 'approve' && (!payload.finalDecision || payload.finalDecision === 'INCONNU')) {
      payload.finalDecision = 'COUVERT';
    }

    if (action === 'reject' && (!payload.finalDecision || payload.finalDecision === 'INCONNU')) {
      payload.finalDecision = 'EXCLU';
    }

    // Calcul automatique de la cohérence entre prédiction IA et correction expert
    if (payload.routeurCorrect === null && payload.predictedType && payload.finalType) {
      payload.routeurCorrect = this.sameText(payload.predictedType, payload.finalType);
    }

    if (payload.validationCorrect === null && payload.predictedDecision && payload.finalDecision) {
      payload.validationCorrect = this.sameText(payload.predictedDecision, payload.finalDecision);
    }

    if (payload.estimateurCorrect === null) {
      payload.estimateurCorrect = this.resolveEstimateurCorrect(payload);
    }

    // Normalisation des scores de confiance entre 0 et 1
    payload.routeurConfidence = this.normalizeConfidence(payload.routeurConfidence);
    payload.validationConfidence = this.normalizeConfidence(payload.validationConfidence);
    payload.estimateurConfidence = this.normalizeConfidence(payload.estimateurConfidence);

    return payload;
  }



  // Méthode qui crée un formulaire de feedback vide avec des valeurs par défaut
  private createEmptyFeedback(): ExpertFeedbackRequest {
    return {
      claimId: this.claimId || 0,
      reviewedBy: '',
      useForLearning: true,
      satisfactionScore: 5,
      globalComment: '',

      predictedType: '',
      routeurConfidence: 0,
      routeurCorrect: null,
      finalType: '',
      routeurComment: '',
      routeurJustification: '',

      predictedDecision: '',
      validationConfidence: 0,
      validationCorrect: null,
      finalDecision: '',
      validationComment: '',
      validationJustification: '',

      predictedEstimationMin: null,
      predictedEstimationMoyenne: null,
      predictedEstimationMax: null,
      estimateurConfidence: 0,
      estimateurCorrect: null,
      estimateEvaluation: 'CORRECTE',
      finalEstimationMin: null,
      finalEstimationMoyenne: null,
      finalEstimationMax: null,
      estimateurComment: '',
      estimateurJustification: ''
    };
  }

  // Méthode qui préremplit le nom ou l’email de l’expert depuis le localStorage
  private prefillExpertIdentity(): void {
    const stored = localStorage.getItem('username')
      || localStorage.getItem('userEmail')
      || localStorage.getItem('email')
      || '';

    this.feedbackForm.reviewedBy = stored;
  }

  // Méthode qui extrait une justification lisible depuis une réponse brute d’un agent IA
  // Elle cherche d’abord dans le JSON puis dans le texte hors bloc JSON
  private extractJustification(raw: string | undefined, parsed: any, conclusion: string | undefined): string {
    if (!raw) return conclusion?.trim() || '';

    if (parsed) {
      const justif = parsed.justification || parsed.raisonnement || parsed.reasoning
        || parsed.explanation || parsed.explication || parsed.raison || '';

      if (justif && typeof justif === 'string' && justif.trim().length > 0) {
        return justif.trim();
      }
    }

    const cleaned = raw
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .trim();

    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    let textOutsideJson = '';

    if (jsonStart > 0) {
      textOutsideJson += cleaned.substring(0, jsonStart).trim();
    }

    if (jsonEnd >= 0 && jsonEnd < cleaned.length - 1) {
      const after = cleaned.substring(jsonEnd + 1).trim();

      if (after) {
        textOutsideJson += (textOutsideJson ? '\n' : '') + after;
      }
    }

    if (textOutsideJson.trim().length > 20) {
      return textOutsideJson.trim();
    }

    return conclusion?.trim() || '';
  }

  // Méthode qui tente de parser une réponse JSON provenant d’un agent IA
  // Si la réponse contient du texte autour du JSON, elle extrait uniquement le bloc JSON
  private safeParseJson(value?: string): any {
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      const block = this.extractJsonBlock(value);

      if (!block) return null;

      try {
        return JSON.parse(block);
      } catch {
        return null;
      }
    }
  }

  // Méthode qui extrait un bloc JSON depuis une réponse textuelle brute
  private extractJsonBlock(value: string): string | null {
    const cleaned = value
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start < 0 || end <= start) return null;

    return cleaned.substring(start, end + 1);
  }

  // Méthode qui extrait le type de sinistre depuis une conclusion textuelle
  private extractTypeFromConclusion(conclusion?: string): string {
    const text = (conclusion || '').toUpperCase();

    if (text.includes('HABITATION')) return 'HABITATION';
    if (text.includes('SANTE')) return 'SANTE';
    if (text.includes('VOYAGE')) return 'VOYAGE';
    if (text.includes('AUTO')) return 'AUTO';

    return '';
  }

  // Méthode qui extrait les estimations minimale, moyenne et maximale depuis une conclusion textuelle
  private extractEstimateFromConclusion(conclusion?: string): { min: number | null; moyenne: number | null; max: number | null } {
    const text = conclusion || '';

    const min = this.matchMoney(text, /min\s*:\s*([0-9]+(?:[.,][0-9]+)?)/i);
    const moyenne = this.matchMoney(text, /moyenne\s*:\s*([0-9]+(?:[.,][0-9]+)?)/i);
    const max = this.matchMoney(text, /max\s*:\s*([0-9]+(?:[.,][0-9]+)?)/i);

    return { min, moyenne, max };
  }

  // Méthode qui applique une expression régulière pour récupérer une valeur numérique
  private matchMoney(text: string, regex: RegExp): number | null {
    const match = text.match(regex);

    if (!match?.[1]) return null;

    return this.toNullableNumber(match[1]);
  }

  // Méthode qui normalise le type de sinistre dans un format attendu par le backend
  private normalizeType(value?: string): string {
    const text = (value || '').toUpperCase();

    if (text.includes('HABITATION')) return 'HABITATION';
    if (text.includes('SANTE')) return 'SANTE';
    if (text.includes('VOYAGE')) return 'VOYAGE';
    if (text.includes('AUTO')) return 'AUTO';
    if (text.includes('INCONNU')) return 'INCONNU';

    return text || '';
  }

  // Méthode qui normalise la décision de couverture dans un format attendu par le backend
  private normalizeDecision(value?: string): string {
    const text = (value || '').toUpperCase();

    if (text.includes('COUVERT')) return 'COUVERT';
    if (text.includes('EXCLU')) return 'EXCLU';
    if (text.includes('INCONNU')) return 'INCONNU';

    return text || '';
  }

  // Méthode qui normalise un score de confiance entre 0 et 1
  private normalizeConfidence(value: number | null): number | null {
    if (value === null || value === undefined) return null;

    let n = Number(value);

    if (!Number.isFinite(n)) return null;

    if (n > 1 && n <= 100) {
      n = n / 100;
    }

    return Math.max(0, Math.min(1, n));
  }

  // Méthode qui limite le score de satisfaction entre 1 et 5
  private clampSatisfaction(value: number | null): number | null {
    if (value === null || value === undefined) return null;

    const n = Number(value);

    if (!Number.isFinite(n)) return null;

    return Math.max(1, Math.min(5, Math.round(n)));
  }

  // Méthode qui détermine si l’estimation de l’agent estimateur est correcte
  // Elle compare les valeurs prédites avec les valeurs finales corrigées par l’expert
  private resolveEstimateurCorrect(payload: ExpertFeedbackRequest): boolean | null {
    if (payload.estimateEvaluation === 'CORRECTE') return true;

    if (payload.estimateEvaluation === 'SOUS_ESTIME' || payload.estimateEvaluation === 'SUR_ESTIME') {
      return false;
    }

    if (!this.hasFinalEstimate(payload)) return null;

    return this.sameMoney(payload.predictedEstimationMin, payload.finalEstimationMin)
      && this.sameMoney(payload.predictedEstimationMoyenne, payload.finalEstimationMoyenne)
      && this.sameMoney(payload.predictedEstimationMax, payload.finalEstimationMax);
  }

  // Méthode qui vérifie si les trois estimations finales sont renseignées
  private hasFinalEstimate(payload: ExpertFeedbackRequest): boolean {
    return payload.finalEstimationMin !== null
      && payload.finalEstimationMoyenne !== null
      && payload.finalEstimationMax !== null;
  }

  // Méthode qui compare deux montants avec une petite marge de tolérance
  private sameMoney(a: number | null, b: number | null): boolean {
    if (a === null || b === null) return false;

    return Math.abs(Number(a) - Number(b)) < 0.01;
  }

  // Méthode qui compare deux textes sans tenir compte de la casse ni des espaces
  private sameText(a?: string, b?: string): boolean {
    return (a || '').trim().toUpperCase() === (b || '').trim().toUpperCase();
  }

  // Méthode qui retourne le premier nombre valide parmi plusieurs valeurs possibles
  private toNumber(...values: unknown[]): number {
    for (const value of values) {
      const n = this.toNullableNumber(value);

      if (n !== null) return n;
    }

    return 0;
  }

  // Méthode qui convertit une valeur en nombre ou retourne null si la conversion échoue
  private toNullableNumber(...values: unknown[]): number | null {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;

      const n = Number(String(value).replace(',', '.'));

      if (Number.isFinite(n)) return n;
    }

    return null;
  }

  // Méthode qui extrait un message d’erreur lisible depuis une erreur backend
  private extractBackendError(err: any): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.message === 'string') return err.message;

    return '';
  }

  // Méthode permettant de déconnecter l’expert puis de le rediriger vers la page de connexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
