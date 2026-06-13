import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { Client, ClientService } from "../../../clients/data-access/client.service";
import { AuthService } from "../../../../core/auth/auth.service";
import { AssistantResponse, AssistantService } from "../../data-access/assistant.service";

interface PolicyCard {
  id: string;
  number: string;
  type: string;
  formule?: string;
  endDate?: string;
}

interface ClaimCard {
  id: string;
  status: string;
  incidentDate?: string;
  policyNumber?: string;
}

interface ClaimTypeOption {
  type: string;
  label: string;
  icon: string;
  description: string;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  kind?:
    | 'text'
    | 'policies'
    | 'claims'
    | 'agent-summary'
    | 'agent-router'
    | 'agent-validator'
    | 'agent-estimator'
    | 'claim-type-picker'
    | 'policy-picker'
    | 'date-picker'
    | 'confirmation-actions';

  agentLabel?: string;
  agentIcon?: string;
  agentStatus?: 'loading' | 'done' | 'error';

  policies?: PolicyCard[];
  claims?: ClaimCard[];

  claimTypeOptions?: ClaimTypeOption[];
  policyOptions?: PolicyCard[];
  dateValue?: string;

  claimId?: number;
  processing?: boolean;
}

interface AssistantAction {
  title: string;
  subtitle: string;
  icon: string;
  message: string;
}

interface ChatDiscussion {
  id: string;
  title: string;
  messages: ChatMessage[];
  needsFileUpload: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatStorageData {
  selectedDiscussionId: string;
  discussions: ChatDiscussion[];
}

@Component({
  selector: 'app-insurflow-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './insurflow-assistant.component.html',
  styleUrls: ['./insurflow-assistant.component.css']
})
export class InsurflowAssistantComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('chatBody') private chatBody?: ElementRef<HTMLDivElement>;

  private readonly CHAT_STORAGE_PREFIX = 'insurflow_chat_discussions_';

  private chatStorageKey = '';

  private agentPollingTimers = new Map<number, ReturnType<typeof setInterval>>();
  private claimDiscussionMap = new Map<number, string>();

  private shouldScrollToBottom = false;
  private userIsNearBottom = true;
  client: Client | null = null;

  loadingProfile = true;
  chatbotLoading = false;
  chatInput = '';

  selectedFiles: File[] = [];

  discussions: ChatDiscussion[] = [];
  selectedDiscussionId = '';

  readonly todayIso = new Date().toISOString().slice(0, 10);

  readonly claimTypeOptions: ClaimTypeOption[] = [
    {
      type: 'AUTO',
      label: 'Auto',
      icon: '🚗',
      description: 'Accident, collision, bris de glace, véhicule'
    },
    {
      type: 'HABITATION',
      label: 'Habitation',
      icon: '🏠',
      description: 'Dégât des eaux, incendie, vol, logement'
    },
    {
      type: 'SANTE',
      label: 'Santé',
      icon: '🏥',
      description: 'Soins, hospitalisation, frais médicaux'
    },
    {
      type: 'VOYAGE',
      label: 'Voyage',
      icon: '✈️',
      description: 'Bagage, annulation, retard, rapatriement'
    },
    {
      type: 'VIE',
      label: 'Vie',
      icon: '🛡️',
      description: 'Décès, invalidité, protection familiale'
    }
  ];

  actions: AssistantAction[] = [
    {
      title: 'Mes polices',
      subtitle: 'consulter mes contrats',
      icon: '📄',
      message: 'Afficher mes polices'
    },
    {
      title: 'Mes sinistres',
      subtitle: 'suivre mes dossiers',
      icon: '🛡️',
      message: 'Afficher mes dossiers de sinistre'
    },
    {
      title: 'Déclarer',
      subtitle: 'un nouveau sinistre',
      icon: '📝',
      message: 'Je veux déclarer un sinistre'
    }
  ];

  constructor(
    private authService: AuthService,
    private clientService: ClientService,
    private assistantService: AssistantService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const email = this.getStoredEmail();

    if (!email) {
      this.loadingProfile = false;
      this.createDefaultDiscussion();
      this.addBotMessage(
        'Je ne peux pas identifier votre profil client. Veuillez vous reconnecter.'
      );
      return;
    }

    this.chatStorageKey = this.CHAT_STORAGE_PREFIX + email.toLowerCase();

    this.loadDiscussions();
    this.loadCurrentClient(email);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.agentPollingTimers.forEach(timer => clearInterval(timer));
    this.agentPollingTimers.clear();
    this.claimDiscussionMap.clear();
  }

  get selectedDiscussion(): ChatDiscussion | null {
    return this.discussions.find(d => d.id === this.selectedDiscussionId) ?? null;
  }

  get messages(): ChatMessage[] {
    return this.selectedDiscussion?.messages ?? [];
  }

  get needsFileUpload(): boolean {
    return !!this.selectedDiscussion?.needsFileUpload;
  }

  set needsFileUpload(value: boolean) {
    if (!this.selectedDiscussion) return;

    this.selectedDiscussion.needsFileUpload = value;
    this.selectedDiscussion.updatedAt = new Date().toISOString();
    this.saveDiscussions();
    this.requestScrollToBottom(true);  }

  get fullName(): string {
    if (!this.client) return 'Client InsurFlow';
    return `${this.client.firstName} ${this.client.lastName}`;
  }

  get inputPlaceholder(): string {
    const lastBotMessage = [...this.messages]
      .reverse()
      .find(message => message.sender === 'bot');

    if (!lastBotMessage) {
      return 'Écrivez votre question...';
    }

    if (
      lastBotMessage.kind === 'claim-type-picker' ||
      lastBotMessage.kind === 'policy-picker' ||
      lastBotMessage.kind === 'date-picker' ||
      lastBotMessage.kind === 'confirmation-actions'
    ) {
      return 'Vous pouvez utiliser les boutons proposés ci-dessus...';
    }

    if (this.needsFileUpload) {
      return 'Joignez vos documents ou continuez sans document...';
    }

    return 'Écrivez votre question ou décrivez votre sinistre...';
  }

  loadCurrentClient(email: string): void {
    this.clientService.getAllClients().subscribe({
      next: clients => {
        const found = clients.find(
          c => c.email?.toLowerCase() === email.toLowerCase()
        );

        this.client = found ?? null;
        this.loadingProfile = false;

        if (!found) {
          this.addBotMessage(
            'Aucun profil client n’est associé à cet email. Veuillez contacter un gestionnaire.'
          );
        }

        this.requestScrollToBottom();
      },
      error: err => {
        console.error(err);
        this.loadingProfile = false;
        this.addBotMessage(
          'Impossible de charger votre profil client pour le moment.'
        );
      }
    });
  }

  loadDiscussions(): void {
    if (!this.chatStorageKey) {
      this.createDefaultDiscussion();
      return;
    }

    const saved = localStorage.getItem(this.chatStorageKey);

    if (!saved) {
      this.createDefaultDiscussion();
      return;
    }

    try {
      const data = JSON.parse(saved) as ChatStorageData;

      if (!Array.isArray(data.discussions) || data.discussions.length === 0) {
        this.createDefaultDiscussion();
        return;
      }

      this.discussions = data.discussions.map(discussion => ({
        ...discussion,
        messages: discussion.messages.map(message => {
          if (message.sender === 'bot') {
            if (
              message.kind === 'agent-summary' ||
              message.kind === 'agent-router' ||
              message.kind === 'agent-validator' ||
              message.kind === 'agent-estimator' ||
              message.kind === 'claim-type-picker' ||
              message.kind === 'policy-picker' ||
              message.kind === 'date-picker' ||
              message.kind === 'confirmation-actions'
            ) {
              return {
                ...message,
                processing: !!message.processing,
                claimTypeOptions: message.claimTypeOptions ?? this.claimTypeOptions,
                policyOptions: message.policyOptions ?? []
              };
            }

            return this.buildBotMessage(message.text);
          }

          return {
            ...message,
            kind: message.kind ?? 'text'
          };
        })
      }));

      const selectedExists = this.discussions.some(
        d => d.id === data.selectedDiscussionId
      );

      this.selectedDiscussionId = selectedExists
        ? data.selectedDiscussionId
        : this.discussions[0].id;

      this.selectedFiles = [];

      this.resumePendingAgentPollings();
      this.requestScrollToBottom();

    } catch (error) {
      console.error('Erreur chargement discussions chatbot', error);
      this.createDefaultDiscussion();
    }
  }

  saveDiscussions(): void {
    if (!this.chatStorageKey) return;

    const data: ChatStorageData = {
      selectedDiscussionId: this.selectedDiscussionId,
      discussions: this.discussions
    };

    localStorage.setItem(this.chatStorageKey, JSON.stringify(data));
  }

  createDefaultDiscussion(): void {
    const discussion = this.createDiscussion('Discussion 1');

    this.discussions = [discussion];
    this.selectedDiscussionId = discussion.id;
    this.selectedFiles = [];

    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  createDiscussion(title: string): ChatDiscussion {
    const now = new Date().toISOString();

    return {
      id: this.generateDiscussionId(),
      title,
      createdAt: now,
      updatedAt: now,
      needsFileUpload: false,
      messages: [
        {
          sender: 'bot',
          kind: 'text',
          text:
            'Bonjour 👋 Je suis l’assistant InsurFlow.\n\n' +
            'Je peux vous aider à consulter vos polices, suivre vos sinistres ou déclarer un nouveau dossier.'
        }
      ]
    };
  }

  startNewChat(): void {
    const nextNumber = this.discussions.length + 1;
    const newDiscussion = this.createDiscussion(`Discussion ${nextNumber}`);

    this.discussions.unshift(newDiscussion);
    this.selectedDiscussionId = newDiscussion.id;

    this.chatInput = '';
    this.selectedFiles = [];

    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  selectDiscussion(discussionId: string): void {
    if (this.chatbotLoading) return;

    this.selectedDiscussionId = discussionId;
    this.chatInput = '';
    this.selectedFiles = [];

    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  deleteDiscussion(discussionId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const discussionToDelete = this.discussions.find(d => d.id === discussionId);

    if (discussionToDelete) {
      discussionToDelete.messages.forEach(message => {
        if (
          (
            message.kind === 'agent-summary' ||
            message.kind === 'agent-router' ||
            message.kind === 'agent-validator' ||
            message.kind === 'agent-estimator'
          ) &&
          message.claimId
        ) {
          this.stopAgentResultsPolling(message.claimId);
        }
      });
    }

    this.discussions = this.discussions.filter(d => d.id !== discussionId);

    if (this.discussions.length === 0) {
      this.createDefaultDiscussion();
      return;
    }

    if (this.selectedDiscussionId === discussionId) {
      this.selectedDiscussionId = this.discussions[0].id;
    }

    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  clearCurrentDiscussion(): void {
    const current = this.selectedDiscussion;

    if (!current) return;

    current.messages.forEach(message => {
      if (
        (
          message.kind === 'agent-summary' ||
          message.kind === 'agent-router' ||
          message.kind === 'agent-validator' ||
          message.kind === 'agent-estimator'
        ) &&
        message.claimId
      ) {
        this.stopAgentResultsPolling(message.claimId);
      }
    });

    current.messages = [
      {
        sender: 'bot',
        kind: 'text',
        text:
          'Bonjour 👋 Je suis l’assistant InsurFlow.\n\n' +
          'Je peux vous aider à consulter vos polices, suivre vos sinistres ou déclarer un nouveau dossier.'
      }
    ];

    current.needsFileUpload = false;
    current.updatedAt = new Date().toISOString();

    this.chatInput = '';
    this.selectedFiles = [];

    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  sendMessage(): void {
    const message = this.chatInput.trim();

    if (!message || this.chatbotLoading || !this.selectedDiscussion) return;

    this.sendChoiceMessage(message, message);
    this.chatInput = '';
  }

  sendActionMessage(action: AssistantAction): void {
    if (this.chatbotLoading) return;

    this.sendChoiceMessage(action.message, action.message);
  }

  selectClaimType(option: ClaimTypeOption): void {
    if (this.chatbotLoading) return;

    this.sendChoiceMessage(option.type, `Type de sinistre choisi : ${option.label}`);
  }

  selectPolicy(policy: PolicyCard): void {
    if (this.chatbotLoading) return;

    this.sendChoiceMessage(
      policy.id,
      `Police sélectionnée : ${policy.number} (${policy.type})`
    );
  }

  sendSelectedDate(message: ChatMessage): void {
    if (this.chatbotLoading) return;

    const date = message.dateValue?.trim();

    if (!date) {
      return;
    }

    this.sendChoiceMessage(date, `Date de l’incident : ${date}`);
  }

  confirmDeclaration(confirmed: boolean): void {
    if (this.chatbotLoading) return;

    if (confirmed) {
      this.sendChoiceMessage('oui', 'Oui, je valide la déclaration');
    } else {
      this.sendChoiceMessage('non', 'Non, j’annule la déclaration');
    }
  }

  private sendChoiceMessage(payload: string, displayText: string): void {
    if (!payload || this.chatbotLoading || !this.selectedDiscussion) return;

    this.addUserMessage(displayText);
    this.updateDiscussionTitleFromMessage(displayText);

    if (this.loadingProfile) {
      this.addBotMessage(
        'Votre profil client est encore en cours de chargement. Veuillez réessayer dans quelques instants.'
      );
      return;
    }

    if (!this.client?.id) {
      this.addBotMessage(
        'Je ne peux pas accéder à vos données personnelles car votre profil client est introuvable.'
      );
      return;
    }

    this.chatbotLoading = true;
    this.requestScrollToBottom();

    this.assistantService
      .sendMessage(payload, this.client.id, this.selectedDiscussionId)
      .subscribe({
        next: response => {
          this.onAssistantResponse(response);
          this.chatbotLoading = false;
          this.requestScrollToBottom();
        },
        error: err => {
          console.error(err);

          this.addBotMessage(
            'Désolé, une erreur est survenue lors de la communication avec l’assistant.'
          );

          this.chatbotLoading = false;
          this.requestScrollToBottom();
        }
      });
  }

  onAssistantResponse(response: AssistantResponse): void {
    this.addBotMessage(response.answer || 'Je n’ai pas trouvé de réponse.');

    this.needsFileUpload = !!response.needsFileUpload;

    if (response.declarationCompleted) {
      this.selectedFiles = [];
      this.needsFileUpload = false;
    }

    if (response.claimId && response.processing) {
      this.upsertAgentSummaryMessage(
        response.claimId,
        'Analyse de votre dossier en cours...\nVotre dossier est en cours de traitement. Les résultats seront affichés automatiquement ici.',
        true,
        this.selectedDiscussionId
      );

      this.startAgentResultsPolling(response.claimId, this.selectedDiscussionId);
    }

    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files) {
      this.selectedFiles = [];
      return;
    }

    this.selectedFiles = Array.from(input.files);
    this.requestScrollToBottom();
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
    this.requestScrollToBottom();
  }

  sendClaimDocuments(): void {
    if (!this.client?.id) {
      this.addBotMessage('Profil client introuvable.');
      return;
    }

    if (!this.selectedFiles.length) {
      this.addBotMessage('Veuillez sélectionner au moins un document.');
      return;
    }

    this.chatbotLoading = true;
    this.requestScrollToBottom();

    this.assistantService
      .uploadClaimDocuments(
        this.client.id,
        this.selectedFiles,
        this.selectedDiscussionId
      )
      .subscribe({
        next: response => {
          this.selectedFiles = [];
          this.onAssistantResponse(response);
          this.chatbotLoading = false;
          this.requestScrollToBottom();
        },
        error: err => {
          console.error(err);

          this.addBotMessage(
            'Erreur lors de l’envoi des documents. Veuillez réessayer.'
          );

          this.chatbotLoading = false;
          this.requestScrollToBottom();
        }
      });
  }

  continueWithoutDocuments(): void {
    if (this.chatbotLoading) return;

    this.sendChoiceMessage('continuer sans document', 'Continuer sans document');
  }

  goBackToClientSpace(): void {
    this.router.navigate(['/Client_Space']);
  }

  getStoredEmail(): string | null {
    return localStorage.getItem('email');
  }

  getClaimStatusLabel(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PENDING_VALIDATION':
        return 'En attente de validation';

      case 'IN_ANALYSIS':
        return 'En analyse';

      case 'APPROVED':
        return 'Approuvé';

      case 'REJECTED':
        return 'Rejeté';

      case 'CLOSED':
        return 'Clôturé';

      default:
        return status || 'Statut inconnu';
    }
  }

  getClaimStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'APPROVED':
        return 'status-approved';

      case 'REJECTED':
        return 'status-rejected';

      case 'IN_ANALYSIS':
        return 'status-analysis';

      case 'CLOSED':
        return 'status-closed';

      case 'PENDING_VALIDATION':
      default:
        return 'status-pending';
    }
  }

  private startAgentResultsPolling(claimId: number, discussionId: string): void {
    if (this.agentPollingTimers.has(claimId)) {
      return;
    }

    this.claimDiscussionMap.set(claimId, discussionId);

    this.fetchAgentResultsOnce(claimId);

    const timer = setInterval(() => {
      this.fetchAgentResultsOnce(claimId);
    }, 3000);

    this.agentPollingTimers.set(claimId, timer);
  }

  private fetchAgentResultsOnce(claimId: number): void {
    this.assistantService.getClaimAgentResults(claimId).subscribe({
      next: response => {
        const discussionId =
          this.claimDiscussionMap.get(claimId) || this.selectedDiscussionId;

        this.upsertAgentSummaryMessage(
          claimId,
          response.answer || 'Analyse de votre dossier en cours...',
          !!response.processing,
          discussionId
        );

        if (!response.processing) {
          this.stopAgentResultsPolling(claimId);
        }
      },
      error: err => {
        console.error('Erreur récupération résultats agents', err);
        this.stopAgentResultsPolling(claimId);
      }
    });
  }

  private stopAgentResultsPolling(claimId: number): void {
    const timer = this.agentPollingTimers.get(claimId);

    if (timer) {
      clearInterval(timer);
      this.agentPollingTimers.delete(claimId);
    }

    this.claimDiscussionMap.delete(claimId);
  }

  private resumePendingAgentPollings(): void {
    const resumedClaimIds = new Set<number>();

    this.discussions.forEach(discussion => {
      discussion.messages.forEach(message => {
        if (
          (
            message.kind === 'agent-summary' ||
            message.kind === 'agent-router' ||
            message.kind === 'agent-validator' ||
            message.kind === 'agent-estimator'
          ) &&
          message.claimId &&
          message.processing &&
          !resumedClaimIds.has(message.claimId)
        ) {
          resumedClaimIds.add(message.claimId);
          this.startAgentResultsPolling(message.claimId, discussion.id);
        }
      });
    });
  }
  /**
   * Parse le texte de résultat des agents en 3 sections distinctes.
   * Cherche les marqueurs "Agent Routeur", "Agent Validateur", "Agent Estimateur".
   */
  private parseAgentBlocks(text: string): {
    router: string | null;
    validator: string | null;
    estimator: string | null;
  } {
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const norm = normalize(text);

    const routerIdx   = norm.search(/agent\s+routeur/);
    const validatorIdx = norm.search(/agent\s+validateur/);
    const estimatorIdx = norm.search(/agent\s+estimateur/);

    if (routerIdx === -1 && validatorIdx === -1 && estimatorIdx === -1) {
      return { router: null, validator: null, estimator: null };
    }

    // Indices de découpe dans le texte original
    const cuts: Array<{ idx: number; key: 'router' | 'validator' | 'estimator' }> = [];
    if (routerIdx !== -1)    cuts.push({ idx: routerIdx,    key: 'router' });
    if (validatorIdx !== -1) cuts.push({ idx: validatorIdx, key: 'validator' });
    if (estimatorIdx !== -1) cuts.push({ idx: estimatorIdx, key: 'estimator' });

    cuts.sort((a, b) => a.idx - b.idx);

    const result: { router: string | null; validator: string | null; estimator: string | null } =
      { router: null, validator: null, estimator: null };

    for (let i = 0; i < cuts.length; i++) {
      const start = cuts[i].idx;
      const end   = i + 1 < cuts.length ? cuts[i + 1].idx : text.length;
      result[cuts[i].key] = text.slice(start, end).trim();
    }

    return result;
  }

  private upsertAgentSummaryMessage(
    claimId: number,
    text: string,
    processing: boolean,
    discussionId: string
  ): void {
    const discussion = this.discussions.find(d => d.id === discussionId);
    if (!discussion) return;

    const blocks = this.parseAgentBlocks(text);
    const hasBlocks = blocks.router || blocks.validator || blocks.estimator;

    if (!hasBlocks) {
      // Pas encore de résultats parsables → message de chargement unique
      const existing = discussion.messages.find(
        m => m.kind === 'agent-summary' && m.claimId === claimId
      );
      if (existing) {
        existing.text = text;
        existing.processing = processing;
      } else {
        discussion.messages.push({
          sender: 'bot',
          kind: 'agent-summary',
          text,
          claimId,
          processing
        });
      }
    } else {
      // Supprimer l'éventuel message de chargement générique
      const loadingIdx = discussion.messages.findIndex(
        m => m.kind === 'agent-summary' && m.claimId === claimId
      );
      if (loadingIdx !== -1) {
        discussion.messages.splice(loadingIdx, 1);
      }

      const agentDefs: Array<{
        kind: 'agent-router' | 'agent-validator' | 'agent-estimator';
        label: string;
        icon: string;
        content: string | null;
      }> = [
        { kind: 'agent-router',    label: 'Agent Routeur',    icon: '🔀', content: blocks.router },
        { kind: 'agent-validator', label: 'Agent Validateur', icon: '✅', content: blocks.validator },
        { kind: 'agent-estimator', label: 'Agent Estimateur', icon: '💰', content: blocks.estimator }
      ];

      for (const def of agentDefs) {
        if (!def.content) continue;

        const existing = discussion.messages.find(
          m => m.kind === def.kind && m.claimId === claimId
        );

        if (existing) {
          existing.text = def.content;
          existing.agentStatus = processing && def === agentDefs[agentDefs.length - 1]
            ? 'loading' : 'done';
        } else {
          discussion.messages.push({
            sender: 'bot',
            kind: def.kind,
            text: def.content,
            claimId,
            processing,
            agentLabel: def.label,
            agentIcon: def.icon,
            agentStatus: 'done'
          });
        }
      }

      // Si toujours en processing et pas encore d'estimateur → loader estimateur
      if (processing && !blocks.estimator) {
        const hasValidatorLoader = discussion.messages.find(
          m => m.kind === 'agent-estimator' && m.claimId === claimId
        );
        if (!hasValidatorLoader) {
          discussion.messages.push({
            sender: 'bot',
            kind: 'agent-estimator',
            text: '',
            claimId,
            processing: true,
            agentLabel: 'Agent Estimateur',
            agentIcon: '💰',
            agentStatus: 'loading'
          });
        }
      }

      // Si processing et pas encore de validateur → loader validateur
      if (processing && !blocks.validator) {
        const hasValidatorLoader = discussion.messages.find(
          m => m.kind === 'agent-validator' && m.claimId === claimId
        );
        if (!hasValidatorLoader) {
          discussion.messages.push({
            sender: 'bot',
            kind: 'agent-validator',
            text: '',
            claimId,
            processing: true,
            agentLabel: 'Agent Validateur',
            agentIcon: '✅',
            agentStatus: 'loading'
          });
        }
      }
    }

    discussion.updatedAt = new Date().toISOString();
    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  private addUserMessage(text: string): void {
    const current = this.selectedDiscussion;
    if (!current) return;

    current.messages.push({
      sender: 'user',
      text,
      kind: 'text'
    });

    current.updatedAt = new Date().toISOString();

    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  private addBotMessage(text: string): void {
    const current = this.selectedDiscussion;
    if (!current) return;

    current.messages.push(this.buildBotMessage(text));

    current.updatedAt = new Date().toISOString();

    this.saveDiscussions();
    this.requestScrollToBottom();
  }

  private buildBotMessage(text: string): ChatMessage {
    if (this.isClaimTypeQuestion(text)) {
      return {
        sender: 'bot',
        text,
        kind: 'claim-type-picker',
        claimTypeOptions: this.claimTypeOptions
      };
    }

    const declarationPolicies = this.parseDeclarationPolicyOptions(text);

    if (declarationPolicies.length > 0 && this.isPolicyChoiceQuestion(text)) {
      return {
        sender: 'bot',
        text,
        kind: 'policy-picker',
        policyOptions: declarationPolicies
      };
    }

    if (this.isIncidentDateQuestion(text)) {
      return {
        sender: 'bot',
        text,
        kind: 'date-picker',
        dateValue: ''
      };
    }

    if (this.isConfirmationQuestion(text)) {
      return {
        sender: 'bot',
        text,
        kind: 'confirmation-actions'
      };
    }

    const policies = this.parsePolicies(text);
    const claims = this.parseClaims(text);

    if (policies.length > 0) {
      return {
        sender: 'bot',
        text,
        kind: 'policies',
        policies
      };
    }

    if (claims.length > 0) {
      return {
        sender: 'bot',
        text,
        kind: 'claims',
        claims
      };
    }

    return {
      sender: 'bot',
      text,
      kind: 'text'
    };
  }

  private isClaimTypeQuestion(text: string): boolean {
    const lower = this.normalize(text);
    return lower.includes('quel type de sinistre voulez vous declarer');
  }

  private isPolicyChoiceQuestion(text: string): boolean {
    const lower = this.normalize(text);
    return lower.includes('quelle police concerne ce sinistre');
  }

  private isIncidentDateQuestion(text: string): boolean {
    const lower = this.normalize(text);
    return lower.includes('quelle est la date de l incident');
  }

  private isConfirmationQuestion(text: string): boolean {
    const lower = this.normalize(text);
    return lower.includes('voulez vous valider cette declaration');
  }

  private parseDeclarationPolicyOptions(text: string): PolicyCard[] {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- ID'))
      .map(line => {
        const regex =
          /^-\s*ID\s+(\d+)\s*:\s*(.+?)\s+—\s*(.+)$/i;

        const match = line.match(regex);

        if (!match) return null;

        return {
          id: match[1]?.trim(),
          number: match[2]?.trim(),
          type: match[3]?.trim()
        } as PolicyCard;
      })
      .filter((policy): policy is PolicyCard => policy !== null);
  }

  private parsePolicies(text: string): PolicyCard[] {
    const lower = text.toLowerCase();

    if (!lower.includes('polices') && !lower.includes('police')) {
      return [];
    }

    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- ID'))
      .map(line => {
        const regex =
          /^-\s*ID\s+(\d+)\s*:\s*(.+?)\s+—\s+Type\s*:\s*([^—]+)(?:\s+—\s+Formule\s*:\s*([^—]+))?(?:\s+—\s+Fin\s*:\s*(.+))?$/i;

        const match = line.match(regex);

        if (!match) return null;

        return {
          id: match[1]?.trim(),
          number: match[2]?.trim(),
          type: match[3]?.trim(),
          formule: match[4]?.trim(),
          endDate: match[5]?.trim()
        } as PolicyCard;
      })
      .filter((policy): policy is PolicyCard => policy !== null);
  }

  private parseClaims(text: string): ClaimCard[] {
    const lower = text.toLowerCase();

    if (!lower.includes('dossiers de sinistre') && !lower.includes('dossiers')) {
      return [];
    }

    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- Dossier'))
      .map(line => {
        const regex =
          /^-\s*Dossier\s+#?(\d+)\s+—\s+Statut\s*:\s*([^—]+)(?:\s+—\s+Date incident\s*:\s*([^—]+))?(?:\s+—\s+Police\s*:\s*(.+))?$/i;

        const match = line.match(regex);

        if (!match) return null;

        return {
          id: match[1]?.trim(),
          status: match[2]?.trim(),
          incidentDate: match[3]?.trim(),
          policyNumber: match[4]?.trim()
        } as ClaimCard;
      })
      .filter((claim): claim is ClaimCard => claim !== null);
  }

  private updateDiscussionTitleFromMessage(message: string): void {
    const current = this.selectedDiscussion;

    if (!current) return;

    const isDefaultTitle = /^Discussion \d+$/.test(current.title);

    if (!isDefaultTitle) return;

    const cleanTitle = message.trim();

    current.title =
      cleanTitle.length > 28
        ? cleanTitle.substring(0, 28) + '...'
        : cleanTitle;

    current.updatedAt = new Date().toISOString();

    this.saveDiscussions();
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[’']/g, ' ')
      .replace(/[-_]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateDiscussionId(): string {
    return 'disc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
  private requestScrollToBottom(force: boolean = false): void {
    if (force || this.userIsNearBottom) {
      this.shouldScrollToBottom = true;
    }
  }

  private scrollToBottom(): void {
    try {
      const element = this.chatBody?.nativeElement;

      if (!element) {
        return;
      }

      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    } catch (error) {
      console.error('Erreur scroll chatbot', error);
    }
  }

  onChatScroll(): void {
    const element = this.chatBody?.nativeElement;

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    this.userIsNearBottom = distanceFromBottom < 120;
  }
}
