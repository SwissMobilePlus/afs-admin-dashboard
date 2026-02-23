'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Flag,
  Shield,
  ScrollText,
  UserPlus,
  Sparkles,
  Bot,
  Bell,
  Handshake,
  Award,
  Clock,
  MoreHorizontal,
  Trash2,
  Pencil,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { get, post, patch } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface AuditEntry {
  id: string;
  date: string;
  admin: string;
  action: string;
  target: string;
  details: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support';
  lastAccess: string;
  avatar: string;
}

// ── API response types ───────────────────────────────────────────────────

interface ApiFlagResponse {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  percentage: number;
}

interface ApiAuditResponse {
  id: string;
  createdAt: string;
  admin: string;
  action: string;
  target: string;
  details: string;
}

interface ApiAdminResponse {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support';
  lastLoginAt: string;
}

// ── Icon mapping for feature flags ───────────────────────────────────────

const flagIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  premium_features: Sparkles,
  ai_assistant: Bot,
  job_alerts: Bell,
  partner_offers: Handshake,
  swiss_ready_score: Award,
};

// ── Mock data (fallback) ─────────────────────────────────────────────────

const MOCK_FLAGS: FeatureFlag[] = [
  {
    key: 'premium_features',
    label: 'Fonctionnalites Premium',
    description: 'Active les fonctionnalites reservees aux abonnes Premium (score SwissReady avance, candidatures illimitees)',
    enabled: true,
    percentage: 100,
    icon: Sparkles,
  },
  {
    key: 'ai_assistant',
    label: 'Assistant IA',
    description: 'Active l\'assistant IA pour l\'aide a la redaction de CV et la preparation aux entretiens',
    enabled: true,
    percentage: 75,
    icon: Bot,
  },
  {
    key: 'job_alerts',
    label: 'Alertes Emploi',
    description: 'Permet aux utilisateurs de configurer des alertes push et email pour les nouvelles offres correspondant a leurs criteres',
    enabled: true,
    percentage: 100,
    icon: Bell,
  },
  {
    key: 'partner_offers',
    label: 'Offres Partenaires',
    description: 'Affiche les offres et promotions des partenaires dans la section dediee de l\'application',
    enabled: false,
    percentage: 0,
    icon: Handshake,
  },
  {
    key: 'swiss_ready_score',
    label: 'Score SwissReady',
    description: 'Calcule et affiche un score de compatibilite avec le marche de l\'emploi suisse base sur le profil de l\'utilisateur',
    enabled: true,
    percentage: 50,
    icon: Award,
  },
];

const MOCK_AUDIT: AuditEntry[] = [
  { id: '1', date: '2026-02-23T09:30:00', admin: 'Marc Dubois', action: 'settings.update', target: 'feature_flags.ai_assistant', details: 'Pourcentage modifie de 50% a 75%' },
  { id: '2', date: '2026-02-23T09:15:00', admin: 'Marc Dubois', action: 'user.update', target: 'sophie.martin@gmail.com', details: 'Mot de passe reinitialise' },
  { id: '3', date: '2026-02-22T18:45:00', admin: 'Marie Laurent', action: 'campaign.create', target: 'Nouvelles offres premium', details: 'Campagne push creee, audience: 3420' },
  { id: '4', date: '2026-02-22T16:00:00', admin: 'Marie Laurent', action: 'partner.create', target: 'FormationPro SA', details: 'Nouveau partenaire ajoute' },
  { id: '5', date: '2026-02-22T14:30:00', admin: 'Marc Dubois', action: 'user.ban', target: 'spam.user@test.com', details: 'Compte desactive pour spam' },
  { id: '6', date: '2026-02-22T11:00:00', admin: 'Marc Dubois', action: 'settings.update', target: 'feature_flags.swiss_ready_score', details: 'Active avec rollout a 50%' },
  { id: '7', date: '2026-02-21T17:20:00', admin: 'Marie Laurent', action: 'campaign.send', target: 'Marche de l\'emploi suisse', details: 'Campagne email envoyee a 5200 utilisateurs' },
  { id: '8', date: '2026-02-21T15:00:00', admin: 'Marc Dubois', action: 'user.update', target: 'thomas.k@bluewin.ch', details: 'Plan passe de Free a Premium' },
  { id: '9', date: '2026-02-21T10:30:00', admin: 'Admin System', action: 'jobs.import', target: 'Import automatique', details: '142 offres importees depuis JobScout24' },
  { id: '10', date: '2026-02-20T18:00:00', admin: 'Marie Laurent', action: 'partner.update', target: 'SwissInsurance AG', details: 'Commission modifiee de 15% a 18%' },
  { id: '11', date: '2026-02-20T14:15:00', admin: 'Marc Dubois', action: 'campaign.create', target: 'Alerte emploi Geneve', details: 'Campagne push creee, audience: 1950' },
  { id: '12', date: '2026-02-20T09:00:00', admin: 'Admin System', action: 'jobs.import', target: 'Import automatique', details: '118 offres importees depuis Indeed' },
  { id: '13', date: '2026-02-19T16:30:00', admin: 'Marie Laurent', action: 'user.update', target: 'elena.p@yahoo.com', details: 'Remboursement de 9.90 CHF effectue' },
  { id: '14', date: '2026-02-19T11:00:00', admin: 'Marc Dubois', action: 'settings.update', target: 'feature_flags.partner_offers', details: 'Fonctionnalite desactivee temporairement' },
  { id: '15', date: '2026-02-18T14:00:00', admin: 'Marc Dubois', action: 'admin.invite', target: 'new.support@afs-app.ch', details: 'Invitation envoyee, role: support' },
];

const MOCK_ADMINS: AdminUser[] = [
  {
    id: '1',
    name: 'Marc Dubois',
    email: 'marc.dubois@afs-app.ch',
    role: 'super_admin',
    lastAccess: '2026-02-23T09:30:00',
    avatar: 'MD',
  },
  {
    id: '2',
    name: 'Marie Laurent',
    email: 'marie.laurent@afs-app.ch',
    role: 'admin',
    lastAccess: '2026-02-22T18:45:00',
    avatar: 'ML',
  },
  {
    id: '3',
    name: 'Pierre Favre',
    email: 'pierre.favre@afs-app.ch',
    role: 'support',
    lastAccess: '2026-02-21T12:00:00',
    avatar: 'PF',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

function generateAvatar(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

const actionLabels: Record<string, { label: string; color: string }> = {
  'settings.update': { label: 'Parametres', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  'user.update': { label: 'Utilisateur', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  'user.ban': { label: 'Ban', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  'campaign.create': { label: 'Campagne', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  'campaign.send': { label: 'Envoi', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  'partner.create': { label: 'Partenaire', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' },
  'partner.update': { label: 'Partenaire', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' },
  'jobs.import': { label: 'Import', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  'admin.invite': { label: 'Admin', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
};

const roleLabels: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  admin: { label: 'Administrateur', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  support: { label: 'Support', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
};

// ── Page Component ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(MOCK_FLAGS);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(MOCK_AUDIT);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(MOCK_ADMINS);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('support');

  // ── Fetch all data on mount ────────────────────────────────────────────

  useEffect(() => {
    async function fetchAll() {
      const [flagsResult, auditResult, adminsResult] = await Promise.allSettled([
        get<ApiFlagResponse[]>('/admin/settings/feature-flags'),
        get<{ data: ApiAuditResponse[] }>('/admin/audit-log'),
        get<ApiAdminResponse[]>('/admin/settings/admins'),
      ]);

      if (flagsResult.status === 'fulfilled') {
        const apiFlags = flagsResult.value;
        setFlags(
          apiFlags.map((f) => ({
            key: f.key,
            label: f.label,
            description: f.description,
            enabled: f.enabled,
            percentage: f.percentage,
            icon: flagIconMap[f.key] || Flag,
          }))
        );
      }

      if (auditResult.status === 'fulfilled') {
        const apiAudit = auditResult.value;
        const entries = Array.isArray(apiAudit) ? apiAudit : apiAudit.data;
        setAuditEntries(
          entries.map((e) => ({
            id: e.id,
            date: e.createdAt,
            admin: e.admin,
            action: e.action,
            target: e.target,
            details: e.details,
          }))
        );
      }

      if (adminsResult.status === 'fulfilled') {
        const apiAdmins = adminsResult.value;
        setAdminUsers(
          apiAdmins.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            role: a.role,
            lastAccess: a.lastLoginAt,
            avatar: generateAvatar(a.name),
          }))
        );
      }

      setLoading(false);
    }

    fetchAll();
  }, []);

  // ── Toggle feature flag via API ────────────────────────────────────────

  const toggleFlag = async (key: string) => {
    const flag = flags.find((f) => f.key === key);
    if (!flag) return;

    const newEnabled = !flag.enabled;
    const newPercentage = newEnabled ? 100 : 0;

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) =>
        f.key === key ? { ...f, enabled: newEnabled, percentage: newPercentage } : f
      )
    );

    try {
      await patch(`/admin/settings/feature-flags/${key}`, {
        enabled: newEnabled,
        percentage: newPercentage,
      });
    } catch (error) {
      // Revert on failure
      setFlags((prev) =>
        prev.map((f) =>
          f.key === key ? { ...f, enabled: flag.enabled, percentage: flag.percentage } : f
        )
      );
      console.error('Failed to update feature flag:', error);
    }
  };

  // ── Update rollout percentage via API ──────────────────────────────────

  const updatePercentage = async (key: string, percentage: number) => {
    const flag = flags.find((f) => f.key === key);
    if (!flag) return;

    const previousPercentage = flag.percentage;

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, percentage } : f))
    );

    try {
      await patch(`/admin/settings/feature-flags/${key}`, {
        enabled: flag.enabled,
        percentage,
      });
    } catch (error) {
      // Revert on failure
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, percentage: previousPercentage } : f))
      );
      console.error('Failed to update flag percentage:', error);
    }
  };

  // ── Invite admin via API ───────────────────────────────────────────────

  const handleInviteAdmin = async () => {
    if (!inviteEmail) return;

    try {
      await post('/admin/settings/admins', {
        email: inviteEmail,
        role: inviteRole,
      });

      // Refresh admin list after successful invite
      try {
        const apiAdmins = await get<ApiAdminResponse[]>('/admin/settings/admins');
        setAdminUsers(
          apiAdmins.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            role: a.role,
            lastAccess: a.lastLoginAt,
            avatar: generateAvatar(a.name),
          }))
        );
      } catch {
        // If refresh fails, keep current list — the invite still succeeded
      }

      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('support');
    } catch (error) {
      console.error('Failed to invite admin:', error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parametres</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurez les fonctionnalites, consultez le journal d&apos;audit et gerez les administrateurs
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="feature-flags">
        <TabsList>
          <TabsTrigger value="feature-flags" className="gap-1.5">
            <Flag className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ScrollText className="h-4 w-4" />
            Journal d&apos;audit
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Administrateurs
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Feature Flags ──────────────────────────────────────── */}
        <TabsContent value="feature-flags">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Feature Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {flags.map((flag) => {
                  const Icon = flag.icon;
                  return (
                    <div key={flag.key} className="flex items-start gap-4 py-5 first:pt-0 last:pb-0">
                      <div className="flex-shrink-0 rounded-lg bg-muted/50 p-2.5 text-muted-foreground mt-0.5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-semibold">{flag.label}</h4>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {flag.key}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {flag.description}
                        </p>
                        {flag.enabled && (
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-muted-foreground w-24">Rollout : {flag.percentage}%</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={flag.percentage}
                              onChange={(e) => updatePercentage(flag.key, parseInt(e.target.value))}
                              className="flex-1 h-1.5 accent-primary cursor-pointer max-w-xs"
                            />
                            <span className="text-xs font-medium tabular-nums w-10 text-right">{flag.percentage}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-xs font-medium ${flag.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          {flag.enabled ? 'Active' : 'Desactive'}
                        </span>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={() => toggleFlag(flag.key)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Audit Log ──────────────────────────────────────────── */}
        <TabsContent value="audit">
          <Card className="py-0">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                Journal d&apos;audit
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead className="pr-4">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEntries.map((entry) => {
                  const actionInfo = actionLabels[entry.action] || { label: entry.action, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="pl-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.date), 'dd/MM/yy HH:mm', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{entry.admin}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {entry.target}
                      </TableCell>
                      <TableCell className="pr-4 text-muted-foreground text-xs max-w-[280px] truncate">
                        {entry.details}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Administrators ─────────────────────────────────────── */}
        <TabsContent value="admins">
          <Card className="py-0">
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Administrateurs
              </CardTitle>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Inviter un admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inviter un administrateur</DialogTitle>
                    <DialogDescription>
                      Envoyez une invitation par email pour ajouter un nouvel administrateur.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Adresse email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="admin@afs-app.ch"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrateur</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleInviteAdmin}>
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer l&apos;invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Dernier acces</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((admin) => {
                  const roleInfo = roleLabels[admin.role];
                  return (
                    <TableRow key={admin.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {admin.avatar}
                          </div>
                          <span className="font-medium">{admin.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(admin.lastAccess), 'dd MMM yyyy, HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier le role
                            </DropdownMenuItem>
                            {admin.role !== 'super_admin' && (
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Revoquer l&apos;acces
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
