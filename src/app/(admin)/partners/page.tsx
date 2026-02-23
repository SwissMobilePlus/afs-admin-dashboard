'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { get, post } from '@/lib/api';
import {
  Plus,
  MousePointerClick,
  ArrowRightLeft,
  DollarSign,
  Users,
  Eye,
} from 'lucide-react';

// ── Currency formatter ────────────────────────────────────────────────
const chf = new Intl.NumberFormat('fr-CH', {
  style: 'currency',
  currency: 'CHF',
});

// ── Types ─────────────────────────────────────────────────────────────

/** Frontend partner shape used for display */
interface Partner {
  id: string;
  nom: string;
  categorie: string;
  siteWeb: string;
  clics: number;
  conversions: number;
  revenue: number;
  tauxConversion: number;
  statut: 'Actif' | 'Inactif';
  couleur: string;
  commissionType: string;
  commissionRate: number;
  promoCode: string;
  description: string;
}

/**
 * Shape returned by GET /admin/partners (flat array of these objects).
 * Based on admin-partners.service.ts listPartners().
 */
interface ApiPartner {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  promoCode: string | null;
  promoLabel: string | null;
  bonusOffer: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  order: number;
  active: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    title: string;
    slug: string;
  };
  _count: {
    clicks: number;
    commissions: number;
    payouts: number;
  };
  stats: {
    totalClicks: number;
    conversions: number;
    conversionRate: number;
    totalRevenue: number;
  };
}

// (No mock data — all partner data comes from the API)

// ── Color derivation from partner name ───────────────────────────────
/** Generates a deterministic hex color from a string (partner name). */
function deriveColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Ensure reasonably saturated, not-too-light colors
  const h = ((hash % 360) + 360) % 360;
  const s = 55 + (Math.abs(hash >> 8) % 30); // 55-85%
  const l = 30 + (Math.abs(hash >> 16) % 20); // 30-50%
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// ── Map API partner to frontend Partner ──────────────────────────────
function mapApiPartner(api: ApiPartner): Partner {
  return {
    id: api.id,
    nom: api.name,
    categorie: api.service?.title ?? 'Autre',
    siteWeb: api.websiteUrl ?? '',
    clics: api.stats?.totalClicks ?? 0,
    conversions: api.stats?.conversions ?? 0,
    revenue: api.stats?.totalRevenue ?? 0,
    tauxConversion: api.stats?.conversionRate ?? 0,
    statut: api.active ? 'Actif' : 'Inactif',
    couleur: deriveColor(api.name),
    // Commission info is in the PartnerCommission relation; the list
    // endpoint does not include it, so we show counts or defaults.
    commissionType: api._count?.commissions > 0 ? `${api._count.commissions} rule(s)` : '-',
    commissionRate: 0,
    promoCode: api.promoCode ?? '',
    description: api.description ?? '',
  };
}

// ── Initials helper ───────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Category badge color ──────────────────────────────────────────────
function categoryColor(cat: string) {
  const lower = cat.toLowerCase();
  if (lower.includes('banque') || lower.includes('bank')) return 'bg-blue-100 text-blue-800';
  if (lower.includes('assurance') || lower.includes('insurance')) return 'bg-amber-100 text-amber-800';
  if (lower.includes('investissement') || lower.includes('invest')) return 'bg-purple-100 text-purple-800';
  if (lower.includes('credit') || lower.includes('kredit')) return 'bg-emerald-100 text-emerald-800';
  return 'bg-gray-100 text-gray-800';
}

// ── Main page component ───────────────────────────────────────────────

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCommissionType, setFormCommissionType] = useState('');
  const [formCommissionRate, setFormCommissionRate] = useState('');
  const [formPromoCode, setFormPromoCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formServiceId, setFormServiceId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available services fetched from backend (for the create form)
  const [services, setServices] = useState<{ id: string; title: string; slug: string }[]>([]);

  useEffect(() => {
    async function fetchPartners() {
      try {
        // Backend returns a flat array: ApiPartner[]
        const apiPartners = await get<ApiPartner[]>('/admin/partners');
        if (Array.isArray(apiPartners)) {
          setPartners(apiPartners.map(mapApiPartner));
        }
      } catch {
        // Keep empty state on error
      } finally {
        setLoading(false);
      }
    }

    fetchPartners();
  }, []);

  // Optionally fetch services for the create dialog (best-effort)
  useEffect(() => {
    async function fetchServices() {
      try {
        // Try common endpoint patterns for listing services
        const res = await get<{ id: string; title: string; slug: string }[]>('/services');
        if (Array.isArray(res)) {
          setServices(res);
        }
      } catch {
        // Services list not available; the form will use a text input fallback
      }
    }
    fetchServices();
  }, []);

  // Stats
  const totalPartners = partners.length;
  const totalRevenue = partners.reduce((s, p) => s + p.revenue, 0);
  const totalClics = partners.reduce((s, p) => s + p.clics, 0);
  const avgConversion =
    partners.length > 0
      ? partners.reduce((s, p) => s + p.tauxConversion, 0) / partners.length
      : 0;

  async function handleAddPartner() {
    if (!formName || !formDescription) return;

    setSubmitting(true);

    // Build the payload using backend field names (CreatePartnerDto)
    const backendPayload: {
      serviceId: string;
      name: string;
      description: string;
      websiteUrl?: string;
      promoCode?: string;
      active: boolean;
    } = {
      serviceId: formServiceId || (services.length > 0 ? services[0].id : ''),
      name: formName,
      description: formDescription,
      websiteUrl: formWebsite || undefined,
      promoCode: formPromoCode || undefined,
      active: true,
    };

    // Optimistic local partner for immediate UI update
    const localPartner: Partner = {
      id: String(Date.now()),
      nom: formName,
      siteWeb: formWebsite,
      categorie: formCategory || 'Autre',
      commissionType: formCommissionType || '-',
      commissionRate: parseFloat(formCommissionRate) || 0,
      promoCode: formPromoCode,
      description: formDescription,
      clics: 0,
      conversions: 0,
      revenue: 0,
      tauxConversion: 0,
      statut: 'Actif',
      couleur: deriveColor(formName),
    };

    try {
      const created = await post<ApiPartner>('/admin/partners', backendPayload);
      // If the API returns the created partner, map it properly
      if (created && created.id) {
        const mapped = mapApiPartner(created);
        // Override categorie with form value if the API partner lacks service info
        if (!created.service) {
          mapped.categorie = formCategory || 'Autre';
        }
        setPartners((prev) => [...prev, mapped]);
      } else {
        // API returned something unexpected; use local partner
        setPartners((prev) => [...prev, localPartner]);
      }
    } catch {
      // Add locally on API error
      setPartners((prev) => [...prev, localPartner]);
    }

    setDialogOpen(false);
    resetForm();
    setSubmitting(false);
  }

  function resetForm() {
    setFormName('');
    setFormWebsite('');
    setFormCategory('');
    setFormCommissionType('');
    setFormCommissionRate('');
    setFormPromoCode('');
    setFormDescription('');
    setFormServiceId('');
  }

  const stats = [
    {
      label: 'Total partenaires',
      value: totalPartners,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Revenue total',
      value: chf.format(totalRevenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Clics total',
      value: totalClics.toLocaleString('fr-CH'),
      icon: MousePointerClick,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Taux conversion moyen',
      value: `${avgConversion.toFixed(2)}%`,
      icon: ArrowRightLeft,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Partenaires</h1>
          <p className="text-muted-foreground mt-1">
            Gerez vos partenaires et suivez leurs performances
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un partenaire
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajouter un partenaire</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="partner-name">Nom</Label>
                <Input
                  id="partner-name"
                  placeholder="Nom du partenaire"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-website">URL du site web</Label>
                <Input
                  id="partner-website"
                  placeholder="https://..."
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                />
              </div>

              {/* Service selection — required by backend */}
              <div className="grid gap-2">
                <Label>Service</Label>
                {services.length > 0 ? (
                  <Select value={formServiceId} onValueChange={setFormServiceId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((svc) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          {svc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="ID du service"
                    value={formServiceId}
                    onChange={(e) => setFormServiceId(e.target.value)}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Categorie</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banque">Banque</SelectItem>
                      <SelectItem value="Assurance">Assurance</SelectItem>
                      <SelectItem value="Investissement">Investissement</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Type de commission</Label>
                  <Select value={formCommissionType} onValueChange={setFormCommissionType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPA">CPA</SelectItem>
                      <SelectItem value="CPL">CPL</SelectItem>
                      <SelectItem value="Revenue Share">Revenue Share</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="partner-rate">Taux de commission (%)</Label>
                  <Input
                    id="partner-rate"
                    type="number"
                    placeholder="Ex: 25"
                    value={formCommissionRate}
                    onChange={(e) => setFormCommissionRate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partner-promo">Code promo</Label>
                  <Input
                    id="partner-promo"
                    placeholder="Ex: AFS-XXX"
                    value={formPromoCode}
                    onChange={(e) => setFormPromoCode(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-desc">Description</Label>
                <Input
                  id="partner-desc"
                  placeholder="Description du partenariat"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddPartner} disabled={submitting}>
                {submitting ? 'Ajout...' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partner cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {partners.map((partner) => (
          <Card key={partner.id} className="transition-shadow hover:shadow-md">
            <CardContent className="pt-0">
              {/* Partner header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: partner.couleur }}
                  >
                    {getInitials(partner.nom)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{partner.nom}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor(
                        partner.categorie,
                      )}`}
                    >
                      {partner.categorie}
                    </span>
                  </div>
                </div>
                <Badge variant={partner.statut === 'Actif' ? 'default' : 'secondary'}>
                  {partner.statut}
                </Badge>
              </div>

              {/* Metrics */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Clics</div>
                  <div className="text-sm font-semibold">
                    {partner.clics.toLocaleString('fr-CH')}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Conversions</div>
                  <div className="text-sm font-semibold">
                    {partner.conversions.toLocaleString('fr-CH')}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="text-sm font-semibold">{chf.format(partner.revenue)}</div>
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Taux conversion</div>
                  <div className="text-sm font-semibold">{partner.tauxConversion}%</div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4">
                <Link href={`/partners/${partner.id}`}>
                  <Button variant="outline" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    Voir details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
