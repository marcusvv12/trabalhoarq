# Comandos da Demo ao Vivo — Apresentacao

> Abrir este arquivo e um terminal PowerShell lado a lado antes de comecar.

---

## ETAPA 0 — Subir o ambiente (antes de apresentar)

```powershell
docker compose down -v
```
```powershell
docker compose up --build
```

Aguardar as duas linhas aparecerem no log:
```
app1-1 | API academic listening on port 3000 (instance=app-1)
app2-1 | API academic listening on port 3000 (instance=app-2)
```

Abrir no navegador: **http://localhost:8080**

---

## ETAPA 1 — Verificar containers rodando (slide 3 ou 9)

```powershell
docker compose ps
```

Resultado esperado: quatro containers com status `running` — app1, app2, db, lb.

---

## ETAPA 2 — Provar balanceamento via curl (slide 8 ou 10)

Rodar tres vezes seguidas e mostrar o `instanceId` alternando:

```powershell
Invoke-RestMethod http://localhost:8080/health | Select-Object instanceId, status
```
```powershell
Invoke-RestMethod http://localhost:8080/health | Select-Object instanceId, status
```
```powershell
Invoke-RestMethod http://localhost:8080/health | Select-Object instanceId, status
```

Resultado esperado: `app-1`, `app-2`, `app-1` — alternando a cada chamada.

---

## ETAPA 3 — Ver metricas por instancia (slide 9)

```powershell
Invoke-RestMethod http://localhost:8080/metrics
```

Mostra `instanceId`, `requestCount` e `averageResponseMs` da instancia que respondeu.
Rodar duas vezes para ver as duas instancias.

---

## ETAPA 4 — Demo distribuicao de carga (slide 10)

No navegador, clicar em **"20 requisicoes"** e mostrar o grafico dividindo 50/50.

Confirmar pelo terminal:

```powershell
Invoke-RestMethod http://localhost:8080/metrics
```
```powershell
Invoke-RestMethod http://localhost:8080/metrics
```

Os dois `requestCount` devem estar proximos entre si.

---

## ETAPA 5 — Demo resiliencia: derrubar app-1 (slide 11)

```powershell
docker compose stop app1
```

No navegador, clicar em **"20 requisicoes"** novamente.
Mostrar que 100% foi para app-2 e nenhuma requisicao falhou.

Confirmar no terminal que so app-2 responde:

```powershell
Invoke-RestMethod http://localhost:8080/health | Select-Object instanceId, status
```

---

## ETAPA 6 — Restaurar app-1 (ainda slide 11)

```powershell
docker compose start app1
```

Aguardar alguns segundos e mostrar app-1 voltando verde no dashboard.
Rodar para confirmar round-robin retomado:

```powershell
Invoke-RestMethod http://localhost:8080/health | Select-Object instanceId, status
```
```powershell
Invoke-RestMethod http://localhost:8080/health | Select-Object instanceId, status
```

---

## ETAPA 7 — Encerrar (apos apresentacao)

```powershell
docker compose down -v
```

---

## Referencia rapida — endpoints disponiveis

| Endpoint | O que retorna |
|---|---|
| `GET /health` | instanceId + status + conexao com banco |
| `GET /metrics` | instanceId + requestCount + averageResponseMs |
| `GET /records` | lista todos os registros academicos |
| `POST /records` | cria registro (body: `{"name":"X","type":"Y","detail":"Z"}`) |
