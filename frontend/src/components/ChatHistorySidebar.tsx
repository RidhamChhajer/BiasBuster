import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, LogOut, MessageSquare } from 'lucide-react';
import { ChatHistory } from '@/services/api';
import { cn } from '@/lib/utils';

interface ChatHistorySidebarProps {
  chatHistory: ChatHistory[];
  currentChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chat: ChatHistory) => void;
  onLogout: () => void;
}

const ChatHistorySidebar = ({
  chatHistory,
  currentChatId,
  onNewChat,
  onSelectChat,
  onLogout,
}: ChatHistorySidebarProps) => {
  return (
    <div className="w-80 border-r border-border bg-background/50 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="default"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {chatHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chats yet</p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all duration-200",
                  "hover:bg-muted/50",
                  currentChatId === chat.id
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-background/50"
                )}
              >
                <h3 className="font-medium text-sm line-clamp-1">
                  {chat.title || 'New Conversation'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(chat.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default ChatHistorySidebar;
