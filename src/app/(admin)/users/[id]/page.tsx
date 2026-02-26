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
  Star,
  Award,
  Download,
  Globe,
  Languages,
  GraduationCap,
  Shield,
  Clock,
  Eye,
  Loader2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { get, patch } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────

interface CvInfo {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  parsedText?: string;
  analysis?: {
    score?: number;
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    missingElements?: string[];
    keywords?: string[];
    swissReadiness?: string;
    equivalences?: { diplome_fr: string; equivalent_ch: string; reconnaissance: string; note: string }[];
  };
  createdAt: string;
  updatedAt: string;
}

interface CvArchive {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  archivedAt: string;
  version: number;
}

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  createdAt: string;
}

interface ApplicationItem {
  id: string;
  status: string;
  sentAt?: string;
  createdAt: string;
  sentFrom?: string;
  job: {
    id: string;
    title: string;
    company: string;
    displayLocation?: string;
  };
}

interface Subscription {
  plan: string;
  status: string;
  store: string;
  currentPeriodEnd?: string;
}

interface ApplicationStats {
  total: number;
  byStatus: Record<string, number>;
}

interface UserFull {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  phone?: string;
  civility?: string;
  role: string;
  targetCountry: string;
  occupation?: string;
  seniority?: string;
  contractType?: string;
  remotePrefs?: string;
  cantons: string[];
  regions: string[];
  languages?: { lang: string; level: string }[];
  skills: string[];
  hasLocalPhone: boolean;
  hasLocalBank: boolean;
  permitType?: string;
  swissReadyScore?: number;
  onboardingComplete: boolean;
  bannedAt?: string;
  banReason?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  cv?: CvInfo;
  cvArchives: CvArchive[];
  subscription?: Subscription;
  emailAccounts: EmailAccount[];
  applications: ApplicationItem[];
  applicationStats: ApplicationStats;
  _count: {
    applications: number;
    notifications: number;
    supportConversations: number;
    userJobStates: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getInitials(name?: string, firstName?: string): string {
  const f = (firstName || name || '?').charAt(0);
  const l = (name || '').split(' ').pop()?.charAt(0) || '';
  return `${f}${l}`.toUpperCase();
}

function getRoleLabel(role: string): string {
  const map: Record<string, string> = { user: 'Utilisateur', support: 'Support', admin: 'Admin', super_admin: 'Super Admin' };
  return map[role] || role;
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (role === 'super_admin' || role === 'admin') return 'default';
  if (role === 'support') return 'secondary';
  return 'outline';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-700', delivered: 'bg-emerald-100 text-emerald-700',
    opened: 'bg-purple-100 text-purple-700', replied: 'bg-green-100 text-green-800',
    interview: 'bg-teal-100 text-teal-700', failed: 'bg-red-100 text-red-700',
    queued: 'bg-gray-100 text-gray-600', needs_review: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: 'En attente', sent: 'Envoyee', delivered: 'Delivree', opened: 'Ouverte',
    replied: 'Repondue', interview: 'Entretien', failed: 'Echouee',
    needs_review: 'A verifier', rejected: 'Refusee',
  };
  return labels[status] || status;
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://afs-api-production.up.railway.app';
const apiBase = rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

const nf = new Intl.NumberFormat('fr-CH');

// ── Component ────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profil' | 'candidatures' | 'cv' | 'config'>('profil');

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchUser() {
      setLoading(true);
      try {
        const data = await get<UserFull>(`/admin/users/${userId}`);
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUser();
    return () => { cancelled = true; };
  }, [userId]);

  async function confirmRoleChange() {
    if (!user || !newRole) return;
    try {
      await patch(`/admin/users/${user.id}`, { role: newRole });
      setUser((prev) => prev ? { ...prev, role: newRole } : prev);
    } catch { /* ignore */ }
    setRoleDialogOpen(false);
  }

  async function confirmBanToggle() {
    if (!user) return;
    const shouldBan = !user.bannedAt;
    try {
      await patch(`/admin/users/${user.id}`, { ban: shouldBan, ...(shouldBan ? { banReason: 'Banni par admin' } : {}) });
      setUser((prev) => prev ? { ...prev, bannedAt: shouldBan ? new Date().toISOString() : undefined, banReason: shouldBan ? 'Banni par admin' : undefined } : prev);
    } catch { /* ignore */ }
    setBanDialogOpen(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Chargement du profil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Utilisateur non trouve</p>
        <Button variant="outline" onClick={() => router.push('/users')}><ArrowLeft className="size-4" /> Retour</Button>
      </div>
    );
  }

  const isBanned = !!user.bannedAt;
  const hasCv = !!user.cv;
  const analysis = user.cv?.analysis;
  const score = user.swissReadyScore ?? analysis?.score ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/users')}>
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <h1 className="text-xl font-bold tracking-tight">{user.firstName || user.name || user.email}</h1>
        {isBanned && <Badge variant="destructive">Banni</Badge>}
        {user.deletedAt && <Badge variant="outline">Supprime</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ═══ LEFT ═══ */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              <Avatar className="size-20 text-2xl">
                <AvatarFallback className="text-xl">{getInitials(user.name, user.firstName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-1 text-center">
                <h2 className="text-lg font-semibold">
                  {user.civility && <span className="text-muted-foreground font-normal">{user.civility} </span>}
                  {user.firstName} {user.name}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="size-3" /> {user.phone}</p>}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleLabel(user.role)}</Badge>
                <Badge className={user.subscription?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                  {user.subscription?.status === 'active' ? `Premium ${user.subscription.plan}` : 'Free'}
                </Badge>
                {user.onboardingComplete && <Badge variant="outline">Onboarding OK</Badge>}
              </div>
              <div className="w-full space-y-2 border-t pt-4 text-sm">
                <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /> {user.cantons.length > 0 ? user.cantons.join(', ') : 'Aucun canton'}</div>
                <div className="flex items-center gap-2"><Globe className="size-4 text-muted-foreground" /> {user.targetCountry}</div>
                <div className="flex items-center gap-2"><Calendar className="size-4 text-muted-foreground" /> Inscrit {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: fr })}</div>
                {user.lastActiveAt && <div className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" /> Actif {formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true, locale: fr })}</div>}
                {user.permitType && <div className="flex items-center gap-2"><Shield className="size-4 text-muted-foreground" /> Permis {user.permitType}</div>}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Target className="size-3.5" /><span className="text-[11px] font-medium uppercase">Score</span></div><p className={`text-xl font-bold tabular-nums ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{score}%</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Send className="size-3.5" /><span className="text-[11px] font-medium uppercase">Candidatures</span></div><p className="text-xl font-bold tabular-nums">{nf.format(user.applicationStats.total)}</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Bell className="size-3.5" /><span className="text-[11px] font-medium uppercase">Notifs</span></div><p className="text-xl font-bold tabular-nums">{user._count?.notifications ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Star className="size-3.5" /><span className="text-[11px] font-medium uppercase">Sauvegardes</span></div><p className="text-xl font-bold tabular-nums">{user._count?.userJobStates ?? 0}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Actions admin</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setNewRole(user.role); setRoleDialogOpen(true); }}><UserCog className="size-4" /> Changer le role</Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setNotifDialogOpen(true)}><Bell className="size-4" /> Envoyer une notification</Button>
              <Button variant={isBanned ? 'outline' : 'destructive'} size="sm" className="w-full justify-start" onClick={() => setBanDialogOpen(true)}><Ban className="size-4" /> {isBanned ? 'Debannir' : 'Bannir'}</Button>
            </CardContent>
          </Card>
        </div>

        {/* ═══ RIGHT ═══ */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex gap-1 border-b">
            {(['profil', 'candidatures', 'cv', 'config'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {tab === 'profil' && 'Profil complet'}
                {tab === 'candidatures' && `Candidatures (${user.applicationStats.total})`}
                {tab === 'cv' && `CV${user.cvArchives.length > 0 ? ` (${user.cvArchives.length})` : ''}`}
                {tab === 'config' && 'Config'}
              </button>
            ))}
          </div>

          {/* TAB: Profil */}
          {activeTab === 'profil' && (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Briefcase className="size-4" /> Profil professionnel</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Metier recherche</span><p className="font-medium">{user.occupation || '—'}</p></div>
                    <div><span className="text-muted-foreground">Seniorite</span><p className="font-medium">{user.seniority || '—'}</p></div>
                    <div><span className="text-muted-foreground">Type de contrat</span><p className="font-medium">{user.contractType || '—'}</p></div>
                    <div><span className="text-muted-foreground">Teletravail</span><p className="font-medium">{user.remotePrefs || '—'}</p></div>
                    <div><span className="text-muted-foreground">Permis</span><p className="font-medium">{user.permitType || '—'}</p></div>
                    <div><span className="text-muted-foreground">Pays cible</span><p className="font-medium">{user.targetCountry}</p></div>
                  </div>
                </CardContent>
              </Card>
              {user.skills.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="size-4" /> Competences</CardTitle></CardHeader>
                  <CardContent><div className="flex flex-wrap gap-2">{user.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div></CardContent>
                </Card>
              )}
              {Array.isArray(user.languages) && user.languages.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Languages className="size-4" /> Langues</CardTitle></CardHeader>
                  <CardContent><div className="flex flex-wrap gap-3">{user.languages.map((l, i) => <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5"><span className="font-medium text-sm">{l.lang}</span><Badge variant="outline" className="text-xs">{l.level}</Badge></div>)}</div></CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MapPin className="size-4" /> Zones ciblees</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Cantons</span><div className="flex flex-wrap gap-1 mt-1">{user.cantons.length > 0 ? user.cantons.map((c) => <Badge key={c} variant="outline">{c}</Badge>) : <span className="text-muted-foreground">—</span>}</div></div>
                    <div><span className="text-muted-foreground">Regions FR</span><div className="flex flex-wrap gap-1 mt-1">{user.regions.length > 0 ? user.regions.map((r) => <Badge key={r} variant="outline">{r}</Badge>) : <span className="text-muted-foreground">—</span>}</div></div>
                  </div>
                </CardContent>
              </Card>
              {user.applicationStats.total > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="size-4" /> Stats candidatures</CardTitle></CardHeader>
                  <CardContent><div className="flex flex-wrap gap-2">{Object.entries(user.applicationStats.byStatus).map(([status, count]) => <div key={status} className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(status)}`}>{getStatusLabel(status)}: {count}</div>)}</div></CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB: Candidatures */}
          {activeTab === 'candidatures' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dernieres candidatures</CardTitle>
                <CardDescription>{user.applicationStats.total} candidatures au total</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {user.applications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground"><Send className="size-8" /><p className="text-sm">Aucune candidature</p></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Poste</TableHead>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="pl-4 font-medium max-w-[200px] truncate">{app.job.title}</TableCell>
                          <TableCell>{app.job.company}</TableCell>
                          <TableCell><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(app.status)}`}>{getStatusLabel(app.status)}</span></TableCell>
                          <TableCell className="text-muted-foreground text-xs">{format(new Date(app.sentAt || app.createdAt), 'dd/MM/yy HH:mm', { locale: fr })}</TableCell>
                          <TableCell className="text-muted-foreground text-xs truncate max-w-[150px]">{app.sentFrom || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB: CV */}
          {activeTab === 'cv' && (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="size-4" /> CV actuel</CardTitle></CardHeader>
                <CardContent>
                  {hasCv ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="size-8 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{user.cv!.filename}</p>
                            <p className="text-xs text-muted-foreground">{formatBytes(user.cv!.sizeBytes)} — mis a jour {formatDistanceToNow(new Date(user.cv!.updatedAt), { addSuffix: true, locale: fr })}</p>
                          </div>
                        </div>
                        <a href={`${apiBase}/admin/users/${user.id}/cv/download`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline"><Download className="size-4" /> Telecharger</Button>
                        </a>
                      </div>
                      {analysis && (
                        <div className="space-y-3">
                          {analysis.summary && <p className="text-sm text-muted-foreground italic">{analysis.summary}</p>}
                          {analysis.strengths && analysis.strengths.length > 0 && (
                            <div><p className="text-xs font-medium text-muted-foreground mb-1">Points forts</p><ul className="text-sm space-y-1">{analysis.strengths.map((s, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" /> {s}</li>)}</ul></div>
                          )}
                          {analysis.improvements && analysis.improvements.length > 0 && (
                            <div><p className="text-xs font-medium text-muted-foreground mb-1">Ameliorations</p><ul className="text-sm space-y-1">{analysis.improvements.map((s, i) => <li key={i} className="flex items-start gap-2"><Target className="size-3.5 text-amber-500 mt-0.5 shrink-0" /> {s}</li>)}</ul></div>
                          )}
                          {analysis.equivalences && analysis.equivalences.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Equivalences diplomes</p>
                              <Table>
                                <TableHeader><TableRow><TableHead className="text-xs">Diplome FR</TableHead><TableHead className="text-xs">Equivalent CH</TableHead><TableHead className="text-xs">Statut</TableHead></TableRow></TableHeader>
                                <TableBody>{analysis.equivalences.map((eq, i) => <TableRow key={i}><TableCell className="text-xs">{eq.diplome_fr}</TableCell><TableCell className="text-xs">{eq.equivalent_ch}</TableCell><TableCell><Badge variant={eq.reconnaissance === 'reconnue' ? 'default' : eq.reconnaissance === 'partielle' ? 'secondary' : 'outline'} className="text-[10px]">{eq.reconnaissance}</Badge></TableCell></TableRow>)}</TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground"><FileText className="size-8" /><p className="text-sm">Aucun CV uploade</p></div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="size-4" /> Historique des CVs (copies admin)</CardTitle>
                  <CardDescription>Chaque version uploadee est archivee et jamais supprimee</CardDescription>
                </CardHeader>
                <CardContent>
                  {user.cvArchives.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Aucune archive</p>
                  ) : (
                    <div className="space-y-2">
                      {user.cvArchives.map((archive) => (
                        <div key={archive.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">v{archive.version}</div>
                            <div>
                              <p className="text-sm font-medium">{archive.filename}</p>
                              <p className="text-xs text-muted-foreground">{formatBytes(archive.sizeBytes)} — {format(new Date(archive.archivedAt), 'dd MMM yyyy HH:mm', { locale: fr })}</p>
                            </div>
                          </div>
                          <a href={`${apiBase}/admin/users/${user.id}/cv/archive/${archive.id}/download`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost"><Download className="size-4" /></Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB: Config */}
          {activeTab === 'config' && (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Award className="size-4" /> Abonnement</CardTitle></CardHeader>
                <CardContent>
                  {user.subscription ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Plan</span><p className="font-medium">{user.subscription.plan}</p></div>
                      <div><span className="text-muted-foreground">Statut</span><p className="font-medium">{user.subscription.status}</p></div>
                      <div><span className="text-muted-foreground">Store</span><p className="font-medium">{user.subscription.store}</p></div>
                      <div><span className="text-muted-foreground">Expire</span><p className="font-medium">{user.subscription.currentPeriodEnd ? format(new Date(user.subscription.currentPeriodEnd), 'dd MMM yyyy', { locale: fr }) : '—'}</p></div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Pas d&apos;abonnement actif (plan Free)</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Mail className="size-4" /> Comptes email connectes</CardTitle></CardHeader>
                <CardContent>
                  {user.emailAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun compte email connecte</p>
                  ) : (
                    <div className="space-y-2">
                      {user.emailAccounts.map((acc) => (
                        <div key={acc.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                          <Mail className="size-4 text-muted-foreground" />
                          <div><p className="text-sm font-medium">{acc.email}</p><p className="text-xs text-muted-foreground">{acc.provider} — connecte {formatDistanceToNow(new Date(acc.createdAt), { addSuffix: true, locale: fr })}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="size-4" /> Swiss Readiness</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Telephone local</span><p className="font-medium">{user.hasLocalPhone ? 'Oui' : 'Non'}</p></div>
                    <div><span className="text-muted-foreground">Compte bancaire local</span><p className="font-medium">{user.hasLocalBank ? 'Oui' : 'Non'}</p></div>
                    <div><span className="text-muted-foreground">Onboarding termine</span><p className="font-medium">{user.onboardingComplete ? 'Oui' : 'Non'}</p></div>
                    <div><span className="text-muted-foreground">Score Swiss Ready</span><p className="font-medium">{score}%</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Eye className="size-4" /> Metadonnees</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">ID</span><p className="font-mono text-xs">{user.id}</p></div>
                    <div><span className="text-muted-foreground">Cree le</span><p>{format(new Date(user.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</p></div>
                    <div><span className="text-muted-foreground">Mis a jour</span><p>{format(new Date(user.updatedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</p></div>
                    <div><span className="text-muted-foreground">Derniere activite</span><p>{user.lastActiveAt ? format(new Date(user.lastActiveAt), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}</p></div>
                    {user.bannedAt && (
                      <><div><span className="text-muted-foreground">Banni le</span><p className="text-red-600">{format(new Date(user.bannedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</p></div><div><span className="text-muted-foreground">Raison du ban</span><p className="text-red-600">{user.banReason || '—'}</p></div></>
                    )}
                    {user.deletedAt && <div><span className="text-muted-foreground">Supprime le</span><p className="text-red-600">{format(new Date(user.deletedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</p></div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Changer le role</DialogTitle><DialogDescription>Modifier le role de {user.firstName || user.name}</DialogDescription></DialogHeader>
          <Select value={newRole} onValueChange={setNewRole}><SelectTrigger><SelectValue placeholder="Selectionner un role" /></SelectTrigger><SelectContent><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="support">Support</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="super_admin">Super Admin</SelectItem></SelectContent></Select>
          <DialogFooter><Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Annuler</Button><Button onClick={confirmRoleChange}>Confirmer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isBanned ? 'Debannir' : 'Bannir'} l&apos;utilisateur</DialogTitle><DialogDescription>{isBanned ? 'Reactiver le compte de ' : 'Suspendre le compte de '}<span className="font-medium text-foreground">{user.firstName || user.name}</span> ?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setBanDialogOpen(false)}>Annuler</Button><Button variant={isBanned ? 'default' : 'destructive'} onClick={confirmBanToggle}>{isBanned ? 'Debannir' : 'Bannir'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Envoyer une notification</DialogTitle><DialogDescription>Envoyer un push a {user.firstName || user.name}</DialogDescription></DialogHeader>
          <textarea className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none resize-none" placeholder="Tapez votre message ici..." />
          <DialogFooter><Button variant="outline" onClick={() => setNotifDialogOpen(false)}>Annuler</Button><Button onClick={() => setNotifDialogOpen(false)}><Send className="size-4" /> Envoyer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
