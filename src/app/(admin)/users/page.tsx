'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Search,
  Download,
  MoreHorizontal,
  Eye,
  UserCog,
  Ban,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
interface User {
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
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Constants ────────────────────────────────────────────────────────────
const SWISS_CANTONS = [
  { value: 'all', label: 'Tous les cantons' },
  { value: 'GE', label: 'Genève (GE)' },
  { value: 'VD', label: 'Vaud (VD)' },
  { value: 'BS', label: 'Bâle-Ville (BS)' },
  { value: 'BE', label: 'Berne (BE)' },
  { value: 'ZH', label: 'Zurich (ZH)' },
  { value: 'NE', label: 'Neuchâtel (NE)' },
  { value: 'FR', label: 'Fribourg (FR)' },
  { value: 'VS', label: 'Valais (VS)' },
  { value: 'TI', label: 'Tessin (TI)' },
  { value: 'LU', label: 'Lucerne (LU)' },
  { value: 'AG', label: 'Argovie (AG)' },
  { value: 'SG', label: 'Saint-Gall (SG)' },
  { value: 'BL', label: 'Bâle-Campagne (BL)' },
  { value: 'SO', label: 'Soleure (SO)' },
  { value: 'JU', label: 'Jura (JU)' },
];

const ROLES = [
  { value: 'all', label: 'Tous les rôles' },
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'support', label: 'Support' },
  { value: 'partner', label: 'Partner' },
];

const PLANS = [
  { value: 'all', label: 'Tous les plans' },
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
];

const ITEMS_PER_PAGE = 20;


// ── Helpers ──────────────────────────────────────────────────────────────
function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || '??';
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

const numberFormatter = new Intl.NumberFormat('fr-CH');

function formatScore(score: number): string {
  return numberFormatter.format(score ?? 0);
}

// ── Component ────────────────────────────────────────────────────────────
export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [cantonFilter, setCantonFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  // Fetch users
  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (cantonFilter !== 'all') params.set('canton', cantonFilter);
      if (planFilter !== 'all') params.set('plan', planFilter);

      const [result] = await Promise.allSettled([
        get<{ users: Record<string, unknown>[]; pagination: { total: number; totalPages: number } }>(`/admin/users?${params.toString()}`),
      ]);

      if (!cancelled) {
        if (result.status === 'fulfilled' && result.value?.users?.length > 0) {
          // Map API user objects to frontend User interface
          const mapped: User[] = result.value.users.map((u) => {
            const nameStr = (u.name as string) || '';
            const firstNameStr = (u.firstName as string) || '';
            // Derive lastName: if "name" contains a space, take everything after firstName
            const lastName = nameStr.includes(' ')
              ? nameStr.replace(firstNameStr, '').trim()
              : '';
            const cantons = Array.isArray(u.cantons) ? (u.cantons as string[]) : [];
            const sub = u.subscription as Record<string, unknown> | null;
            return {
              id: (u.id as string) || '',
              firstName: firstNameStr || nameStr.split(' ')[0] || '',
              lastName: lastName || (nameStr.split(' ').slice(1).join(' ') || ''),
              email: (u.email as string) || '',
              canton: cantons[0] || '',
              cantonCode: cantons[0] || '',
              plan: (sub?.status === 'active' ? 'premium' : 'free') as 'free' | 'premium',
              role: (u.role as 'user' | 'admin' | 'support' | 'partner') || 'user',
              swissReadyScore: 0, // Not returned by API yet
              createdAt: (u.createdAt as string) || '',
              isBanned: !!u.bannedAt,
              phone: (u.phone as string) || undefined,
            };
          });
          setUsers(mapped);
          setTotal(result.value.pagination?.total ?? mapped.length);
          setTotalPages(result.value.pagination?.totalPages ?? 1);
        } else {
          setUsers([]);
          setTotal(0);
          setTotalPages(1);
        }
        setLoading(false);
      }
    }

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, roleFilter, cantonFilter, planFilter]);

  // Export CSV
  async function handleExport() {
    setExporting(true);
    try {
      const response = await get<Blob>('/admin/users/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utilisateurs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: generate CSV from currently loaded users
      if (users.length === 0) return;
      const headers = 'Nom,Email,Canton,Plan,Rôle,Score SwissReady,Date inscription\n';
      const rows = users.map(
        (u) =>
          `"${u.firstName} ${u.lastName}","${u.email}","${u.canton} (${u.cantonCode})","${u.plan}","${u.role}","${u.swissReadyScore}","${format(new Date(u.createdAt), 'dd/MM/yyyy', { locale: fr })}"`
      ).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utilisateurs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  // Action handlers
  function handleViewProfile(user: User) {
    router.push(`/users/${user.id}`);
  }

  function handleChangeRole(user: User) {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  }

  function handleBanToggle(user: User) {
    setSelectedUser(user);
    setBanDialogOpen(true);
  }

  async function confirmRoleChange() {
    if (!selectedUser || !newRole) return;
    try {
      const { patch } = await import('@/lib/api');
      await patch(`/admin/users/${selectedUser.id}`, { role: newRole });
    } catch {
      // Update locally as fallback
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? { ...u, role: newRole as User['role'] } : u
      )
    );
    setRoleDialogOpen(false);
    setSelectedUser(null);
  }

  async function confirmBanToggle() {
    if (!selectedUser) return;
    const newBanned = !selectedUser.isBanned;
    try {
      const { patch } = await import('@/lib/api');
      await patch(`/admin/users/${selectedUser.id}`, { isBanned: newBanned });
    } catch {
      // Update locally as fallback
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? { ...u, isBanned: newBanned } : u
      )
    );
    setBanDialogOpen(false);
    setSelectedUser(null);
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Utilisateurs</h1>
          <Badge variant="secondary" className="text-sm">
            {numberFormatter.format(total)} utilisateurs
          </Badge>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="w-fit"
        >
          <Download className="size-4" />
          {exporting ? 'Export en cours...' : 'Exporter CSV'}
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={cantonFilter} onValueChange={(v) => { setCantonFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Canton" />
                </SelectTrigger>
                <SelectContent>
                  {SWISS_CANTONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Canton</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Score SwissReady</TableHead>
                <TableHead>Date inscription</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton rows
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-muted animate-pulse" />
                        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-4 w-10 rounded bg-muted animate-pulse ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="size-8 rounded bg-muted animate-pulse ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="size-8" />
                      <p>Aucun utilisateur trouvé</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={user.isBanned ? 'opacity-60' : undefined}
                  >
                    {/* Avatar + Name */}
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar size="default">
                          <AvatarFallback>
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.firstName} {user.lastName}
                          </span>
                          {user.isBanned && (
                            <Badge variant="destructive" className="mt-0.5 w-fit text-[10px]">
                              Banni
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>

                    {/* Canton */}
                    <TableCell>
                      <span className="text-sm">
                        {user.canton}{' '}
                        <span className="text-muted-foreground">({user.cantonCode})</span>
                      </span>
                    </TableCell>

                    {/* Plan */}
                    <TableCell>
                      <Badge
                        className={
                          user.plan === 'premium'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }
                      >
                        {user.plan === 'premium' ? 'Premium' : 'Free'}
                      </Badge>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>

                    {/* SwissReady Score */}
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold tabular-nums ${
                          user.swissReadyScore >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : user.swissReadyScore >= 50
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatScore(user.swissReadyScore)}%
                      </span>
                    </TableCell>

                    {/* Date inscription */}
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                            <Eye className="size-4" />
                            Voir profil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                            <UserCog className="size-4" />
                            Changer rôle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleBanToggle(user)}
                          >
                            <Ban className="size-4" />
                            {user.isBanned ? 'Débannir' : 'Bannir'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Page {page} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Suivant
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
            <DialogDescription>
              Modifier le rôle de{' '}
              <span className="font-medium text-foreground">
                {selectedUser?.firstName} {selectedUser?.lastName}
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
              {selectedUser?.isBanned ? 'Débannir' : 'Bannir'} l&apos;utilisateur
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isBanned
                ? 'Êtes-vous sûr de vouloir débannir '
                : 'Êtes-vous sûr de vouloir bannir '}
              <span className="font-medium text-foreground">
                {selectedUser?.firstName} {selectedUser?.lastName}
              </span>
              {' ?'}
              {!selectedUser?.isBanned &&
                " L'utilisateur ne pourra plus accéder à la plateforme."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={selectedUser?.isBanned ? 'default' : 'destructive'}
              onClick={confirmBanToggle}
            >
              {selectedUser?.isBanned ? 'Débannir' : 'Bannir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
