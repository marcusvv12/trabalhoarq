# Roteiro de Apresentacao — Escalabilidade Horizontal e Balanceamento de Carga

> **Formato:** 12 slides | Tempo estimado: 15–20 minutos + demo ao vivo

---

## Antes de comecar

```powershell
docker compose down -v
docker compose up --build
```

Aguarde:
```
app1-1 | API academic listening on port 3000 (instance=app-1)
app2-1 | API academic listening on port 3000 (instance=app-2)
```

Abra no navegador: **http://localhost:8080**

---

## Slide 1 — Capa

> "Nosso trabalho implementa escalabilidade horizontal e balanceamento de carga sobre uma API academica real. Vamos mostrar o conceito funcionando na pratica: duas instancias Node.js, um balanceador NGINX e um banco PostgreSQL compartilhado, tudo orquestrado com Docker Compose."

---

## Slide 2 — Contexto e Problema

> "O cenario e simples: uma universidade tem uma API para gestao academica. Em periodos de matricula, o volume de acessos explode. Uma unica instancia da aplicacao nao aguenta esse pico — ela fica lenta ou cai."

> "O problema classico de instancia unica e triplo: e um gargalo de desempenho, e um ponto unico de falha, e exige parada total para manutencao. A solucao que implementamos e distribuir a carga entre multiplas instancias identicas usando um balanceador na frente."

---

## Slide 3 — Arquitetura da Solucao

> "O fluxo e este: o cliente faz uma requisicao HTTP na porta 8080. O NGINX recebe, escolhe qual instancia vai responder usando round-robin, e repassa para app-1 ou app-2. As duas instancias sao identicas — mesmo codigo, mesma porta interna 3000. Ambas acessam o mesmo banco PostgreSQL. Por isso qualquer instancia pode atender qualquer requisicao sem diferenca para o usuario."

> "A stack: Node.js 20 com Express na API, PostgreSQL 15 como unico repositorio de dados, NGINX como balanceador, e Docker Compose orquestrando os quatro containers."

---

## Slide 4 — Escalabilidade: Horizontal vs Vertical

> "Existem duas formas de lidar com crescimento de carga. Escalabilidade vertical e colocar mais CPU e RAM no mesmo servidor. Funciona ate um ponto, mas o custo cresce de forma exponencial, existe um limite fisico de hardware, e o ponto unico de falha continua la."

> "Escalabilidade horizontal e adicionar mais instancias identicas. O custo e linear — voce paga por mais uma maquina igual. Nao ha limite pratico de crescimento. E se uma instancia cair, as outras absorvem o trafego. Por isso escolhemos essa abordagem — esta marcada como ADOTADO no slide."

---

## Slide 5 — Stateless: O Pilar da Escalabilidade Horizontal

> "Para que o balanceamento funcione, a aplicacao precisa ser stateless — sem estado local em memoria. Vamos entender por que isso e obrigatorio."

> "Se a aplicacao guardar sessao em memoria, o usuario loga em app-1, a proxima requisicao vai para app-2, e app-2 nao sabe que ele esta logado — sessao perdida. Se guardar cache local, app-1 atualiza um dado e app-2 ainda serve o valor antigo. Se a instancia cair, tudo que estava na memoria dela some."

> "Nossa solucao: nenhum dado de negocio fica em memoria. O PostgreSQL e o unico repositorio de verdade. Qualquer instancia acessa os mesmos dados, entrega o mesmo resultado. O NGINX pode mandar req 1 para app-1 e req 2 para app-2 sem nenhum problema."

---

## Slide 6 — Endpoints da API

> "A API implementa CRUD completo. GET /records lista todos os registros. GET /records/:id consulta um especifico. POST cria, PUT atualiza, DELETE remove."

> "Alem do CRUD, temos dois endpoints de observabilidade: /health retorna o status da instancia e da conexao com o banco, e /metrics retorna o contador de requisicoes e o tempo medio de resposta — por instancia."

> "Um detalhe importante: todas as respostas incluem o campo instanceId no JSON e o cabecalho HTTP x-instance-id. Isso permite rastrear em tempo real qual instancia processou cada requisicao — util tanto para depuracao quanto para provar que o balanceamento esta funcionando."

---

## Slide 7 — NGINX: Balanceamento Round-Robin

> "O NGINX e configurado com um bloco upstream chamado api_cluster que lista as duas instancias. Sem mais nenhuma diretiva, o algoritmo padrao e round-robin: req 1 vai para app1, req 2 vai para app2, req 3 volta para app1, e assim por diante."

> "Cinco pontos importantes sobre esse comportamento: a distribuicao e ciclica e automatica; a carga fica equitativa, cada instancia recebe em torno de 50% das requisicoes; o timeout de conexao e de 1 segundo — se app-1 nao responder nesse tempo, o NGINX a marca como indisponivel; quando a instancia volta, ela e reincorporada automaticamente sem nenhuma intervencao manual; e por ultimo — como o NGINX nao garante que o mesmo usuario caia sempre na mesma instancia, a aplicacao obrigatoriamente precisa ser stateless."

---

## Slide 8 — Monitoramento e Metricas

> "A solucao tem tres camadas de observabilidade. O endpoint /health e o que o NGINX usa para detectar instancias vivas — retorna status ok ou error, o instanceId, e se o banco esta conectado."

> "O endpoint /metrics expoe o contador de requisicoes e o tempo medio de resposta de cada instancia individualmente. Isso permite comparar a carga entre elas."

> "E o frontend e um dashboard em tempo real que agrega tudo isso: mostra o status verde ou vermelho de cada instancia, um grafico de barras com a distribuicao das requisicoes, o log de cada chamada e de qual instancia respondeu, e botoes para disparar 20 ou 50 requisicoes de teste. Ele atualiza a cada 8 segundos automaticamente."

---

## Slide 9 — Demonstracao: Distribuicao de Carga

> "Agora vamos ver ao vivo."

*[No navegador em http://localhost:8080, clique em "20 requisicoes"]*

> "Disparamos 20 requisicoes simultaneas. O grafico mostra aproximadamente 10 para cada instancia — 50% cada. O log confirma a alternancia: req 1 foi para app-1, req 2 para app-2, req 3 para app-1. O campo instanceId em cada linha prova qual processou."

> "Isso demonstra os dois principios centrais: o NGINX funciona como ponto unico de entrada e distribui automaticamente; nenhuma instancia fica sobrecarregada enquanto a outra fica ociosa. Com N instancias, cada uma processaria 1/N da carga total."

---

## Slide 10 — Demonstracao: Resiliencia a Falhas

> "Agora o teste mais impactante: o que acontece quando uma instancia cai?"

*[Abra um segundo terminal e execute:]*
```powershell
docker compose stop app1
```

> "Derrubei a app-1. No painel ela aparece vermelha — offline. Vou disparar mais 20 requisicoes."

*[Clique em "20 requisicoes" novamente]*

> "O sistema nao parou. O NGINX tentou conectar em app-1, teve timeout de 1 segundo, marcou como indisponivel, e redirecionou 100% do trafego para app-2. Nenhuma requisicao foi perdida. Isso e impossivel em uma arquitetura de instancia unica — la, a queda significa indisponibilidade total."

*[Restaure:]*
```powershell
docker compose start app1
```

> "Ao religar app-1, ela volta ao pool automaticamente e o NGINX retoma a distribuicao round-robin. Sem configuracao manual, sem reiniciar nada."

---

## Slide 11 — Trade-offs e Decisoes Arquiteturais

> "Toda decisao arquitetural tem custos. As vantagens da nossa solucao sao claras: alta disponibilidade, escalabilidade linear, possibilidade de deploys sem downtime atualizando uma instancia por vez, custo granular e isolamento de falhas."

> "Mas existem limitacoes reais. Com muitas instancias, o banco de dados vira o novo gargalo — a solucao para isso em producao seria connection pooling e replicas de leitura. Em cenarios com cache distribuido pode haver leituras de dados ligeiramente desatualizados. A complexidade operacional aumenta com mais componentes para monitorar. E o proprio NGINX, na configuracao atual, e um ponto unico de falha — em producao ele ficaria em cluster Active-Passive."

> "Essas limitacoes sao conhecidas e sao o proximo passo natural de evolucao da arquitetura."

---

## Slide 12 — Conclusao

> "Para fechar: todos os requisitos do trabalho foram atendidos. CRUD completo rodando em multiplas instancias com balanceamento real, identificacao de instancia em cada requisicao, metricas por instancia e tolerancia a falhas demonstrada ao vivo."

> "O design e stateless por principio — nenhum estado em memoria local, PostgreSQL compartilhado garante consistencia. A arquitetura e extensivel: adicionar uma terceira instancia exige uma linha no docker-compose.yml e uma linha no nginx.conf, sem alterar uma linha de codigo. E temos observabilidade completa com dashboard, /health e /metrics."

---

## Perguntas que o professor pode fazer

**O que e escalabilidade horizontal?**
Adicionar mais instancias identicas da aplicacao para dividir a carga, ao inves de aumentar os recursos de um unico servidor. E mais barato, mais resiliente e sem limite pratico de crescimento.

**Por que a aplicacao precisa ser stateless?**
Porque o balanceador nao garante que o mesmo usuario va sempre para a mesma instancia. Se houver estado em memoria, requisicoes consecutivas do mesmo usuario podem ir para instancias diferentes e perder o contexto. Com stateless, isso nao importa — qualquer instancia entrega o mesmo resultado.

**Como o NGINX detecta que uma instancia caiu?**
Tenta estabelecer conexao TCP. Se a conexao falha dentro do proxy_connect_timeout (configurado em 1 segundo), a instancia e marcada como indisponivel e removida do pool temporariamente.

**O que acontece com requisicoes em andamento quando uma instancia cai?**
Requisicoes ja em processamento na instancia que caiu sao perdidas. Novas requisicoes sao redirecionadas automaticamente. Em producao, o cliente implementaria retry para lidar com esse caso.

**Como adicionar mais instancias?**
No docker-compose.yml, adicionar um novo servico app3 com a mesma imagem. No nginx.conf, adicionar `server app3:3000;` no bloco upstream. Nenhuma alteracao no codigo da API.

---

## Mapa slide x requisito

| Requisito exigido | Slide |
|---|---|
| Multiplas instancias em execucao | Slide 3 (arquitetura) + Slide 8 (dashboard) |
| Distribuicao de requisicoes | Slide 7 (round-robin) + Slide 9 (demo ao vivo) |
| Identificacao da instancia | Slide 6 (instanceId) + Slide 9 (log) |
| Comportamento sob carga | Slide 9 (20 requisicoes) |
| Tempo medio de resposta | Slide 8 (/metrics) |
| Impacto da falha de instancia | Slide 10 (demo stop/start) |
| Discussao sobre estado | Slide 5 (stateless) + Slide 11 (trade-offs) |
