export type { 
  Conversation, 
  CreateConversationData, 
  UpdateConversationData 
} from './Conversation';
 
export type { 
  Message, 
  CreateMessageData, 
  ConversationContext, 
  ConversationStats,
  MessagePreview 
} from './Message';

export type {
  UserProfile,
  UserProfileUpdate
} from './UserProfile';

export { OnboardingStep, ONBOARDING_QUESTIONS } from './UserProfile';

export type {
  KnowledgeBase,
  KnowledgeDataItem,
  SemanticSearchResult
} from './KnowledgeBase';
