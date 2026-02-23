'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserPlus, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RecentUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface RecentTicket {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

interface RecentActivityProps {
  recentUsers: RecentUser[];
  recentTickets: RecentTicket[];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getTicketStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'open':
    case 'ouvert':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400';
    case 'pending':
    case 'in_progress':
    case 'en_cours':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400';
    case 'resolved':
    case 'closed':
    case 'resolu':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getTicketStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'open':
    case 'ouvert':
      return 'Ouvert';
    case 'pending':
      return 'En attente';
    case 'in_progress':
    case 'en_cours':
      return 'En cours';
    case 'resolved':
    case 'closed':
    case 'resolu':
      return 'R\u00e9solu';
    default:
      return status;
  }
}

function formatRelativeDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return dateStr;
  }
}

export function RecentActivity({ recentUsers, recentTickets }: RecentActivityProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Recent Users */}
      <Card className="py-5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Derni\u00e8res inscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucune inscription r&eacute;cente
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Avatar size="default">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatRelativeDate(user.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card className="py-5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Tickets r\u00e9cents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun ticket r&eacute;cent
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-shrink-0 rounded-lg bg-muted/50 p-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {ticket.subject}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(ticket.createdAt)}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'flex-shrink-0 text-[10px] font-medium border-0',
                      getTicketStatusColor(ticket.status)
                    )}
                  >
                    {getTicketStatusLabel(ticket.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
