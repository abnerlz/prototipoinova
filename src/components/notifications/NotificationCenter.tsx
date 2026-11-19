import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Bell, CheckCheck, CircleAlert, Database, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMonitoring } from "@/context/MonitoringContext";
import { RISK_LABEL } from "@/lib/ai";
import { cn } from "@/lib/utils";

const READ_NOTIFICATIONS_KEY = "proterra:read-notifications:v1";
const RECENT_ALERT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type NotificationTone = "danger" | "warning" | "info";

interface SystemNotification {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  href: "/alertas" | "/sensores" | "/historico" | "/sobre" | "/";
  tone: NotificationTone;
}

function readStoredIds(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(READ_NOTIFICATIONS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function getAge(timestamp: number): string {
  return formatDistanceToNow(timestamp, { addSuffix: true, locale: ptBR });
}

function ToneIcon({ tone }: { tone: NotificationTone }) {
  if (tone === "danger") return <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  if (tone === "warning") return <CircleAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />;
  return <Info className="h-4 w-4 text-primary" aria-hidden="true" />;
}

/** Central acessível para consultar alertas recentes e o estado do sistema. */
export function NotificationCenter() {
  const { alerts, mode, databaseConnection, databaseError, sensors, lastRealUpdate, timeline } = useMonitoring();
  const [readIds, setReadIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setReadIds(readStoredIds());
  }, []);

  const notifications = useMemo<SystemNotification[]>(() => {
    const now = Date.now();
    const items: SystemNotification[] = [];

    if (mode === "simulacao") {
      items.push({
        id: "system:simulation-mode",
        title: "Modo de simulação ativo",
        description: "Os valores são fictícios e não representam medições reais.",
        createdAt: now,
        href: "/",
        tone: "warning",
      });
    } else {
      if (databaseConnection === "erro") {
        items.push({
          id: "system:database-error",
          title: "Falha na conexão com o Firebase",
          description: databaseError ?? "Confira a conexão e as regras do Realtime Database.",
          createdAt: lastRealUpdate ?? now,
          href: "/sensores",
          tone: "danger",
        });
      } else if (databaseConnection === "sem_dados") {
        items.push({
          id: "system:database-empty",
          title: "Banco conectado, sem leituras",
          description: "Ainda não há leituras do sensor para exibir.",
          createdAt: now,
          href: "/sensores",
          tone: "warning",
        });
      } else if (databaseConnection === "conectando") {
        items.push({
          id: "system:database-connecting",
          title: "Conectando ao Firebase",
          description: "O painel está aguardando a resposta do banco de dados.",
          createdAt: now,
          href: "/sensores",
          tone: "info",
        });
      }

      const offlineCount = sensors.filter((sensor) => sensor.status === "offline").length;
      if (databaseConnection === "conectado" && offlineCount > 0) {
        items.push({
          id: `system:sensors-offline:${offlineCount}`,
          title: offlineCount === 1 ? "Sensor sem leitura recente" : "Sensores sem leitura recente",
          description: `${offlineCount} ${offlineCount === 1 ? "sensor aparece" : "sensores aparecem"} offline. Confira alimentação, Wi-Fi e horário da última leitura.`,
          createdAt: lastRealUpdate ?? now,
          href: "/sensores",
          tone: "warning",
        });
      }

      items.push({
        id: "system:prototype-limits",
        title: "Limites do protótipo",
        description: "Os indicadores são experimentais e não substituem avaliação técnica nem alertas oficiais da Defesa Civil.",
        createdAt: lastRealUpdate ?? now,
        href: "/sobre",
        tone: "info",
      });
    }

    alerts
      .filter((alert) => alert.status === "ativo" || now - alert.createdAt <= RECENT_ALERT_WINDOW_MS)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12)
      .forEach((alert) => {
        items.push({
          id: `alert:${alert.id}`,
          title: `Alerta ${RISK_LABEL[alert.level].toLocaleLowerCase("pt-BR")}${alert.status === "encerrado" ? " encerrado" : " ativo"}`,
          description: alert.description,
          createdAt: alert.createdAt,
          href: "/alertas",
          tone: alert.level === "critico" || alert.level === "alto" ? "danger" : "warning",
        });
      });

    timeline
      .filter((event) => now - event.timestamp <= RECENT_ALERT_WINDOW_MS)
      .slice(0, 20)
      .forEach((event) => {
        items.push({
          id: `event:${event.id}`,
          title: mode === "simulacao" ? "Evento da simulação" : "Mudança detectada no monitoramento",
          description: event.message,
          createdAt: event.timestamp,
          href: "/historico",
          tone: event.level === "critico" || event.level === "alto" ? "danger" : "warning",
        });
      });

    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [alerts, databaseConnection, databaseError, lastRealUpdate, mode, sensors, timeline]);

  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  const markRead = (id: string) => {
    setReadIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id].slice(-200);
      window.localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const markAllRead = () => {
    const next = [...new Set([...readIds, ...notifications.map((item) => item.id)])].slice(-200);
    window.localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(next));
    setReadIds(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
          title="Notificações"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-1.5rem)] max-w-[23rem] overflow-hidden p-0 sm:w-96"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 p-4">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold">Notificações</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Alertas e avisos de funcionamento do ProTerra
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 -mt-1 h-8 shrink-0 px-2 text-xs"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Marcar lidas
          </Button>
        </div>

        <div className="max-h-[min(65vh,28rem)] overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
                <Database className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Tudo em ordem</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Não há avisos de sistema nem alertas recentes.
              </p>
            </div>
          ) : (
            <ul aria-label="Lista de notificações" className="divide-y divide-border/60">
              {notifications.map((item) => {
                const isUnread = !readIds.includes(item.id);
                return (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      onClick={() => {
                        markRead(item.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isUnread && "bg-primary/[0.035]",
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        <ToneIcon tone={item.tone} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-5">{item.title}</span>
                          {isUnread && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </span>
                        <span className="mt-1.5 block text-[11px] text-muted-foreground/80">
                          {getAge(item.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border/70 p-2">
          <Link
            to="/alertas"
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver central de alertas
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
