# GeoAlerta RMR — ProTerra
Sistema inteligente de monitoramento e prevenção de deslizamentos de terra na Região Metropolitana do Recife (RMR).

Sobre o Projeto
O GeoAlerta RMR é o sistema que integra a solução ProTerra, desenvolvida com o objetivo de monitorar condições ambientais, identificar áreas suscetíveis a deslizamentos e auxiliar na tomada de decisões preventivas.

A plataforma combina dados de sensores ambientais, mapas interativos, indicadores de risco e recursos de inteligência artificial para oferecer uma visão integrada das condições monitoradas nos municípios da Região Metropolitana do Recife.

Este repositório corresponde à branch criada para preservar o protótipo original da solução ProTerra, com a versão do site desenvolvida e hospedada por meio do v0. A versão inicial do projeto foi construída com o Lovable.

Protótipo e Links
Solução: ProTerra.
Sistema: GeoAlerta RMR.
Protótipo original: hospedado no v0.
Versão anterior: desenvolvida com o Lovable.
Site da versão anterior: prototipoinova.lovable.app.
Projeto no Lovable: Acessar editor.
Funcionalidades
1. Dashboard
Painel de monitoramento organizado em níveis hierárquicos:

Região Metropolitana.
Município.
Bairro.
Sensor.
Apresenta indicadores de risco, sensores online e offline, alertas ativos, regiões em alerta e previsões para as próximas 24 horas.

2. Mapa Interativo
Visualização geográfica dos municípios, bairros e sensores monitorados, permitindo identificar áreas de risco e acompanhar a distribuição dos dispositivos.

3. Monitoramento de Sensores
O sistema contempla seis tipos de sensores ambientais:

Pluviosidade.
Umidade do solo.
Temperatura.
Vibração.
Inclinação do terreno.
Deslocamento do solo.
Cada sensor possui informações de localização, status, bateria, intensidade do sinal, últimas leituras e histórico de medições.

4. Inteligência Artificial
O módulo IA de Prevenção de Deslizamentos analisa dados ambientais e históricos para calcular um índice de risco entre 0 e 100.

Índice	Classificação
0–25	Baixo
26–50	Moderado
51–75	Alto
76–100	Crítico
A proposta inclui explicações sobre os fatores que influenciam a classificação e estimativas de probabilidade de deslizamento nas próximas 24 horas.

5. Gerenciamento de Alertas
Central de gerenciamento com:

Alertas ativos e encerrados.
Identificação do município e bairro.
Sensores responsáveis.
Nível de risco, data e horário.
Descrição e motivo do alerta.
Visualização geográfica.
Emissão e confirmação de alertas.
Exportação de informações.
6. Histórico e Relatórios
Consulta de registros e medições com filtros por município, bairro, sensor, tipo, período e nível de risco, além da possibilidade de exportar relatórios.

7. Simulação Inteligente
Simulador de sensores com variação coerente dos dados ambientais. A simulação relaciona fatores como chuva, umidade do solo, vibração, inclinação e deslocamento para demonstrar a evolução dos níveis de risco.

8. Interface e Responsividade
Tema escuro.
Design baseado em glassmorphism.
Cards modernos e animações suaves.
Barra lateral recolhível.
Barra de navegação superior fixa.
Botão flutuante para emissão de alertas.
Interface adaptável para desktop, notebook, tablet e celular.
Municípios Monitorados
O GeoAlerta RMR foi planejado para monitorar os seguintes municípios:

Recife.
Olinda.
Paulista.
Jaboatão dos Guararapes.
Camaragibe.
Abreu e Lima.
Igarassu.
São Lourenço da Mata.
Moreno.
Cabo de Santo Agostinho.
Os dashboards devem atualizar automaticamente suas informações conforme os filtros e a região selecionada.

Tecnologias e Arquitetura
A arquitetura proposta contempla:

React: construção da interface.
TypeScript: tipagem e segurança do código.
Componentes reutilizáveis: padronização da interface.
Context API: gerenciamento de estado global.
Hooks personalizados: organização da lógica da aplicação.
Serviços e utilitários: separação de responsabilidades.
Design responsivo: adaptação a diferentes dispositivos.
A estrutura busca facilitar a manutenção, a evolução e futuras integrações com sensores físicos, serviços externos e modelos de inteligência artificial.

Módulos do Sistema
O GeoAlerta RMR está organizado nos seguintes módulos:

Dashboard.
Mapa.
Municípios.
Bairros.
Sensores.
Alertas.
Histórico.
Relatórios.
Inteligência Artificial.
Configurações.
Como Executar o Projeto
Para executar o projeto localmente, é necessário ter o Node.js e o npm instalados.

git clone <url-do-repositorio>
cd <nome-do-projeto>
npm install
npm run dev
Substitua os valores entre < > pelo endereço do repositório e pelo nome da pasta do projeto.

Objetivo da Solução
A ProTerra, por meio do sistema GeoAlerta RMR, busca demonstrar como a integração entre monitoramento ambiental, visualização geográfica e análise inteligente de dados pode contribuir para a identificação preventiva de áreas suscetíveis a deslizamentos.

O projeto possui finalidade acadêmica e demonstrativa, com potencial de evolução para uma solução integrada a sensores reais e sistemas de monitoramento utilizados por órgãos de proteção e Defesa Civil.

Nota: dados simulados e previsões demonstrativas não substituem medições reais, validação técnica ou avaliações oficiais de risco.

Licença
A licença e as condições de utilização do projeto devem ser definidas conforme as necessidades do repositório.
