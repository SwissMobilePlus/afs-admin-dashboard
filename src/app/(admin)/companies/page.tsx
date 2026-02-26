'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Mail,
  Globe,
  Search,
  RefreshCw,
  Loader2,
  MapPin,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { get, post } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────

interface CompanyStats {
  totalCompanies: number;
  withEmail: number;
  withWebsite: number;
  totalContacts: number;
  emailCoverage: number;
  byCanton: { canton: string; count: number }[];
  bySource: { source: string; count: number }[];
}

interface CompanyContact {
  email: string;
  source: string;
  confidence: number;
  verified: boolean;
}

interface Company {
  id: string;
  name: string;
  canton: string | null;
  city: string | null;
  domain: string | null;
  website: string | null;
  industry: string | null;
  source: string;
  legalForm: string | null;
  contacts: CompanyContact[];
  jobCount: number;
  contactCount: number;
  createdAt: string;
}

interface CompaniesResponse {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
}

const FRONTALIER_CANTONS = ['GE', 'VD', 'VS', 'NE', 'JU', 'BS', 'BL', 'TI'];

// ── Page Component ───────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [canton, setCanton] = useState('');
  const [hasEmail, setHasEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const limit = 20;

  const fetchStats = useCallback(async () => {
    try {
      const data = await get<CompanyStats>('/admin/companies/stats');
      if (data) setStats(data);
    } catch { /* ignore */ }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (canton) params.set('canton', canton);
      if (hasEmail) params.set('hasEmail', hasEmail);

      const data = await get<CompaniesResponse>(`/admin/companies?${params}`);
      if (data) {
        setCompanies(data.companies);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
  }, [page, search, canton, hasEmail]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchCompanies()]).then(() => setIsLoading(false));
  }, [fetchStats, fetchCompanies]);

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      await post('/admin/companies/scrape?frontalierOnly=true');
    } catch { /* ignore */ }
    setTimeout(() => setIsScraping(false), 3000);
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      await post('/admin/companies/enrich-emails?scrapeWebsites=true');
    } catch { /* ignore */ }
    setTimeout(() => setIsEnriching(false), 3000);
  };

  const handleSearch = () => {
    setPage(1);
    fetchCompanies();
  };

  const totalPages = Math.ceil(total / limit);

  const sourceLabel = (s: string) => {
    const labels: Record<string, string> = {
      zefix: 'Zefix',
      localch: 'Local.ch',
      scraped: 'Site web',
      pattern: 'Pattern',
      manual: 'Manuel',
      adzuna: 'Adzuna',
    };
    return labels[s] || s;
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
    if (c >= 0.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entreprises</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Base de donnees des entreprises suisses et contacts
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="py-5">
              <CardContent>
                <div className="h-16 rounded-md bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="py-5">
          <CardContent>
            <div className="h-[400px] rounded-md bg-muted/50 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entreprises</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Base de donnees des entreprises suisses et contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleEnrich} disabled={isEnriching}>
            {isEnriching ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enrichissement...</>
            ) : (
              <><Mail className="mr-2 h-4 w-4" />Enrichir emails</>
            )}
          </Button>
          <Button onClick={handleScrape} disabled={isScraping}>
            {isScraping ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scraping...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Scraper Zefix + Local.ch</>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="py-5">
            <CardContent className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">Total entreprises</span>
                <span className="text-2xl font-bold">{stats.totalCompanies.toLocaleString('fr-CH')}</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-muted-foreground">
                <Building2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="py-5">
            <CardContent className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">Avec email</span>
                <span className="text-2xl font-bold">{stats.withEmail.toLocaleString('fr-CH')}</span>
                <span className="text-xs text-muted-foreground">{stats.emailCoverage}% de couverture</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-muted-foreground">
                <Mail className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="py-5">
            <CardContent className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">Avec site web</span>
                <span className="text-2xl font-bold">{stats.withWebsite.toLocaleString('fr-CH')}</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-muted-foreground">
                <Globe className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="py-5">
            <CardContent className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">Total contacts</span>
                <span className="text-2xl font-bold">{stats.totalContacts.toLocaleString('fr-CH')}</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-muted-foreground">
                <MapPin className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Canton breakdown */}
      {stats && stats.byCanton.length > 0 && (
        <Card className="py-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Repartition par canton
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.byCanton.map((c) => (
                <Badge
                  key={c.canton}
                  variant="outline"
                  className={`cursor-pointer ${canton === c.canton ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => {
                    setCanton(canton === c.canton ? '' : c.canton);
                    setPage(1);
                  }}
                >
                  {c.canton}: {c.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher entreprise, domaine, ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={hasEmail} onValueChange={(v) => { setHasEmail(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Email" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="true">Avec email</SelectItem>
            <SelectItem value="false">Sans email</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" />
          Rechercher
        </Button>
      </div>

      {/* Companies Table */}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Entreprise</TableHead>
              <TableHead>Canton</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="pl-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{company.name}</span>
                    {company.city && (
                      <span className="text-xs text-muted-foreground">{company.city}</span>
                    )}
                    {company.domain && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">{company.domain}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {company.canton && (
                    <Badge variant="outline" className={FRONTALIER_CANTONS.includes(company.canton) ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' : ''}>
                      {company.canton}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {company.contacts.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {company.contacts.map((ct, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="text-xs font-mono">{ct.email}</span>
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${confidenceColor(ct.confidence)}`}>
                            {Math.round(ct.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                      {company.contactCount > company.contacts.length && (
                        <span className="text-xs text-muted-foreground">
                          +{company.contactCount - company.contacts.length} autre(s)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aucun contact</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {sourceLabel(company.source)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex items-center justify-end gap-1">
                    {company.website && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(company.website!.startsWith('http') ? company.website! : `https://${company.website}`, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await post(`/admin/companies/${company.id}/scrape-website`);
                          fetchCompanies();
                        } catch { /* ignore */ }
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Aucune entreprise trouvee
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {total.toLocaleString('fr-CH')} entreprise(s) — Page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
