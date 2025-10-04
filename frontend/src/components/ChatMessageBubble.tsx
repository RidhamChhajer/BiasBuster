import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatMessageBubbleProps {
  message: string;
  isUser: boolean;
}

const ChatMessageBubble = ({ message, isUser }: ChatMessageBubbleProps) => {
  return (
    <div
      className={cn(
        "flex gap-3 max-w-3xl",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-primary text-primary-foreground"
            : "glass-card"
        )}
      >
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-primary" />}
      </div>

      {/* Message */}
      <div
        className={cn(
          "rounded-2xl p-4 prose prose-sm max-w-none",
          isUser
            ? "bg-primary text-primary-foreground"
            : "glass-card"
        )}
      >
        <p className={cn("whitespace-pre-wrap", isUser && "text-primary-foreground")}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
