export type { 
  Conversation, 
  CreateConversationData, 
  UpdateConversationData 
} from './Conversation.js';
 
export type { 
  Message, 
  CreateMessageData, 
  ConversationContext, 
  ConversationStats,
  MessagePreview 
} from './Message.js';

export type {
  UserProfile,
  UserProfileUpdate,
  OnboardingQuestion
} from './UserProfile.js';

export { OnboardingStep, ONBOARDING_QUESTIONS } from './UserProfile.js';

export type {
  Persona,
  CreatePersonaData,
  UpdatePersonaData,
  UserPersonaHistory
} from './Persona.js';

export type {
  KnowledgeBase,
  KnowledgeDataItem,
  SemanticSearchResult
} from './KnowledgeBase.js';
