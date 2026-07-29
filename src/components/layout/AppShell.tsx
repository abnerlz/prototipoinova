import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BrainCircuit,
  Cpu,
  FileBarChart,
  History,
  LayoutDashboard,
  Map as MapIcon,
  Building2,
  Home,
  Settings,
  Radio,
} from "lucide-react";

import { EmitAlertButton } from "@/components/alerts/EmitAlertButton";
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
import { RISK_LABEL } from "@/lib/ai";
import { cn } from "@/lib/utils";

const NAV = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Mapa", url: "/mapa", icon: MapIcon },
  { title: "Municípios", url: "/municipios", icon: Building2 },
  { title: "Bairros", url: "/bairros", icon: Home },
  { title: "Sensores", url: "/sensores", icon: Cpu },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
  { title: "Inteligência Artificial", url: "/ia", icon: BrainCircuit },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarContent className="pt-3">
        <div className="mb-2 flex items-center gap-2 px-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Radio className="h-5 w-5" />
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="font-display truncate text-sm font-bold leading-tight">GeoAlerta RMR</p>
            <p className="truncate text-[11px] text-muted-foreground">Centro de Operações</p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Monitoramento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
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
  const { sensors, alerts, riskFor, live, lastTick } = useMonitoring();
  const global = riskFor();
  const online = sensors.filter((s) => s.status === "online").length;
  const active = alerts.filter((a) => a.status === "ativo").length;

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 px-3">
      <SidebarTrigger className="shrink-0" />
      <div className="min-w-0">
        <p className="font-display truncate text-sm font-semibold">
          Monitoramento Inteligente de Deslizamentos · RMR
        </p>
        <p className="hidden text-[11px] text-muted-foreground sm:block">
          Última sincronização {new Date(lastTick).toLocaleTimeString("pt-BR")}
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
          {live ? "Tempo real" : "Pausado"}
        </Badge>
        <Badge variant="outline" className="hidden border-border/70 sm:inline-flex">
          {online}/{sensors.length} sensores
        </Badge>
        <Badge variant="outline" className="hidden border-border/70 lg:inline-flex">
          {active} alertas ativos
        </Badge>
        <Badge variant="outline" className="border-primary/40 text-primary">
          Risco {RISK_LABEL[global.level]} · {global.score}
        </Badge>
      </div>
    </header>
  );
}

/** Shell da aplicação: sidebar recolhível, navbar fixa e botão de alerta global. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
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
    </SidebarProvider>
  );
}
