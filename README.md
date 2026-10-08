# Sentinel System


Estrutura do Sistema

Criar as seguintes páginas:

Dashboard

Mapa

Municípios

Bairros

Sensores

Alertas

Histórico

Relatórios

Inteligência Artificial

Configurações

Dashboard

Não utilizar apenas gráficos gerais.

O Dashboard deverá funcionar por níveis:

Região Metropolitana

↓

Município

↓

Bairro

↓

Sensor

Na parte superior criar filtros para:

Município

Bairro

Período

Tipo de Sensor

Sempre que qualquer filtro for alterado todo o Dashboard deverá atualizar automaticamente.

Dashboard Geral

Exibir:

Índice Geral de Risco

Municípios Monitorados

Sensores Online

Sensores Offline

Quantidade de Alertas

Regiões em Alerta

Status da IA

Previsão das próximas 24 horas

Dashboard do Município

Quando o usuário selecionar Recife, por exemplo, mostrar apenas informações de Recife.

Mostrar:

Índice de Risco

Mapa de Recife

Quantidade de Sensores

Alertas

Bairro mais crítico

Total de ocorrências

Todos os gráficos deverão utilizar apenas dados daquele município.

O mesmo deverá acontecer para:

Olinda

Paulista

Jaboatão dos Guararapes

Camaragibe

Abreu e Lima

Igarassu

São Lourenço da Mata

Moreno

Cabo de Santo Agostinho

Dashboard do Bairro

Ao clicar em um bairro abrir um Dashboard exclusivo.

Exibir:

Mapa do bairro

Índice de risco

Quantidade de sensores

Últimos alertas

Histórico

Todos os gráficos daquele bairro

Sensores instalados

Previsão da IA

Dashboard do Sensor

Ao clicar em qualquer sensor abrir uma página contendo:

Nome

ID

Localização GPS

Município

Bairro

Status

Bateria

Última atualização

Intensidade do sinal

Todos os valores em tempo real

Sensores

O sistema deverá utilizar seis sensores.

Sensor de Pluviosidade

Sensor de Umidade do Solo

Sensor de Temperatura

Sensor de Vibração

Sensor de Inclinação do Terreno

Sensor de Deslocamento do Solo

Cada sensor deverá possuir:

Status

Gráfico

Última leitura

Bateria

Sinal

Localização

Histórico

Inteligência Artificial

Criar um módulo chamado IA de Prevenção de Deslizamentos.

A IA deverá analisar simultaneamente:

Pluviosidade

Umidade do Solo

Temperatura

Vibração

Inclinação

Deslocamento

Histórico

Tendência

Alertas anteriores

Com essas informações calcular automaticamente um Índice de Risco entre 0 e 100.

Classificação:

0–25 Baixo

26–50 Moderado

51–75 Alto

76–100 Crítico

A IA deverá explicar o motivo da classificação, indicando quais sensores contribuíram para o risco.

Também deverá estimar a probabilidade de deslizamento nas próximas 24 horas.

Botão Emitir Alerta

Adicionar um botão flutuante permanente.

O botão deverá existir em TODAS as páginas.

Sempre fixo no canto inferior direito.

Ao clicar abrir um modal contendo:

Município

Bairro

Nível do alerta

Descrição

Sensores responsáveis

Horário

Botão Confirmar

Botão Cancelar

Quando a IA detectar risco crítico o alerta deverá ser aberto automaticamente.

Alertas

Criar uma página exclusiva contendo:

Alertas Ativos

Alertas Encerrados

Histórico

Filtros

Exportação

Cada alerta deverá mostrar:

Município

Bairro

Sensor responsável

Nível

Data

Hora

Motivo

Mapa

Criar um mapa totalmente interativo.

Mostrar todos os municípios monitorados.

Ao clicar em Recife:

dar zoom automaticamente.

Mostrar apenas bairros de Recife.

Ao clicar em um bairro:

mostrar todos os sensores.

Cada sensor deverá possuir uma cor conforme o risco.

Verde

Amarelo

Laranja

Vermelho

Gráficos

Todos os sensores deverão possuir gráficos.

Pluviosidade

Temperatura

Umidade do Solo

Vibração

Inclinação

Deslocamento

Permitir visualizar:

Últimas 24 horas

Últimos 7 dias

Últimos 30 dias

Todos os gráficos deverão mudar automaticamente conforme a região selecionada.

Histórico

Criar filtros por:

Município

Bairro

Sensor

Tipo

Período

Risco

Permitir exportar relatórios.

Responsividade

O sistema deverá funcionar perfeitamente em:

Desktop

Notebook

Tablet

Celular

Interface

Tema escuro.

Glassmorphism.

Animações suaves.

Cards modernos.

Sidebar recolhível.

Navbar fixa.

Mapa em tela cheia.

Dashboard semelhante ao utilizado por centros de monitoramento e Defesa Civil.

Simulação Inteligente

Criar um simulador de sensores.

Os valores deverão variar automaticamente.

Quando houver chuva intensa, a umidade do solo deverá aumentar.

Com aumento da umidade, poderá ocorrer aumento da inclinação e do deslocamento do solo.

Quando houver deslocamento e vibração elevados, a IA deverá aumentar automaticamente o índice de risco.

A simulação deve manter relações coerentes entre os sensores, em vez de gerar valores aleatórios independentes.

Qualidade do Código

Organizar o projeto em componentes reutilizáveis.

Utilizar boas práticas de React.

Criar contexto global.

Separar páginas, componentes, serviços, hooks, tipos e utilitários.

Utilizar TypeScript em todo o projeto.

Criar um código limpo, documentado e preparado para crescimento futuro.

O resultado final deverá parecer um sistema profissional pronto para apresentação acadêmica e demonstração para órgãos como a Defesa Civil, oferecendo uma experiência visual moderna, desempenho elevado e navegação intuitiva.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://prototipoinova.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/50b0c3d3-2649-4179-8293-a70f6ce2ed79).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
