# ProTerra — GeoAlerta RMR

**Sistema inteligente de monitoramento e prevenção de deslizamentos de terra na Região Metropolitana do Recife (RMR).**

## Sobre o Projeto

A **ProTerra** é a solução proposta para o monitoramento ambiental e a prevenção de deslizamentos de terra. Seu sistema, denominado **GeoAlerta RMR**, tem como objetivo integrar dados de sensores ambientais, mapas interativos e recursos de inteligência artificial para auxiliar na identificação de áreas de risco e na tomada de decisões preventivas.

O sistema foi planejado para monitorar municípios da Região Metropolitana do Recife, permitindo acompanhar indicadores ambientais, visualizar sensores, identificar situações de risco e gerenciar alertas em uma única plataforma.

Este repositório corresponde à branch criada para preservar o **protótipo original da solução ProTerra**, com a versão do site hospedada no **v0**. A versão inicial do projeto foi desenvolvida utilizando o Lovable.

## Protótipo e Links

- **Solução:** ProTerra
- **Sistema:** GeoAlerta RMR
- **Protótipo original:** hospedado no v0
- **Site da versão anterior:** Acessar protótipo no Lovable
- **Projeto no Lovable:** Acessar editor

## Funcionalidades

### 1\. Dashboard

Painel de monitoramento organizado em quatro níveis:

- Região Metropolitana
- Município
- Bairro
- Sensor

Apresenta indicadores de risco, sensores online e offline, alertas ativos, regiões em alerta e previsões para as próximas 24 horas.

Os filtros permitem selecionar município, bairro, período e tipo de sensor, atualizando as informações exibidas conforme os critérios selecionados.

### 2\. Mapa Interativo

Mapa geográfico para visualização dos municípios, bairros e sensores monitorados.

Principais recursos:

- Navegação entre municípios e bairros.
- Aproximação automática ao selecionar uma região.
- Visualização dos sensores instalados.
- Identificação dos níveis de risco por cores.
- Acompanhamento geográfico das áreas monitoradas.

### 3\. Monitoramento de Sensores

O sistema contempla seis tipos de sensores ambientais:

- Sensor de pluviosidade.
- Sensor de umidade do solo.
- Sensor de temperatura.
- Sensor de vibração.
- Sensor de inclinação do terreno.
- Sensor de deslocamento do solo.

Cada sensor possui informações sobre status operacional, localização geográfica, bateria, intensidade do sinal, última leitura e histórico de medições.

A plataforma também prevê gráficos para análise dos dados nas últimas 24 horas, nos últimos 7 dias e nos últimos 30 dias.

### 4\. Inteligência Artificial

O módulo **IA de Prevenção de Deslizamentos** foi concebido para analisar dados ambientais e históricos, calcular um índice de risco entre 0 e 100 e auxiliar na identificação de possíveis situações críticas.

A classificação de risco proposta é:

| Índice de risco | Classificação |
| --- | --- |
| 0 a 25 | Baixo |
| 26 a 50 | Moderado |
| 51 a 75 | Alto |
| 76 a 100 | Crítico |

A análise considera fatores como pluviosidade, umidade do solo, temperatura, vibração, inclinação do terreno, deslocamento do solo, tendências e alertas anteriores.

O módulo também prevê explicações sobre os fatores que contribuíram para o risco e estimativas para as próximas 24 horas.

### 5\. Gerenciamento de Alertas

Módulo dedicado à criação, visualização e consulta de alertas.

Principais recursos:

- Listagem de alertas ativos e encerrados.
- Identificação do município e bairro.
- Identificação dos sensores responsáveis.
- Classificação do nível de risco.
- Registro de data, horário e motivo.
- Visualização da localização do alerta no mapa.
- Emissão e confirmação de alertas.
- Filtros e exportação de informações.

A proposta inclui a abertura automática de alertas em situações de risco crítico detectadas pelo sistema.

### 6\. Histórico e Relatórios

O sistema prevê consultas históricas com filtros por:

- Município.
- Bairro.
- Sensor.
- Tipo de sensor.
- Período.
- Nível de risco.

Também contempla a exportação de relatórios para facilitar a análise dos registros e o acompanhamento das ocorrências.

### 7\. Simulação Inteligente de Sensores

O simulador foi planejado para reproduzir variações coerentes entre os dados ambientais.

Por exemplo, o aumento da pluviosidade pode elevar a umidade do solo e, em determinadas condições simuladas, contribuir para alterações na inclinação e no deslocamento do terreno.

A elevação dos níveis de vibração e deslocamento também pode influenciar o índice de risco calculado pelo sistema.

### 8\. Interface e Responsividade

A interface foi concebida para oferecer uma experiência moderna, intuitiva e adequada a diferentes dispositivos.

Características visuais:

- Tema escuro.
- Design inspirado em glassmorphism.
- Cards com indicadores de monitoramento.
- Animações suaves.
- Barra lateral recolhível.
- Barra de navegação superior fixa.
- Botão flutuante para emissão de alertas.
- Layout responsivo para desktop, notebook, tablet e celular.

## Municípios Monitorados

O sistema foi planejado para abranger os seguintes municípios da Região Metropolitana do Recife:

1. Recife.
2. Olinda.
3. Paulista.
4. Jaboatão dos Guararapes.
5. Camaragibe.
6. Abreu e Lima.
7. Igarassu.
8. São Lourenço da Mata.
9. Moreno.
10. Cabo de Santo Agostinho.

A navegação por município e bairro permite visualizar informações específicas de cada região, conforme os dados disponíveis.

## Módulos do Sistema

O GeoAlerta RMR está organizado nos seguintes módulos:

1. Dashboard.
2. Mapa.
3. Municípios.
4. Bairros.
5. Sensores.
6. Alertas.
7. Histórico.
8. Relatórios.
9. Inteligência Artificial.
10. Configurações.

## Tecnologias e Arquitetura

A arquitetura planejada para o projeto contempla:

- **React:** desenvolvimento da interface.
- **TypeScript:** tipagem estática e maior segurança no código.
- **Componentes reutilizáveis:** padronização e manutenção da interface.
- **Context API:** gerenciamento de estado global.
- **Hooks personalizados:** organização da lógica da aplicação.
- **Serviços e utilitários:** separação de responsabilidades.
- **Design responsivo:** adaptação a diferentes tamanhos de tela.

A organização do código busca facilitar a manutenção, a escalabilidade e futuras integrações com sensores físicos, serviços externos e modelos de inteligência artificial.

## Como Executar o Projeto

### Pré-requisitos

Antes de iniciar, instale:

- [Node.js](<https://nodejs.org/>)
- npm, incluído na instalação do Node.js
- Git

### Instalação

Clone o repositório e acesse a pasta do projeto:

```
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_PROJETO>
```

Instale as dependências:

```
npm install
```

Inicie o servidor de desenvolvimento:

```
npm run dev
```

Após iniciar o servidor, acesse o endereço local informado no terminal.

> **Observação:** substitua `<URL_DO_REPOSITORIO>` pelo endereço real do repositório Git e `<NOME_DO_PROJETO>` pelo nome da pasta criada durante a clonagem.

## Objetivo da Solução

A **ProTerra**, por meio do sistema **GeoAlerta RMR**, busca demonstrar como a integração entre monitoramento ambiental, visualização geográfica e análise inteligente de dados pode contribuir para a prevenção de deslizamentos de terra.

A proposta é oferecer uma plataforma de apoio ao monitoramento de áreas suscetíveis a riscos, com potencial de utilização em projetos acadêmicos, demonstrações tecnológicas e futuras iniciativas voltadas à proteção e à Defesa Civil.

## Considerações Importantes

Este projeto possui finalidade acadêmica e demonstrativa. A utilização de dados simulados e estimativas produzidas por modelos computacionais não substitui medições reais, validações técnicas ou avaliações oficiais de risco.

A integração com sensores físicos, serviços externos e sistemas operacionais de alerta depende das implementações e validações necessárias.

## Licença

A licença de utilização e distribuição do projeto deverá ser definida pelos responsáveis pelo repositório.

---

**ProTerra — GeoAlerta RMR**\
_Tecnologia e inteligência aplicadas ao monitoramento ambiental e à prevenção de deslizamentos._

Para publicar no GitHub: salve esse conteúdo no arquivo `README.md`, localizado na raiz do repositório. Os títulos, as listas, as tabelas e os links serão renderizados automaticamente pelo GitHub.

Importante: como você informou que o protótipo original está no v0, deixei essa referência na descrição, mas sem inventar um endereço para ele. Quando tiver o link público do v0, vale adicioná-lo à seção “Protótipo e Links”.
