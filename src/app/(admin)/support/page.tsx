'use client';

import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MessageSquare,
  Send,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Shield,
  MoreHorizontal,
  Tag,
  UserCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Types ────────────────────────────────────────────────────────────────

type ConversationStatus = 'open' | 'pending' | 'resolved';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface MockMessage {
  id: string;
  senderType: 'user' | 'admin';
  senderName: string;
  content: string;
  createdAt: string;
}

interface MockConversation {
  id: string;
  userName: string;
  userEmail: string;
  userInitials: string;
  subject: string;
  status: ConversationStatus;
  priority: Priority;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  messages: MockMessage[];
}

// ── Mock data ────────────────────────────────────────────────────────────

const mockConversations: MockConversation[] = [
  {
    id: '1',
    userName: 'Sophie Martin',
    userEmail: 'sophie.martin@gmail.com',
    userInitials: 'SM',
    subject: 'Probleme de connexion a mon compte',
    status: 'open',
    priority: 'high',
    lastMessage: 'J\'ai toujours le meme probleme apres avoir reinitialise...',
    lastMessageAt: '2026-02-23T09:15:00',
    unread: true,
    messages: [
      {
        id: 'm1',
        senderType: 'user',
        senderName: 'Sophie Martin',
        content: 'Bonjour, je n\'arrive plus a me connecter a mon compte depuis ce matin. Le message d\'erreur indique "Identifiants invalides" mais je suis sure de mon mot de passe.',
        createdAt: '2026-02-23T08:30:00',
      },
      {
        id: 'm2',
        senderType: 'admin',
        senderName: 'Marc Dubois',
        content: 'Bonjour Sophie, merci de nous contacter. Avez-vous essaye de reinitialiser votre mot de passe via le lien "Mot de passe oublie" sur la page de connexion ?',
        createdAt: '2026-02-23T08:45:00',
      },
      {
        id: 'm3',
        senderType: 'user',
        senderName: 'Sophie Martin',
        content: 'Oui, j\'ai essaye mais je ne recois pas l\'email de reinitialisation. J\'ai verifie mes spams aussi.',
        createdAt: '2026-02-23T09:00:00',
      },
      {
        id: 'm4',
        senderType: 'user',
        senderName: 'Sophie Martin',
        content: 'J\'ai toujours le meme probleme apres avoir reinitialise. Pouvez-vous verifier mon compte s\'il vous plait ?',
        createdAt: '2026-02-23T09:15:00',
      },
    ],
  },
  {
    id: '2',
    userName: 'Luca Bernasconi',
    userEmail: 'luca.bern@outlook.com',
    userInitials: 'LB',
    subject: 'Question sur l\'abonnement Premium',
    status: 'pending',
    priority: 'medium',
    lastMessage: 'D\'accord, merci pour les details. Je vais y reflechir.',
    lastMessageAt: '2026-02-22T16:30:00',
    unread: false,
    messages: [
      {
        id: 'm5',
        senderType: 'user',
        senderName: 'Luca Bernasconi',
        content: 'Bonjour, je souhaiterais en savoir plus sur les avantages de l\'abonnement Premium. Est-ce que ca vaut le coup pour quelqu\'un qui cherche dans le canton de Vaud ?',
        createdAt: '2026-02-22T14:00:00',
      },
      {
        id: 'm6',
        senderType: 'admin',
        senderName: 'Marie Laurent',
        content: 'Bonjour Luca ! L\'abonnement Premium vous donne acces a des fonctionnalites exclusives comme les alertes emploi en temps reel, l\'assistant IA pour vos candidatures, et le Score SwissReady. Pour le canton de Vaud, nous avons actuellement plus de 350 offres actives en premium.',
        createdAt: '2026-02-22T14:30:00',
      },
      {
        id: 'm7',
        senderType: 'user',
        senderName: 'Luca Bernasconi',
        content: 'D\'accord, merci pour les details. Je vais y reflechir. C\'est combien par mois exactement ?',
        createdAt: '2026-02-22T16:30:00',
      },
    ],
  },
  {
    id: '3',
    userName: 'Amina El Fassi',
    userEmail: 'amina.elfassi@proton.me',
    userInitials: 'AE',
    subject: 'Bug : l\'application plante lors de la recherche',
    status: 'open',
    priority: 'urgent',
    lastMessage: 'Le crash se produit a chaque fois que je filtre par "Geneve".',
    lastMessageAt: '2026-02-23T10:05:00',
    unread: true,
    messages: [
      {
        id: 'm8',
        senderType: 'user',
        senderName: 'Amina El Fassi',
        content: 'L\'application plante systematiquement quand j\'essaie de faire une recherche d\'emploi. J\'utilise un iPhone 14 avec iOS 19.',
        createdAt: '2026-02-23T09:30:00',
      },
      {
        id: 'm9',
        senderType: 'admin',
        senderName: 'Marc Dubois',
        content: 'Merci pour le signalement Amina. Pouvez-vous nous preciser si cela arrive avec tous les filtres de recherche ou seulement certains ?',
        createdAt: '2026-02-23T09:45:00',
      },
      {
        id: 'm10',
        senderType: 'user',
        senderName: 'Amina El Fassi',
        content: 'Le crash se produit a chaque fois que je filtre par "Geneve". Les autres cantons semblent fonctionner normalement.',
        createdAt: '2026-02-23T10:05:00',
      },
    ],
  },
  {
    id: '4',
    userName: 'Thomas Keller',
    userEmail: 'thomas.k@bluewin.ch',
    userInitials: 'TK',
    subject: 'Demande de fonctionnalite : export CV',
    status: 'resolved',
    priority: 'low',
    lastMessage: 'Merci, j\'attends cette fonctionnalite avec impatience !',
    lastMessageAt: '2026-02-21T11:00:00',
    unread: false,
    messages: [
      {
        id: 'm11',
        senderType: 'user',
        senderName: 'Thomas Keller',
        content: 'Serait-il possible d\'ajouter une fonctionnalite pour exporter son CV directement depuis l\'application en format PDF ?',
        createdAt: '2026-02-21T09:00:00',
      },
      {
        id: 'm12',
        senderType: 'admin',
        senderName: 'Marie Laurent',
        content: 'Bonjour Thomas ! C\'est une excellente suggestion. Nous avons justement prevu cette fonctionnalite dans notre roadmap pour le prochain trimestre. Je note votre interet.',
        createdAt: '2026-02-21T10:00:00',
      },
      {
        id: 'm13',
        senderType: 'user',
        senderName: 'Thomas Keller',
        content: 'Merci, j\'attends cette fonctionnalite avec impatience !',
        createdAt: '2026-02-21T11:00:00',
      },
    ],
  },
  {
    id: '5',
    userName: 'Elena Petrova',
    userEmail: 'elena.p@yahoo.com',
    userInitials: 'EP',
    subject: 'Probleme de paiement abonnement',
    status: 'open',
    priority: 'high',
    lastMessage: 'J\'ai ete debitee deux fois pour le meme mois.',
    lastMessageAt: '2026-02-23T07:45:00',
    unread: true,
    messages: [
      {
        id: 'm14',
        senderType: 'user',
        senderName: 'Elena Petrova',
        content: 'Bonjour, j\'ai remarque que j\'ai ete debitee deux fois pour mon abonnement Premium du mois de fevrier. Pouvez-vous verifier et proceder au remboursement ?',
        createdAt: '2026-02-23T07:30:00',
      },
      {
        id: 'm15',
        senderType: 'user',
        senderName: 'Elena Petrova',
        content: 'J\'ai ete debitee deux fois pour le meme mois. Voici les references des transactions : TX-2026-0218-A et TX-2026-0218-B.',
        createdAt: '2026-02-23T07:45:00',
      },
    ],
  },
  {
    id: '6',
    userName: 'Jean-Pierre Muller',
    userEmail: 'jp.muller@gmx.ch',
    userInitials: 'JM',
    subject: 'Comment modifier mon profil ?',
    status: 'resolved',
    priority: 'low',
    lastMessage: 'Parfait, j\'ai reussi. Merci beaucoup !',
    lastMessageAt: '2026-02-20T14:20:00',
    unread: false,
    messages: [
      {
        id: 'm16',
        senderType: 'user',
        senderName: 'Jean-Pierre Muller',
        content: 'Bonjour, je ne trouve pas comment modifier mon adresse email et mon numero de telephone dans mon profil.',
        createdAt: '2026-02-20T13:00:00',
      },
      {
        id: 'm17',
        senderType: 'admin',
        senderName: 'Marc Dubois',
        content: 'Bonjour Jean-Pierre ! Pour modifier vos informations, rendez-vous dans Parametres > Mon profil > Informations personnelles. Vous pourrez y modifier votre email et telephone.',
        createdAt: '2026-02-20T13:30:00',
      },
      {
        id: 'm18',
        senderType: 'user',
        senderName: 'Jean-Pierre Muller',
        content: 'Parfait, j\'ai reussi. Merci beaucoup !',
        createdAt: '2026-02-20T14:20:00',
      },
    ],
  },
  {
    id: '7',
    userName: 'Fatima Benali',
    userEmail: 'fatima.b@sunrise.ch',
    userInitials: 'FB',
    subject: 'Offres partenaires non affichees',
    status: 'pending',
    priority: 'medium',
    lastMessage: 'Nous analysons le probleme, merci de patienter.',
    lastMessageAt: '2026-02-22T18:00:00',
    unread: false,
    messages: [
      {
        id: 'm19',
        senderType: 'user',
        senderName: 'Fatima Benali',
        content: 'Les offres partenaires ne s\'affichent plus dans la section dediee depuis la mise a jour de la semaine derniere.',
        createdAt: '2026-02-22T15:00:00',
      },
      {
        id: 'm20',
        senderType: 'admin',
        senderName: 'Marie Laurent',
        content: 'Merci pour le signalement Fatima. Nous avons identifie un probleme avec le cache. Pouvez-vous essayer de vider le cache de l\'application ?',
        createdAt: '2026-02-22T16:00:00',
      },
      {
        id: 'm21',
        senderType: 'user',
        senderName: 'Fatima Benali',
        content: 'J\'ai vide le cache mais le probleme persiste.',
        createdAt: '2026-02-22T17:00:00',
      },
      {
        id: 'm22',
        senderType: 'admin',
        senderName: 'Marie Laurent',
        content: 'Nous analysons le probleme, merci de patienter. Notre equipe technique travaille sur un correctif.',
        createdAt: '2026-02-22T18:00:00',
      },
    ],
  },
  {
    id: '8',
    userName: 'David Schneider',
    userEmail: 'd.schneider@icloud.com',
    userInitials: 'DS',
    subject: 'Suggestion : mode sombre',
    status: 'resolved',
    priority: 'low',
    lastMessage: 'Genial, merci pour l\'info !',
    lastMessageAt: '2026-02-19T16:45:00',
    unread: false,
    messages: [
      {
        id: 'm23',
        senderType: 'user',
        senderName: 'David Schneider',
        content: 'Est-ce que vous prevoyez d\'ajouter un mode sombre a l\'application ? Ca serait vraiment apprecie pour l\'utilisation en soiree.',
        createdAt: '2026-02-19T15:00:00',
      },
      {
        id: 'm24',
        senderType: 'admin',
        senderName: 'Marc Dubois',
        content: 'Bonne nouvelle David ! Le mode sombre est prevu dans notre prochaine mise a jour majeure prevue pour mars 2026. Restez a l\'ecoute !',
        createdAt: '2026-02-19T16:00:00',
      },
      {
        id: 'm25',
        senderType: 'user',
        senderName: 'David Schneider',
        content: 'Genial, merci pour l\'info !',
        createdAt: '2026-02-19T16:45:00',
      },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

const statusConfig: Record<ConversationStatus, { label: string; color: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: 'Ouvert', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', dot: 'bg-emerald-500', icon: MessageSquare },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', dot: 'bg-amber-500', icon: Clock },
  resolved: { label: 'Resolu', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400', icon: CheckCircle2 },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  medium: { label: 'Moyenne', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

// ── Page Component ───────────────────────────────────────────────────────

export default function SupportPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = mockConversations.find((c) => c.id === selectedId) || null;

  // Filter conversations
  const filteredConversations = mockConversations.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.userName.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Scroll to bottom when conversation changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedId]);

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
            <div className="divide-y">
              {filteredConversations.map((conversation) => {
                const isSelected = selectedId === conversation.id;
                const statusInfo = statusConfig[conversation.status];
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${
                      isSelected ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar size="default">
                          <AvatarFallback>{conversation.userInitials}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${statusInfo.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${conversation.unread ? 'font-semibold' : 'font-medium'}`}>
                            {conversation.userName}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false, locale: fr })}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 truncate ${conversation.unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {conversation.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {conversation.lastMessage}
                        </p>
                      </div>
                      {conversation.unread && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredConversations.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucune conversation trouvee
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right panel — Chat view */}
        <Card className="flex-1 flex flex-col overflow-hidden py-0">
          {selected ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="default">
                    <AvatarFallback>{selected.userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{selected.userName}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig[selected.status].color}`}>
                        {statusConfig[selected.status].label}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityConfig[selected.priority].color}`}>
                        {priorityConfig[selected.priority].label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{selected.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8">
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
                      <DropdownMenuItem>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Assigner
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Tag className="mr-2 h-4 w-4" />
                        Changer priorite
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Marquer urgent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Subject bar */}
              <div className="border-b px-4 py-2 bg-muted/30">
                <p className="text-sm font-medium">{selected.subject}</p>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {selected.messages.map((msg) => {
                    const isAdmin = msg.senderType === 'admin';
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${isAdmin ? 'order-1' : ''}`}>
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
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="border-t p-4">
                <div className="flex gap-3 max-w-3xl mx-auto">
                  <Textarea
                    placeholder="Tapez votre reponse..."
                    rows={2}
                    className="resize-none flex-1"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // Mock send — just clear the input
                        setNewMessage('');
                      }
                    }}
                  />
                  <Button
                    className="self-end"
                    disabled={!newMessage.trim()}
                    onClick={() => setNewMessage('')}
                  >
                    <Send className="h-4 w-4" />
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
