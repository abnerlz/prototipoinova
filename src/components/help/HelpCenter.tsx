import { useState, type FormEvent } from "react";
import { HelpCircle, Send, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Message = { from: "bot" | "user"; text: string };
const FAQS = [
  { keys: ["sensor", "offline", "dado", "leitura"], answer: "Na aba Sensores você vê o estado e o histórico. ONLINE indica leitura recente; OFFLINE indica que o último dado está desatualizado. Confira alimentação, Wi‑Fi e envio ao Firebase." },
  { keys: ["alerta", "risco", "defesa civil"], answer: "A Central de alertas mostra registros e níveis calculados pelo protótipo. Um índice alto não é um alerta oficial da Defesa Civil nem substitui avaliação técnica." },
  { keys: ["mapa", "bairro", "região", "regiao"], answer: "Use Mapa e Localidades para explorar as áreas. Filtros de município, bairro, sensor e período ajudam a restringir os dados exibidos." },
  { keys: ["operador", "administrador", "admin", "acesso", "conta"], answer: "Contas operacionais são criadas por um administrador. É necessário confirmar o e-mail; operadores podem validar leituras e registrar inspeções. Só administradores gerenciam contas." },
  { keys: ["simulação", "simulacao", "falso", "real"], answer: "O modo de simulação usa valores fictícios para demonstrar o painel. Para avaliar sensores físicos, confira se o modo real está ativo e observe a conexão e o horário da última leitura." },
  { keys: ["firebase", "banco", "conexão", "conexao"], answer: "O painel lê as medições do Firebase Realtime Database. Se aparecer erro, verifique as variáveis Firebase da Vercel, regras do banco e se o dispositivo consegue gravar novas leituras." },
];

function answerQuestion(question: string) {
  const normalized = question.toLocaleLowerCase("pt-BR");
  const match = FAQS.find((item) => item.keys.some((key) => normalized.includes(key)));
  return match?.answer ?? "Ainda não encontrei uma resposta para isso. Tente perguntar sobre sensores, alertas, mapa, acesso, simulação ou Firebase. Para problemas técnicos, fale com a equipe ProTerra.";
}

export function HelpCenter() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: "Olá! Posso ajudar com sensores, alertas, mapa, contas e dados do Firebase. O que você gostaria de saber?" }]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    setMessages((current) => [...current, { from: "user", text: question }, { from: "bot", text: answerQuestion(question) }]);
    setInput("");
  }

  return <>
    <Button className="fixed bottom-5 right-5 z-40 h-12 rounded-full px-4 shadow-lg" onClick={() => setOpen(true)} aria-label="Abrir central de ajuda">
      <HelpCircle className="h-5 w-5" /><span className="hidden sm:inline">Ajuda</span>
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-strong fixed bottom-4 right-4 left-auto top-auto max-h-[min(78dvh,44rem)] w-[calc(100vw-2rem)] max-w-md translate-x-0 translate-y-0 overflow-hidden p-0 sm:bottom-6 sm:right-6">
        <DialogHeader className="border-b p-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> Central de ajuda</DialogTitle>
          <DialogDescription>Assistente local com respostas sobre o uso do ProTerra.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[48dvh] space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.map((message, index) => <p key={index} className={`max-w-[90%] whitespace-pre-wrap break-words rounded-xl p-3 text-sm ${message.from === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{message.text}</p>)}
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t p-3">
          <Input aria-label="Pergunte à central de ajuda" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Digite sua dúvida…" maxLength={300} />
          <Button type="submit" size="icon" aria-label="Enviar pergunta" disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
