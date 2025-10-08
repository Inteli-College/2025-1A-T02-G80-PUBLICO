export { ConversationService } from './ConversationService';
export { MessageService } from './MessageService';
export { OnboardingService } from './OnboardingService';
export { EmbeddingService } from './EmbeddingService';

import { ConversationService } from './ConversationService';
import { MessageService } from './MessageService';
import onboardingServiceInstance from './OnboardingService';
import embeddingServiceInstance from './EmbeddingService';

export const conversationService = new ConversationService();
export const messageService = new MessageService();
export const onboardingService = onboardingServiceInstance;
export const embeddingService = embeddingServiceInstance;
