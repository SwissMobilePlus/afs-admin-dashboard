'use client';

import { create } from 'zustand';
import { get, post, patch } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  content: string;
  attachmentUrl: string | null;
  read: boolean;
  createdAt: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  pages: number;
}

interface MessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  pages: number;
}

interface SendMessageResponse {
  message: Message;
}

// ── Store ─────────────────────────────────────────────────────────────

interface SupportState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  unreadCount: number;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;
  typingUsers: Record<string, string[]>; // conversationId -> userName[]

  // Actions
  fetchConversations: (params?: {
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  updateConversation: (conversationId: string, data: { status?: string; priority?: string; assignedToId?: string }) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  clearMessages: () => void;

  // Realtime actions
  addRealtimeMessage: (message: Message) => void;
  updateConversationInList: (conversationId: string, updates: Partial<Conversation>) => void;
  setTypingUser: (conversationId: string, userName: string, isTyping: boolean) => void;
}

export const useSupportStore = create<SupportState>((set, getState) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  unreadCount: 0,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,
  typingUsers: {},

  fetchConversations: async (params) => {
    set({ isLoadingConversations: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set('status', params.status);
      if (params?.priority) queryParams.set('priority', params.priority);
      if (params?.search) queryParams.set('search', params.search);
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.limit) queryParams.set('limit', String(params.limit));

      const query = queryParams.toString();
      const url = `/support/admin/conversations${query ? `?${query}` : ''}`;

      const data = await get<ConversationsResponse>(url);
      const totalUnread = data.conversations.reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0
      );

      set({
        conversations: data.conversations,
        unreadCount: totalUnread,
        isLoadingConversations: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur de chargement';
      set({ isLoadingConversations: false, error: message });
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true, error: null });
    try {
      const data = await get<MessagesResponse>(
        `/support/admin/conversations/${conversationId}/messages`
      );
      set({
        messages: data.messages,
        isLoadingMessages: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur de chargement';
      set({ isLoadingMessages: false, error: message });
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    set({ isSending: true, error: null });
    try {
      const data = await post<SendMessageResponse>(
        `/support/admin/conversations/${conversationId}/messages`,
        { content }
      );

      const currentMessages = getState().messages;
      // Avoid duplicate if socket already added it
      const exists = currentMessages.find(m => m.id === data.message.id);
      if (!exists) {
        set({
          messages: [...currentMessages, data.message],
          isSending: false,
        });
      } else {
        set({ isSending: false });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur d'envoi";
      set({ isSending: false, error: message });
    }
  },

  updateConversation: async (conversationId: string, data: { status?: string; priority?: string; assignedToId?: string }) => {
    try {
      await patch(`/support/admin/conversations/${conversationId}`, data);
      // Refresh the list
      getState().fetchConversations();
    } catch (err: unknown) {
      console.error('Error updating conversation:', err);
    }
  },

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation });
  },

  clearMessages: () => {
    set({ messages: [], activeConversation: null });
  },

  // ── Realtime actions ──────────────────────────────────────

  addRealtimeMessage: (message: Message) => {
    const state = getState();
    // If viewing this conversation, add the message
    if (state.activeConversation?.id === message.conversationId) {
      const exists = state.messages.find(m => m.id === message.id);
      if (!exists) {
        set({ messages: [...state.messages, message] });
      }
    }
    // Update conversation list preview
    set({
      conversations: state.conversations.map(c =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message.content, lastMessageAt: message.createdAt }
          : c
      ),
    });
  },

  updateConversationInList: (conversationId: string, updates: Partial<Conversation>) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId ? { ...c, ...updates } : c
      ),
    }));
  },

  setTypingUser: (conversationId: string, userName: string, isTyping: boolean) => {
    set(state => {
      const current = state.typingUsers[conversationId] || [];
      if (isTyping) {
        if (current.includes(userName)) return state;
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: [...current, userName],
          },
        };
      } else {
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: current.filter(n => n !== userName),
          },
        };
      }
    });
  },
}));
