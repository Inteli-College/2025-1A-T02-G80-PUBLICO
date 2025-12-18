export { ConversationService } from './ConversationService.js';
export { MessageService } from './MessageService.js';
export { OnboardingService } from './OnboardingService.js';
export { EmbeddingService } from './EmbeddingService.js';
export { PersonaService } from './PersonaService.js';

import { ConversationService } from './ConversationService.js';
import { MessageService } from './MessageService.js';
import onboardingServiceInstance from './OnboardingService.js';
import embeddingServiceInstance from './EmbeddingService.js';
import personaServiceInstance from './PersonaService.js';

export const conversationService = new ConversationService();
export const messageService = new MessageService();
export const onboardingService = onboardingServiceInstance;
export const embeddingService = embeddingServiceInstance;
export const personaService = personaServiceInstance;
