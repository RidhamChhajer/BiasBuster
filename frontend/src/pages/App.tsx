import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi, chatApi, ChatHistory, ChatMessage } from '@/services/api';
import toast from 'react-hot-toast';
import { Plus, Send, Paperclip, LogOut, Loader2, FileText, Download } from 'lucide-react';
import ChatHistorySidebar from '@/components/ChatHistorySidebar';
import ChatMessageBubble from '@/components/ChatMessageBubble';
import BiasReportCard from '@/components/BiasReportCard';
import ModelSelector from '@/components/ModelSelector';
import jsPDF from 'jspdf';

const App = () => {
  const navigate = useNavigate();
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    loadChatHistory();
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const history = await chatApi.getHistory();
      setChatHistory(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const { chatId } = await chatApi.newChat();
      setCurrentChatId(chatId);
      setMessages([]);
      setUploadedFile(null);
      await loadChatHistory();
      toast.success('New chat started');
    } catch (error) {
      toast.error('Failed to create new chat');
    }
  };

  const handleSelectChat = (chat: ChatHistory) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setUploadedFile(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { fileUrl } = await chatApi.uploadFile(file);
      setUploadedFile(fileUrl);
      toast.success(`File uploaded: ${file.name}`);
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !uploadedFile) return;

    if (!currentChatId) {
      await handleNewChat();
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: inputMessage,
      response: '',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(inputMessage, uploadedFile || undefined, selectedModel);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: '',
        response: response.message,
        report: response.report,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setUploadedFile(null);
      await loadChatHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
      // Remove the user message if sending failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = (report: any, messageId: string) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('BiasBuster - Bias Analysis Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Report ID: ${messageId}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
    
    doc.setFontSize(14);
    doc.text(`Result: ${report.result}`, 20, 60);
    
    doc.setFontSize(12);
    doc.text('Explanation:', 20, 75);
    const explanationLines = doc.splitTextToSize(report.explanation, 170);
    doc.text(explanationLines, 20, 85);
    
    const fixYPosition = 85 + (explanationLines.length * 7) + 10;
    doc.text('How to Fix:', 20, fixYPosition);
    const fixLines = doc.splitTextToSize(report.howToFix, 170);
    doc.text(fixLines, 20, fixYPosition + 10);
    
    doc.save(`bias-report-${messageId}.pdf`);
    toast.success('Report downloaded');
  };

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Chat History */}
      <ChatHistorySidebar
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onLogout={handleLogout}
      />

      {/* Right Panel - Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-20 h-20 mx-auto glass-card rounded-2xl flex items-center justify-center">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Start a Conversation</h2>
                <p className="text-muted-foreground">
                  Upload a dataset or ask a question about bias detection
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className="space-y-4">
                  {message.message && (
                    <ChatMessageBubble
                      message={message.message}
                      isUser={true}
                    />
                  )}
                  {message.response && (
                    <ChatMessageBubble
                      message={message.response}
                      isUser={false}
                    />
                  )}
                  {message.report && (
                    <BiasReportCard
                      report={message.report}
                      onDownload={() => handleDownloadReport(message.report, message.id)}
                    />
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-border bg-background/50 backdrop-blur-xl p-4">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto space-y-3">
            {uploadedFile && (
              <div className="glass-card rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>File uploaded</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                >
                  Remove
                </Button>
              </div>
            )}
            
            <div className="flex items-end gap-3">
              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".csv,.json,.txt,.xlsx"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="h-12 w-12"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {/* Message Input */}
              <div className="flex-1 glass-card rounded-xl p-3">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about bias in your data or model..."
                  className="w-full bg-transparent outline-none resize-none max-h-32 min-h-[40px]"
                  rows={1}
                />
              </div>

              {/* Model Selector */}
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />

              {/* Send Button */}
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || (!inputMessage.trim() && !uploadedFile)}
                className="h-12 w-12"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
