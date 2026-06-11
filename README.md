# API Acadêmica com Escalabilidade Horizontal e Balanceamento de Carga

Esta solução implementa uma API acadêmica com suporte a CRUD de registros e demonstração de escalabilidade horizontal usando múltiplas instâncias e um balanceador de carga.

## O que está incluído

- API RESTful com endpoints para cadastrar, consultar, listar, atualizar e remover registros.
- Duas instâncias da aplicação (`app1` e `app2`).
- Balanceador de carga NGINX que distribui requisições entre as instâncias.
- Banco de dados PostgreSQL externo que mantém o estado dos registros.
- Identificação da instância que respondeu a cada requisição via `x-instance-id`.
- Endpoint de métricas para verificar quantidade de requisições e tempo médio de resposta.

## Como executar

### 1. Instalar Docker Desktop

Se você ainda não tem Docker instalado, baixe e instale o Docker Desktop para Windows.

### 2. Iniciar a solução

Abra PowerShell no diretório do projeto (`d:\puc\TRABALOARQUITETURA`) e execute:

```powershell
docker compose up --build
```

O NGINX ficará disponível em `http://localhost:8080`.

## Endpoints da API

A API está disponível através do balanceador em `http://localhost:8080`.

- `GET /records` - lista todos os registros.
- `GET /records/:id` - consulta um registro por ID.
- `POST /records` - cria um novo registro. Corpo JSON:
  ```json
  {
    "name": "Aluno Exemplo",
    "type": "matricula",
    "detail": "Registro de matrícula para semestre 1"
  }
  ```
- `PUT /records/:id` - atualiza um registro existente.
- `DELETE /records/:id` - remove um registro.
- `GET /health` - verifica saúde da instância e conexão com o banco.
- `GET /metrics` - mostra métricas de requisições e tempo médio de resposta.

## Testando o balanceamento de carga

Cada resposta inclui o cabeçalho `x-instance-id` com a instância que respondeu.

Por exemplo:

```powershell
curl -i http://localhost:8080/records
```

Chamando várias vezes, você deve ver `app-1` e `app-2` alternando como resposta.

### Criar e consultar registros

```powershell
curl -X POST http://localhost:8080/records -H "Content-Type: application/json" -d "{\"name\": \"João Silva\", \"type\": \"matricula\", \"detail\": \"Curso de Engenharia de Software\"}"

curl http://localhost:8080/records
```

### Simular falha de uma instância

Pare uma instância e continue usando o balanceador:

```powershell
docker compose stop app1
curl http://localhost:8080/records
```

A outra instância continuará respondendo, o que demonstra tolerância a falha.

## Por que a solução é escalável

- A aplicação é stateless: cada instância não guarda os dados localmente em memória.
- O estado dos registros é mantido no PostgreSQL, que é um serviço externo compartilhado.
- O NGINX distribui requisições entre `app1` e `app2`.
- Cada instância responde com `x-instance-id`, mostrando claramente a distribuição de carga.

## Observações importantes

- O uso de memória local para estado impede escalabilidade horizontal verdadeira.
- Com esta implementação, a lógica de negócio permanece nas instâncias, e o banco de dados compartilha o estado.
- Ao remover ou parar uma instância, as requisições continuam sendo atendidas por outra instância.

## Arquivos principais

- `server.js` - lógica da API e métricas.
- `Dockerfile` - imagem da aplicação.
- `docker-compose.yml` - orquestração das instâncias, banco e balanceador.
- `nginx.conf` - configuração do load balancer.

---

Se quiser, posso também criar um script de demonstração em PowerShell para gerar carga e mostrar a distribuição automática entre as instâncias.
