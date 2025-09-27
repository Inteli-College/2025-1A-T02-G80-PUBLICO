export { ConversationService } from './ConversationService';
export { MessageService } from './MessageService';

import { ConversationService } from './ConversationService';
import { MessageService } from './MessageService';

export const conversationService = new ConversationService();
export const messageService = new MessageService();
