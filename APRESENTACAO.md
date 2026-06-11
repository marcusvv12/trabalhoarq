# Guia de Apresentação — Escalabilidade Horizontal e Balanceamento de Carga

## O que foi construído

Uma API REST acadêmica executando em **duas instâncias simultâneas** (`app-1` e `app-2`), com um **balanceador de carga nginx** distribuindo as requisições entre elas, um banco de dados PostgreSQL compartilhado e um **frontend** para demonstrar tudo funcionando em tempo real.

```
Navegador (localhost:8080)
        │
      nginx  ← balanceador de carga (round-robin)
      /    \
  app-1   app-2   ← instâncias Node.js idênticas
      \    /
    PostgreSQL    ← banco compartilhado
```

---

## Como iniciar antes de apresentar

```powershell
# No terminal, dentro da pasta do projeto:
docker compose down -v
docker compose up --build
```

Aguarde as duas linhas aparecerem:
```
app1-1 | API academic listening on port 3000 (instance=app-1)
app2-1 | API academic listening on port 3000 (instance=app-2)
```

Depois abra no navegador: **http://localhost:8080**

---

## Roteiro de demonstração (passo a passo)

### 1. Mostrar a arquitetura em execução

Aponte para o painel "Instâncias em execução" no topo da página.

> *"Aqui vemos as duas instâncias da API rodando simultaneamente. Cada uma reporta quantas requisições já atendeu e o tempo médio de resposta. O badge no canto superior direito mostra qual instância respondeu à última requisição."*

---

### 2. Demonstrar o balanceamento de carga

Clique em **"20 requisições"** na seção de demonstração.

> *"Estamos disparando 20 requisições ao mesmo tempo para o balanceador. O nginx distribui em round-robin — uma requisição vai para app-1, a próxima para app-2, e assim sucessivamente. O gráfico mostra que cada instância atendeu aproximadamente metade. Isso é a escalabilidade horizontal funcionando: o trabalho foi dividido entre múltiplas instâncias."*

O gráfico vai mostrar ~50% para cada. O log mostra cada requisição e qual instância respondeu.

---

### 3. Demonstrar as operações CRUD

Use o formulário "Cadastrar registro" para criar 2 ou 3 registros.

> *"A API suporta todas as operações: cadastrar, consultar, listar, atualizar e remover registros. Observe o badge 'Última instância que respondeu' — ele alterna entre app-1 e app-2 a cada operação, provando que o nginx está distribuindo as chamadas."*

Mostre editar um registro e depois remover outro.

---

### 4. Demonstrar a identificação da instância

Na tabela de registros, a coluna **"Instância que listou"** mostra qual instância respondeu cada listagem.

> *"Cada resposta da API inclui o campo `instanceId`, que identifica qual das instâncias processou a requisição. Isso é importante para depuração e também para demonstrar que o balanceamento está ocorrendo de fato."*

---

### 5. Demonstrar falha de instância (ponto mais impactante)

Abra um **segundo terminal** e rode:

```powershell
docker compose stop app1
```

Volte ao navegador e clique em **"20 requisições"** novamente.

> *"Acabei de derrubar a instância app-1. Observe no painel que ela aparece como offline. Mas o sistema continua funcionando — o nginx detectou que app-1 não responde e redireciona 100% do tráfego para app-2. Nenhuma requisição foi perdida pelo usuário. Isso é a resiliência que a escalabilidade horizontal oferece."*

Para restaurar:

```powershell
docker compose start app1
```

> *"Ao religar app-1, ela volta ao pool automaticamente e o nginx retoma a distribuição."*

---

### 6. Mostrar o tempo médio de resposta

Após disparar 50 requisições, aponte para o painel de instâncias.

> *"Cada instância exibe seu tempo médio de resposta independentemente. Com duas instâncias, cada uma processa metade da carga — o que mantém o tempo de resposta baixo mesmo com muitas requisições simultâneas. Se houvesse somente uma instância, ela processaria tudo sozinha e o tempo subiria."*

---

## Conceitos que o professor vai perguntar

### O que é escalabilidade horizontal?

> Adicionar **mais instâncias** da mesma aplicação para dividir o trabalho, ao invés de colocar mais memória/CPU em um único servidor (escalabilidade vertical). É mais barato, mais resiliente e sem limite teórico de crescimento.

### Por que a aplicação deve ser stateless?

> Uma aplicação **stateless** (sem estado local) não guarda nada em memória entre requisições — ela usa o banco de dados para tudo. Se a app-1 guardar o carrinho de compras de um usuário na própria memória, e a próxima requisição do mesmo usuário cair na app-2, o carrinho some.
>
> **Neste projeto:** os dados ficam no PostgreSQL, que é compartilhado. Qualquer instância pode atender qualquer requisição e vai ter acesso aos mesmos dados.

### Quais problemas surgem com estado local em memória?

> - **Sessões inconsistentes:** usuário loga na app-1, próxima requisição vai para app-2, que não sabe que ele está logado.
> - **Contadores errados:** se cada instância conta requisições separadamente, os totais não batem.
> - **Cache desatualizado:** app-1 atualiza um registro, app-2 ainda serve o valor antigo do cache dela.
> - **Perda de dados:** se a instância cair, tudo que estava na memória dela se perde.

### O que é round-robin?

> É o algoritmo padrão do nginx: ele mantém uma fila circular de servidores e envia cada nova requisição para o próximo da fila. Com 2 instâncias: req 1 → app-1, req 2 → app-2, req 3 → app-1, e assim por diante. Distribui a carga de forma igual.

### Por que o nginx detecta falha automaticamente?

> O nginx tenta se conectar à instância. Se a conexão falha (`proxy_connect_timeout 1s`), ele marca aquela instância como indisponível temporariamente e redireciona para as outras. Quando a instância volta, ele a reincorpora ao pool.

---

## Métricas obrigatórias — onde mostrar cada uma

| Métrica exigida | Onde demonstrar |
|---|---|
| Múltiplas instâncias em execução | Painel "Instâncias em execução" — status verde nas duas |
| Distribuição de requisições | Seção "Demonstração de balanceamento" — gráfico de barras |
| Identificação da instância | Badge no header + coluna "Instância" na tabela |
| Comportamento sob carga | Botão "50 requisições" — log mostrando alternância |
| Tempo médio de resposta | Painel de instâncias — campo "Tempo médio" |
| Impacto da falha de instância | `docker compose stop app1` → mostrar app-1 offline, sistema funciona |
| Discussão sobre estado | Explicar que dados ficam no PostgreSQL compartilhado |
