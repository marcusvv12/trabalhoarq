# API Academica — Escalabilidade Horizontal e Balanceamento de Carga

API REST academica executando em multiplas instancias com balanceamento de carga NGINX e banco de dados PostgreSQL compartilhado.

## Prerequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execucao

## Iniciar o sistema

```powershell
docker compose up --build
```

Aguarde as duas linhas abaixo aparecerem no terminal:

```
app1-1  | API academic listening on port 3000 (instance=app-1)
app2-1  | API academic listening on port 3000 (instance=app-2)
```

Abra o navegador em: **http://localhost:8080**

## Parar o sistema

```powershell
docker compose down
```

Para parar e apagar os dados do banco:

```powershell
docker compose down -v
```

## Acessos diretos

| Endereco | O que acessa |
|---|---|
| http://localhost:8080 | Balanceador de carga (NGINX) + frontend |
| http://localhost:3001 | Instancia app-1 direto |
| http://localhost:3002 | Instancia app-2 direto |

## Endpoints da API

Todos os endpoints estao disponiveis pelo balanceador em `http://localhost:8080`.

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/records` | Lista todos os registros |
| GET | `/records/:id` | Consulta um registro por ID |
| POST | `/records` | Cria um novo registro |
| PUT | `/records/:id` | Atualiza um registro existente |
| DELETE | `/records/:id` | Remove um registro |
| GET | `/health` | Saude da instancia e conexao com o banco |
| GET | `/metrics` | Contador de requisicoes e tempo medio de resposta |

### Corpo JSON para POST e PUT

```json
{
  "name": "Joao Silva",
  "type": "matricula",
  "detail": "Engenharia de Software — 5o semestre"
}
```

Campos `name` e `type` sao obrigatorios. `detail` e opcional.

Tipos sugeridos: `matricula`, `disciplina`, `nota`, `aluno`.

### Identificacao da instancia

Toda resposta inclui:
- Campo `instanceId` no corpo JSON
- Cabecalho HTTP `x-instance-id`

## Testando pelo terminal

```powershell
# Ver qual instancia respondeu (observar x-instance-id no cabecalho)
curl -i http://localhost:8080/records

# Criar um registro
curl -X POST http://localhost:8080/records `
  -H "Content-Type: application/json" `
  -d '{"name":"Maria Souza","type":"matricula","detail":"Sistemas de Informacao"}'

# Listar todos
curl http://localhost:8080/records

# Consultar por ID
curl http://localhost:8080/records/1

# Atualizar
curl -X PUT http://localhost:8080/records/1 `
  -H "Content-Type: application/json" `
  -d '{"name":"Maria Souza","type":"nota","detail":"Atualizado"}'

# Remover
curl -X DELETE http://localhost:8080/records/1

# Ver metricas de uma instancia especifica
curl http://localhost:3001/metrics
curl http://localhost:3002/metrics
```

## Simular falha de instancia

```powershell
# Derrubar app-1
docker compose stop app1

# O sistema continua respondendo via app-2
curl http://localhost:8080/records

# Restaurar app-1
docker compose start app1
```

## Escalar para mais instancias

Para adicionar uma terceira instancia, acrescente ao `docker-compose.yml`:

```yaml
app3:
  build: .
  environment:
    INSTANCE_ID: app-3
    PGHOST: db
    PGUSER: appuser
    PGPASSWORD: secret
    PGDATABASE: academic
  depends_on:
    db:
      condition: service_healthy
```

E adicione `app3:3000` ao bloco `upstream` do `nginx.conf`.

## Arquitetura

```
Cliente (navegador / curl)
         |
       NGINX  <-- balanceador de carga (round-robin, porta 8080)
      /      \
   app-1    app-2   <-- instancias Node.js identicas (Express)
      \      /
    PostgreSQL       <-- banco de dados compartilhado (porta 5432)
```

## Arquivos principais

| Arquivo | Funcao |
|---|---|
| `server.js` | API Express com CRUD, metricas e identificacao de instancia |
| `Dockerfile` | Imagem Node.js 20 Alpine da aplicacao |
| `docker-compose.yml` | Orquestracao dos servicos (app1, app2, db, lb) |
| `nginx.conf` | Configuracao do balanceador round-robin |
| `public/index.html` | Frontend com dashboard de monitoramento em tempo real |
