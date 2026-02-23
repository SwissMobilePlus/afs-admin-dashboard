'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  Send,
  Save,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { get } from '@/lib/api';

// ── Canton & audience constants ──────────────────────────────────────────

const cantons = [
  'Geneve', 'Vaud', 'Bale', 'Zurich', 'Berne', 'Lucerne',
  'Valais', 'Fribourg', 'Neuchatel', 'Tessin', 'Argovie', 'Soleure',
];

const cantonLabels: Record<string, string> = {
  Geneve: 'Geneve',
  Vaud: 'Vaud',
  Bale: 'Bale',
  Zurich: 'Zurich',
  Berne: 'Berne',
  Lucerne: 'Lucerne',
  Valais: 'Valais',
  Fribourg: 'Fribourg',
  Neuchatel: 'Neuchatel',
  Tessin: 'Tessin',
  Argovie: 'Argovie',
  Soleure: 'Soleure',
};

// ── Component ────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<string>('push');
  const [selectedCantons, setSelectedCantons] = useState<string[]>([]);
  const [plan, setPlan] = useState('all');
  const [seniority, setSeniority] = useState('all');
  const [schedule, setSchedule] = useState<'now' | 'later'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [audienceEstimate, setAudienceEstimate] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleCanton = (canton: string) => {
    setSelectedCantons((prev) =>
      prev.includes(canton) ? prev.filter((c) => c !== canton) : [...prev, canton]
    );
  };

  // Fetch audience estimation from API
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCantons.length > 0) params.set('cantons', selectedCantons.join(','));
        if (plan !== 'all') params.set('plan', plan);
        if (seniority === 'lt7') params.set('maxDaysOld', '7');
        if (seniority === 'lt30') params.set('maxDaysOld', '30');
        if (seniority === 'gt30') params.set('minDaysOld', '30');
        const res = await get<{ count: number }>(`/admin/campaigns/estimate-audience?${params.toString()}`);
        setAudienceEstimate(res.count);
      } catch {
        setAudienceEstimate(null);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selectedCantons, plan, seniority]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/marketing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle Campagne</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Creez et envoyez une campagne marketing ciblee
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form — 2 columns */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Title & Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenu de la campagne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  placeholder="Ex : Nouvelles offres d'emploi disponibles"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  placeholder="Redigez le contenu de votre campagne..."
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type de campagne</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-violet-600" />
                        Push notification
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="in-app">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        Message in-app
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Audience filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Filtres d&apos;audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Cantons */}
              <div className="space-y-2">
                <Label>Canton</Label>
                <div className="flex flex-wrap gap-2">
                  {cantons.map((canton) => (
                    <button
                      key={canton}
                      type="button"
                      onClick={() => toggleCanton(canton)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selectedCantons.includes(canton)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {cantonLabels[canton]}
                    </button>
                  ))}
                </div>
                {selectedCantons.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucune selection = tous les cantons</p>
                )}
              </div>

              <Separator />

              {/* Plan */}
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="free">Free seulement</SelectItem>
                    <SelectItem value="premium">Premium seulement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seniority */}
              <div className="space-y-2">
                <Label>Anciennete</Label>
                <Select value={seniority} onValueChange={setSeniority}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="lt7">&lt; 7 jours</SelectItem>
                    <SelectItem value="lt30">&lt; 30 jours</SelectItem>
                    <SelectItem value="gt30">&gt; 30 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Audience estimation */}
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Estimation audience</p>
                  <p className="text-xs text-muted-foreground">Basee sur les filtres selectionnes</p>
                </div>
                <Badge variant="secondary" className="ml-auto text-sm px-3 py-1">
                  {audienceEstimate != null
                    ? `~${audienceEstimate.toLocaleString('fr-CH')} utilisateurs`
                    : '—'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Planification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSchedule('now')}
                  className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                    schedule === 'now'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span className="text-sm font-medium">Envoyer maintenant</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    La campagne sera envoyee immediatement
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSchedule('later')}
                  className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                    schedule === 'later'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Programmer</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choisissez une date et heure d&apos;envoi
                  </p>
                </button>
              </div>

              {schedule === 'later' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline">
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder brouillon
            </Button>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              {schedule === 'now' ? 'Envoyer' : 'Programmer'}
            </Button>
          </div>
        </div>

        {/* Preview panel — 1 column */}
        <div className="flex flex-col gap-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Apercu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Phone frame */}
              <div className="mx-auto w-[260px] rounded-[2rem] border-4 border-gray-800 bg-gray-900 p-2 dark:border-gray-600">
                <div className="rounded-[1.5rem] bg-white dark:bg-gray-950 overflow-hidden">
                  {/* Status bar mockup */}
                  <div className="flex items-center justify-between px-4 py-2 text-[10px] text-gray-500">
                    <span>9:41</span>
                    <div className="flex gap-1">
                      <div className="h-2 w-3 rounded-sm bg-gray-400" />
                      <div className="h-2 w-2 rounded-sm bg-gray-400" />
                    </div>
                  </div>

                  {/* Notification preview */}
                  <div className="px-3 pb-4">
                    {type === 'push' && (
                      <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[8px] font-bold text-primary-foreground">
                            AF
                          </div>
                          <span className="text-[10px] font-semibold text-gray-900 dark:text-gray-100">AFS</span>
                          <span className="text-[9px] text-gray-500 ml-auto">maintenant</span>
                        </div>
                        <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                          {title || 'Titre de la notification'}
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">
                          {content || 'Le contenu de votre message apparaitra ici...'}
                        </p>
                      </div>
                    )}

                    {type === 'email' && (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                              AF
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100">AFS App</p>
                              <p className="text-[8px] text-gray-500">noreply@afs-app.ch</p>
                            </div>
                          </div>
                          <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100">
                            {title || 'Objet de l\'email'}
                          </p>
                          <Separator className="my-2" />
                          <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-snug">
                            {content || 'Le contenu de votre email apparaitra ici...'}
                          </p>
                        </div>
                      </div>
                    )}

                    {type === 'in-app' && (
                      <div className="space-y-2">
                        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-semibold text-primary">Nouveau message</span>
                          </div>
                          <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                            {title || 'Titre du message'}
                          </p>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-3 leading-snug">
                            {content || 'Le contenu de votre message in-app apparaitra ici...'}
                          </p>
                          <button className="mt-2 w-full rounded-lg bg-primary py-1 text-[10px] font-medium text-primary-foreground">
                            Voir plus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-3">
                Apercu {type === 'push' ? 'Push notification' : type === 'email' ? 'Email' : 'Message in-app'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
