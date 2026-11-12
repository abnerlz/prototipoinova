import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Accessibility,
  ClipboardCheck,
  BrainCircuit,
  Cpu,
  FileBarChart,
  History,
  LayoutDashboard,
  Map as MapIcon,
  Building2,
  Radio,
  ShieldAlert,
  Siren,
  UserCog,
  Info,
} from "lucide-react";

import { EmitAlertButton } from "@/components/alerts/EmitAlertButton";
import { OperatorAccess } from "@/components/auth/OperatorAccess";
import { HelpCenter } from "@/components/help/HelpCenter";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useMonitoring } from "@/context/MonitoringContext";
import { useHydrated } from "@/hooks/use-hydrated";
import { RISK_LABEL } from "@/lib/ai";
import { cn } from "@/lib/utils";

const NAV = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Mapa", url: "/mapa", icon: MapIcon },
  { title: "Localidades", url: "/localidades", icon: Building2 },
  { title: "Sensores", url: "/sensores", icon: Cpu },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle },
  { title: "Ocorrências", url: "/ocorrencias", icon: Siren },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
  { title: "Central de Inteligência", url: "/central-inteligencia", icon: BrainCircuit },
  { title: "Apoio à Decisão", url: "/apoio-decisao", icon: ShieldAlert },
  { title: "Acessibilidade", url: "/acessibilidade", icon: Accessibility },
  { title: "Sobre nós", url: "/sobre", icon: Info },

] as const;

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isOperator, isAdmin } = useMonitoring();
  const navItems = [
    ...NAV,
    ...(isOperator ? [{ title: "Operação", url: "/operacao", icon: ClipboardCheck }] : []),
    ...(isAdmin ? [{ title: "Administração", url: "/administracao", icon: UserCog }] : []),
  ];

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarContent className="pt-3">
        <div className="mb-3 flex items-center justify-center px-3 group-data-[collapsible=icon]:px-1">
          <img
            src="/proterra-logo.jpeg"
            alt="ProTerra"
            className="h-auto w-full max-w-[168px] rounded-md group-data-[collapsible=icon]:hidden"
          />
          <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary group-data-[collapsible=icon]:grid">
            <Radio className="h-5 w-5" />
          </span>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Monitoramento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function TopBar() {
  const { sensors, alerts, riskFor, live, lastTick, mode, databaseConnection } = useMonitoring();
  const hydrated = useHydrated();
  const global = riskFor();
  const online = sensors.filter((s) => s.status === "online").length;
  const active = alerts.filter((a) => a.status === "ativo").length;

  return (
    <header className="glass sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-border/60 px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-0">
      <SidebarTrigger className="shrink-0" />
      <div className="min-w-0">
        <p className="font-display truncate text-xs font-semibold sm:text-sm">
          Monitoramento Inteligente de Deslizamentos · RMR
        </p>
        <p className="hidden text-[11px] text-muted-foreground sm:block">
          Última sincronização {hydrated ? new Date(lastTick).toLocaleTimeString("pt-BR") : "—"}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="hidden gap-1.5 border-border/70 md:inline-flex">
          <span
            className={cn(
              "relative h-1.5 w-1.5 rounded-full",
              live ? "bg-risk-low pulse-dot text-risk-low" : "bg-muted-foreground",
            )}
          />
          {mode === "simulacao" ? "Simulação" : databaseConnection === "conectado" ? "Banco conectado" : databaseConnection === "sem_dados" ? "Banco sem dados" : databaseConnection === "erro" ? "Erro no banco" : "Conectando ao banco"}
        </Badge>
        <Badge variant="outline" className="hidden border-border/70 sm:inline-flex">
          {online}/{sensors.length} sensores
        </Badge>
        <Badge variant="outline" className="hidden border-border/70 lg:inline-flex">
          {active} alertas ativos
        </Badge>
        <Badge variant="outline" className="max-w-[7.5rem] truncate border-primary/40 px-1.5 text-[10px] sm:max-w-none sm:px-2 sm:text-xs">
          Risco {RISK_LABEL[global.level]} · {global.score}
        </Badge>
        <OperatorAccess />
      </div>
    </header>
  );
}

function OperationalNotifications() {
  const { mode, databaseConnection, databaseError, sensors, lastRealUpdate } = useMonitoring();
  const previousConnection = useRef<typeof databaseConnection | null>(null);
  const wasStale = useRef(false);
  const showedPrototypeNotice = useRef(false);

  useEffect(() => {
    if (mode === "simulacao") {
      toast.warning("Modo de simulação", {
        id: "simulation-mode",
        description: "Os valores exibidos são fictícios e não representam medições reais.",
        duration: 9000,
      });
    } else {
      toast.dismiss("simulation-mode");
    }
  }, [mode]);

  useEffect(() => {
    const previous = previousConnection.current;
    previousConnection.current = databaseConnection;
    if (mode !== "real") return;

    if (databaseConnection === "erro") {
      toast.error("Falha ao conectar ao banco", {
        id: "database-status",
        description: databaseError ?? "Verifique a conexão e as regras do Firebase Realtime Database.",
        duration: 12_000,
      });
    } else if (databaseConnection === "sem_dados") {
      toast.warning("Banco conectado, sem leituras", {
        id: "database-status",
        description: "Ainda não há dados do sensor para mostrar.",
        duration: 10_000,
      });
    } else if (databaseConnection === "conectado" && previous && previous !== "conectado") {
      toast.success("Banco conectado", {
        id: "database-status",
        description: "A comunicação com o Firebase foi restabelecida.",
        duration: 6000,
      });
    } else if (databaseConnection === "conectando") {
      toast.dismiss("database-status");
    }
  }, [mode, databaseConnection, databaseError]);

  useEffect(() => {
    if (mode !== "real" || databaseConnection !== "conectado") return;
    const stale = sensors.length > 0 && sensors.every((sensor) => sensor.status === "offline");

    if (stale && !wasStale.current) {
      toast.error("Leitura do sensor desatualizada", {
        id: "sensor-stale",
        description: `O banco responde, mas o sensor não envia dados recentes${lastRealUpdate ? `; última leitura: ${new Date(lastRealUpdate).toLocaleString("pt-BR")}` : ""}. Não trate os dados como monitoramento ao vivo.`,
        duration: 14_000,
      });
    } else if (!stale && wasStale.current) {
      toast.dismiss("sensor-stale");
    }
    wasStale.current = stale;
  }, [mode, databaseConnection, sensors, lastRealUpdate]);

  useEffect(() => {
    if (mode !== "real" || showedPrototypeNotice.current) return;
    showedPrototypeNotice.current = true;
    toast.info("Aviso sobre o protótipo", {
      id: "prototype-coverage",
      description: "Há uma unidade configurada no Ibura; as demais áreas não têm cobertura real. O índice é experimental e não substitui avaliação técnica ou decisão da Defesa Civil.",
      duration: 15_000,
    });
  }, [mode]);

  return null;
}

/** Shell da aplicação: sidebar recolhível, navbar fixa e botão de alerta global. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <OperationalNotifications />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 space-y-4 p-3 pb-24 sm:p-5"
          >
            {children}
          </motion.main>
        </div>
      </div>
      <EmitAlertButton />
      <HelpCenter />
    </SidebarProvider>
  );
}
