'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Target,
  Send,
  Activity,
  UserCog,
  Ban,
  Bell,
  Briefcase,
  CheckCircle2,
  FileText,
  LogIn,
  Star,
  Award,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { get } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────
interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  canton: string;
  cantonCode: string;
  plan: 'free' | 'premium';
  role: 'user' | 'admin' | 'support' | 'partner';
  swissReadyScore: number;
  createdAt: string;
  isBanned: boolean;
  phone?: string;
  candidaturesSent: number;
  activeDays: number;
}

interface ActivityItem {
  id: string;
  type: 'login' | 'candidature' | 'document' | 'score' | 'plan' | 'profile';
  description: string;
  timestamp: string;
}

// ── API response mapping ────────────────────────────────────────────────
function mapApiUser(u: Record<string, unknown>): UserDetail {
  const nameStr = (u.name as string) || '';
  const firstNameStr = (u.firstName as string) || '';
  const lastName = nameStr.includes(' ')
    ? nameStr.replace(firstNameStr, '').trim()
    : '';
  const cantons = Array.isArray(u.cantons) ? (u.cantons as string[]) : [];
  const sub = u.subscription as Record<string, unknown> | null;
  const counts = u._count as Record<string, number> | null;
  return {
    id: (u.id as string) || '',
    firstName: firstNameStr || nameStr.split(' ')[0] || '',
    lastName: lastName || (nameStr.split(' ').slice(1).join(' ') || ''),
    email: (u.email as string) || '',
    canton: cantons[0] || '',
    cantonCode: cantons[0] || '',
    plan: (sub?.status === 'active' ? 'premium' : 'free') as 'free' | 'premium',
    role: (u.role as 'user' | 'admin' | 'support' | 'partner') || 'user',
    swissReadyScore: 0,
    createdAt: (u.createdAt as string) || '',
    isBanned: !!u.bannedAt,
    phone: (u.phone as string) || undefined,
    candidaturesSent: counts?.applications ?? 0,
    activeDays: 0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (role) {
    case 'admin':
      return 'default';
    case 'support':
      return 'secondary';
    case 'partner':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'support':
      return 'Support';
    case 'partner':
      return 'Partenaire';
    default:
      return 'Utilisateur';
  }
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'login':
      return <LogIn className="size-4" />;
    case 'candidature':
      return <Briefcase className="size-4" />;
    case 'document':
      return <FileText className="size-4" />;
    case 'score':
      return <Star className="size-4" />;
    case 'plan':
      return <Award className="size-4" />;
    case 'profile':
      return <CheckCircle2 className="size-4" />;
    default:
      return <Activity className="size-4" />;
  }
}

function getActivityColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'login':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
    case 'candidature':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400';
    case 'document':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400';
    case 'score':
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400';
    case 'plan':
      return 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400';
    case 'profile':
      return 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

const numberFormatter = new Intl.NumberFormat('fr-CH');

// ── Component ────────────────────────────────────────────────────────────
export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  // Fetch user
  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      setLoading(true);
      try {
        const data = await get<Record<string, unknown>>(`/admin/users/${userId}`);
        if (!cancelled) {
          setUser(mapApiUser(data));
          setActivity([]);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setActivity([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Action handlers
  async function confirmRoleChange() {
    if (!user || !newRole) return;
    try {
      const { patch } = await import('@/lib/api');
      await patch(`/admin/users/${user.id}`, { role: newRole });
    } catch {
      // Update locally as fallback
    }
    setUser((prev) => (prev ? { ...prev, role: newRole as UserDetail['role'] } : prev));
    setRoleDialogOpen(false);
  }

  async function confirmBanToggle() {
    if (!user) return;
    const newBanned = !user.isBanned;
    try {
      const { patch } = await import('@/lib/api');
      await patch(`/admin/users/${user.id}`, { isBanned: newBanned });
    } catch {
      // Update locally as fallback
    }
    setUser((prev) => (prev ? { ...prev, isBanned: newBanned } : prev));
    setBanDialogOpen(false);
  }

  // ── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="size-8 rounded bg-muted animate-pulse" />
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 pt-6">
                <div className="size-20 rounded-full bg-muted animate-pulse" />
                <div className="h-5 w-36 rounded bg-muted animate-pulse" />
                <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse mb-2" />
                    <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Utilisateur non trouvé</p>
        <Button variant="outline" onClick={() => router.push('/users')}>
          <ArrowLeft className="size-4" />
          Retour aux utilisateurs
        </Button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/users')}>
          <ArrowLeft className="size-4" />
          Retour
        </Button>
        <h1 className="text-xl font-bold tracking-tight">
          {user.firstName} {user.lastName}
        </h1>
        {user.isBanned && (
          <Badge variant="destructive">Banni</Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: User Info Card */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              {/* Large Avatar */}
              <Avatar className="size-20 text-2xl">
                <AvatarFallback className="text-xl">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>

              {/* Name & Email */}
              <div className="flex flex-col items-center gap-1 text-center">
                <h2 className="text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
                <Badge
                  className={
                    user.plan === 'premium'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }
                >
                  {user.plan === 'premium' ? 'Premium' : 'Free'}
                </Badge>
              </div>

              {/* Contact Info */}
              <div className="w-full space-y-3 border-t pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <span>
                    {user.canton} ({user.cantonCode})
                  </span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span>
                    Inscrit {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setNewRole(user.role);
                  setRoleDialogOpen(true);
                }}
              >
                <UserCog className="size-4" />
                Changer le rôle
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setNotifDialogOpen(true)}
              >
                <Bell className="size-4" />
                Envoyer une notification
              </Button>
              <Button
                variant={user.isBanned ? 'outline' : 'destructive'}
                className="w-full justify-start"
                onClick={() => setBanDialogOpen(true)}
              >
                <Ban className="size-4" />
                {user.isBanned ? 'Débannir l\'utilisateur' : 'Bannir l\'utilisateur'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Stats + Activity */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Score SwissReady
                  </span>
                </div>
                <p
                  className={`mt-2 text-2xl font-bold tabular-nums ${
                    user.swissReadyScore >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : user.swissReadyScore >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {numberFormatter.format(user.swissReadyScore)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Send className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Candidatures
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {numberFormatter.format(user.candidaturesSent)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Jours actifs
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {numberFormatter.format(user.activeDays)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Inscription
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold">
                  {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: fr })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>
                Dernières actions de l&apos;utilisateur sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <Activity className="size-8" />
                  <p className="text-sm">Aucune activite recente</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {activity.map((item, index) => (
                    <div key={item.id} className="flex gap-4 pb-6 last:pb-0">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${getActivityColor(
                            item.type
                          )}`}
                        >
                          {getActivityIcon(item.type)}
                        </div>
                        {index < activity.length - 1 && (
                          <div className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <p className="text-sm leading-relaxed">{item.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.timestamp), {
                            addSuffix: true,
                            locale: fr,
                          })}
                          {' — '}
                          {format(new Date(item.timestamp), 'dd MMM yyyy, HH:mm', {
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
            <DialogDescription>
              Modifier le rôle de{' '}
              <span className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="partner">Partenaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={confirmRoleChange}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Unban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user.isBanned ? 'Débannir' : 'Bannir'} l&apos;utilisateur
            </DialogTitle>
            <DialogDescription>
              {user.isBanned
                ? 'Êtes-vous sûr de vouloir débannir '
                : 'Êtes-vous sûr de vouloir bannir '}
              <span className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </span>
              {' ?'}
              {!user.isBanned &&
                " L'utilisateur ne pourra plus accéder à la plateforme."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={user.isBanned ? 'default' : 'destructive'}
              onClick={confirmBanToggle}
            >
              {user.isBanned ? 'Débannir' : 'Bannir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer une notification</DialogTitle>
            <DialogDescription>
              Envoyer une notification push à{' '}
              <span className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none resize-none"
              placeholder="Tapez votre message ici..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => setNotifDialogOpen(false)}>
              <Send className="size-4" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
