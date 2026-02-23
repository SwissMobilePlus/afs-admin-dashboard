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

// ── Mock data ─────────────────────────────────────────────────────────

const mockPartners: Partner[] = [
  {
    id: '1',
    nom: 'CA next bank',
    categorie: 'Banque',
    siteWeb: 'https://www.ca-nextbank.ch',
    clics: 3420,
    conversions: 187,
    revenue: 4675,
    tauxConversion: 5.47,
    statut: 'Actif',
    couleur: '#006a4e',
    commissionType: 'CPA',
    commissionRate: 25,
    promoCode: 'AFS-CA25',
    description: 'Partenaire bancaire principal pour les comptes courants et cartes de crédit.',
  },
  {
    id: '2',
    nom: 'UBS KeyClub',
    categorie: 'Banque',
    siteWeb: 'https://www.ubs.com',
    clics: 2890,
    conversions: 156,
    revenue: 3120,
    tauxConversion: 5.4,
    statut: 'Actif',
    couleur: '#e60000',
    commissionType: 'CPL',
    commissionRate: 20,
    promoCode: 'AFS-UBS20',
    description: 'Programme de fidélité UBS avec commissions sur les leads qualifiés.',
  },
  {
    id: '3',
    nom: 'Alpian',
    categorie: 'Banque',
    siteWeb: 'https://www.alpian.com',
    clics: 1560,
    conversions: 89,
    revenue: 2670,
    tauxConversion: 5.71,
    statut: 'Actif',
    couleur: '#1a237e',
    commissionType: 'Revenue Share',
    commissionRate: 15,
    promoCode: 'AFS-ALP15',
    description: 'Banque digitale suisse avec gestion de patrimoine personnalisée.',
  },
  {
    id: '4',
    nom: 'Yuh',
    categorie: 'Banque',
    siteWeb: 'https://www.yuh.com',
    clics: 4210,
    conversions: 234,
    revenue: 5850,
    tauxConversion: 5.56,
    statut: 'Actif',
    couleur: '#ff6600',
    commissionType: 'CPA',
    commissionRate: 25,
    promoCode: 'AFS-YUH25',
    description: 'Application bancaire mobile suisse - investissement et paiement.',
  },
  {
    id: '5',
    nom: 'Baloise Assurance',
    categorie: 'Assurance',
    siteWeb: 'https://www.baloise.ch',
    clics: 980,
    conversions: 45,
    revenue: 1350,
    tauxConversion: 4.59,
    statut: 'Actif',
    couleur: '#004990',
    commissionType: 'CPL',
    commissionRate: 30,
    promoCode: 'AFS-BAL30',
    description: 'Solutions d\'assurance vie et non-vie pour particuliers.',
  },
  {
    id: '6',
    nom: 'CSS Santé',
    categorie: 'Assurance',
    siteWeb: 'https://www.css.ch',
    clics: 1230,
    conversions: 67,
    revenue: 2010,
    tauxConversion: 5.45,
    statut: 'Inactif',
    couleur: '#00a651',
    commissionType: 'Revenue Share',
    commissionRate: 12,
    promoCode: 'AFS-CSS12',
    description: 'Assurance maladie et complémentaires santé.',
  },
];

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
  switch (cat) {
    case 'Banque':
      return 'bg-blue-100 text-blue-800';
    case 'Assurance':
      return 'bg-amber-100 text-amber-800';
    case 'Investissement':
      return 'bg-purple-100 text-purple-800';
    case 'Crédit':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ── Main page component ───────────────────────────────────────────────

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>(mockPartners);
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const res = await get<{ data: Partner[] }>('/admin/partners');
        if (res?.data) {
          setPartners(res.data);
        }
      } catch {
        // Keep mock data
      } finally {
        setLoading(false);
      }
    }

    fetchPartners();
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
    if (!formName || !formCategory || !formCommissionType || !formCommissionRate) return;

    setSubmitting(true);
    const newPartner: Partner = {
      id: String(Date.now()),
      nom: formName,
      siteWeb: formWebsite,
      categorie: formCategory,
      commissionType: formCommissionType,
      commissionRate: parseFloat(formCommissionRate),
      promoCode: formPromoCode,
      description: formDescription,
      clics: 0,
      conversions: 0,
      revenue: 0,
      tauxConversion: 0,
      statut: 'Actif',
      couleur: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    };

    try {
      await post('/admin/partners', newPartner);
    } catch {
      // Add locally on API error
    }

    setPartners((prev) => [...prev, newPartner]);
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
            Gérez vos partenaires et suivez leurs performances
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Catégorie</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banque">Banque</SelectItem>
                      <SelectItem value="Assurance">Assurance</SelectItem>
                      <SelectItem value="Investissement">Investissement</SelectItem>
                      <SelectItem value="Crédit">Crédit</SelectItem>
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
                    Voir détails
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
