'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MessageSquare, Send, Search, CheckCircle2, Clock,
  AlertTriangle, User, Shield, MoreHorizontal, Tag, UserCheck,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupportStore, type Conversation, type Message } from '@/stores/support.store';
import { connectSocket, getSocket, disconnectSocket } from '@/lib/socket';

// ── Status/Priority config ──────────────────────────────────────────

type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

const statusConfig: Record<ConversationStatus, { label: string; color: string; dot: string }> = {
  open: { label: 'Ouvert', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', dot: 'bg-amber-500' },
  resolved: { label: 'Resolu', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
  closed: { label: 'Ferme', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', dot: 'bg-red-400' },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  medium: { label: 'Moyenne', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

// ── Helper to get initials ──────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Page Component ───────────────────────────────────────────────────

export default function SupportPage() {
  const {
    conversations, messages, activeConversation, typingUsers,
    isLoadingConversations, isLoadingMessages, isSending,
    fetchConversations, fetchMessages, sendMessage, updateConversation,
    setActiveConversation, addRealtimeMessage, setTypingUser,
  } = useSupportStore();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevConvIdRef = useRef<string | null>(null);

  // ── Fetch conversations on mount & filter change ──
  useEffect(() => {
    const params: any = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    if (priorityFilter !== 'all') params.priority = priorityFilter;
    if (searchQuery) params.search = searchQuery;
    fetchConversations(params);
  }, [statusFilter, priorityFilter, searchQuery, fetchConversations]);

  // ── WebSocket connection ──
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    socket.on('message:new', (data: Message) => {
      addRealtimeMessage(data);
    });

    socket.on('conversation:activity', (data: { conversationId: string; message: Message }) => {
      // New message in any conversation — refresh list
      addRealtimeMessage(data.message);
    });

    socket.on('typing:start', (data: { conversationId: string; name: string }) => {
      setTypingUser(data.conversationId, data.name, true);
    });

    socket.on('typing:stop', (data: { conversationId: string; name: string }) => {
      setTypingUser(data.conversationId, data.name, false);
    });

    return () => {
      disconnectSocket();
    };
  }, [addRealtimeMessage, setTypingUser]);

  // ── Join/leave conversation room ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Leave previous
    if (prevConvIdRef.current) {
      socket.emit('leave:conversation', { conversationId: prevConvIdRef.current });
    }

    // Join new
    if (activeConversation) {
      socket.emit('join:conversation', { conversationId: activeConversation.id });
      fetchMessages(activeConversation.id);
    }

    prevConvIdRef.current = activeConversation?.id || null;
  }, [activeConversation, fetchMessages]);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Handle send ──
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !activeConversation) return;
    const content = newMessage.trim();
    setNewMessage('');
    await sendMessage(activeConversation.id, content);
  }, [newMessage, activeConversation, sendMessage]);

  // ── Handle typing ──
  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeConversation) return;

    socket.emit('typing:start', { conversationId: activeConversation.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversation.id });
    }, 2000);
  }, [activeConversation]);

  // ── Handle resolve ──
  const handleResolve = useCallback(async () => {
    if (!activeConversation) return;
    await updateConversation(activeConversation.id, { status: 'resolved' });
    setActiveConversation(null);
  }, [activeConversation, updateConversation, setActiveConversation]);

  // ── Handle priority change ──
  const handleSetUrgent = useCallback(async () => {
    if (!activeConversation) return;
    await updateConversation(activeConversation.id, { priority: 'urgent' });
  }, [activeConversation, updateConversation]);

  // ── Typing indicator text ──
  const currentTyping = activeConversation
    ? typingUsers[activeConversation.id] || []
    : [];

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerez les conversations avec les utilisateurs
        </p>
      </div>

      {/* Split view */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel — Conversation list */}
        <Card className="w-[380px] shrink-0 flex flex-col overflow-hidden py-0">
          {/* Filters */}
          <div className="p-3 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="flex-1">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="resolved">Resolu</SelectItem>
                  <SelectItem value="closed">Ferme</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger size="sm" className="flex-1">
                  <SelectValue placeholder="Priorite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conversation) => {
                  const isSelected = activeConversation?.id === conversation.id;
                  const sConf = statusConfig[conversation.status] || statusConfig.open;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveConversation(conversation)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${
                        isSelected ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar size="default">
                            <AvatarFallback>{getInitials(conversation.userName || 'U')}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${sConf.dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm truncate font-medium">
                              {conversation.userName}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false, locale: fr })}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 truncate text-foreground">
                            {conversation.subject}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {conversations.length === 0 && !isLoadingConversations && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Aucune conversation trouvee
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Right panel — Chat view */}
        <Card className="flex-1 flex flex-col overflow-hidden py-0">
          {activeConversation ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="default">
                    <AvatarFallback>{getInitials(activeConversation.userName || 'U')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{activeConversation.userName}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${(statusConfig[activeConversation.status] || statusConfig.open).color}`}>
                        {(statusConfig[activeConversation.status] || statusConfig.open).label}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${(priorityConfig[activeConversation.priority] || priorityConfig.medium).color}`}>
                        {(priorityConfig[activeConversation.priority] || priorityConfig.medium).label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{activeConversation.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={handleResolve}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Resoudre
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleSetUrgent}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Marquer urgent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateConversation(activeConversation.id, { status: 'closed' }).then(() => setActiveConversation(null))}>
                        <Tag className="mr-2 h-4 w-4" />
                        Fermer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Subject bar */}
              <div className="border-b px-4 py-2 bg-muted/30">
                <p className="text-sm font-medium">{activeConversation.subject}</p>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 px-4 py-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {messages.map((msg) => {
                      const isAdmin = msg.senderRole === 'admin';
                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%]`}>
                            <div className={`flex items-center gap-2 mb-1 ${isAdmin ? 'justify-end' : ''}`}>
                              <span className="text-xs font-medium">{msg.senderName}</span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                isAdmin
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {isAdmin ? <Shield className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                                {isAdmin ? 'Admin' : 'Utilisateur'}
                              </span>
                            </div>
                            <div className={`rounded-2xl px-4 py-2.5 ${
                              isAdmin
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            }`}>
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                            <p className={`text-[10px] text-muted-foreground mt-1 ${isAdmin ? 'text-right' : ''}`}>
                              {format(new Date(msg.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {/* Typing indicator */}
                    {currentTyping.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex gap-1">
                          <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                          <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                          <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
                        </div>
                        {currentTyping.join(', ')} ecrit...
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input area */}
              <div className="border-t p-4">
                <div className="flex gap-3 max-w-3xl mx-auto">
                  <Textarea
                    placeholder="Tapez votre reponse..."
                    rows={2}
                    className="resize-none flex-1"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    className="self-end"
                    disabled={!newMessage.trim() || isSending}
                    onClick={handleSend}
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-full bg-muted p-4">
                <MessageSquare className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium">Selectionnez une conversation</p>
              <p className="text-xs">
                Choisissez une conversation dans la liste pour afficher les messages
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
