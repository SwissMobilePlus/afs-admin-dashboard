'use client';

import { create } from 'zustand';
import { get, post } from '@/lib/api';

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
  senderType: 'user' | 'admin' | 'system';
  content: string;
  attachments: string[];
  createdAt: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

interface MessagesResponse {
  messages: Message[];
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

  // Actions
  fetchConversations: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  clearMessages: () => void;
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

  fetchConversations: async (params) => {
    set({ isLoadingConversations: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set('status', params.status);
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.limit) queryParams.set('limit', String(params.limit));

      const query = queryParams.toString();
      const url = `/support/conversations${query ? `?${query}` : ''}`;

      const data = await get<ConversationsResponse>(url);
      const totalUnread = data.conversations.reduce(
        (sum, c) => sum + c.unreadCount,
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
        `/support/conversations/${conversationId}/messages`
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
        `/support/conversations/${conversationId}/messages`,
        { content }
      );

      const currentMessages = getState().messages;
      set({
        messages: [...currentMessages, data.message],
        isSending: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur d'envoi";
      set({ isSending: false, error: message });
    }
  },

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation });
  },

  clearMessages: () => {
    set({ messages: [], activeConversation: null });
  },
}));
