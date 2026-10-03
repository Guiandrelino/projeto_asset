# Asset Intelligence Platform

Infraestrutura de análise de carteiras brasileiras, risco e, futuramente, alocação.

## Estado atual

Backend Python/FastAPI com carteira demonstrativa em BRL, dados sintéticos reproduzíveis e motor de risco testado. Dashboard Next.js/TypeScript com indicadores, curva de patrimônio, composição, correlação e exportação JSON. Ainda não há banco de dados, importação de posições ou integração com preços reais.

| Ativo | Peso demonstrativo |
|---|---:|
| PETR4 | 20% |
| VALE3 | 20% |
| ITUB4 | 20% |
| WEGE3 | 15% |
| BOVA11 | 25% |

Os pesos são apenas um exemplo técnico, não uma recomendação. O ETF pode se sobrepor às ações; ainda não há decomposição dos seus ativos subjacentes.

## Executar no Windows (PowerShell)

Na raiz do projeto, com Python 3.11+:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".\backend[dev]"
.\.venv\Scripts\python.exe -m uvicorn asset_intelligence.api:app --reload
```

Documentação interativa: http://127.0.0.1:8000/docs

Endpoints:
- `GET /health`: verificação da API.
- `GET /api/v1/demo/portfolio`: composição demonstrativa.
- `GET /api/v1/demo/risk`: métricas, correlação e curva de patrimônio normalizada (inicial = 1).
- `POST /api/v1/demo/simulate`: compara os pesos enviados com a carteira original, no mesmo histórico. Pesos inválidos retornam HTTP 422.

Testes:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
```

## Dashboard (PowerShell)

Requer Node.js 20.9+ e npm. Mantenha a API rodando e abra um **segundo terminal** na raiz do projeto:

```powershell
cd frontend
npm install
npm run dev
```

Acesse http://localhost:3000. Se a porta estiver ocupada, confira no terminal a porta escolhida pelo Next.js.

O servidor Next.js consulta a API em `http://127.0.0.1:8000`. Não é necessário configurar CORS, pois as consultas são feitas no servidor, não no navegador. Para alterar o endereço:

```powershell
Copy-Item .env.example .env.local
```

Edite `API_BASE_URL` e reinicie o frontend. O dashboard mostra um estado de conexão indisponível se a API não responder. O botão Atualizar consulta novamente os dados; como a seed é fixa, os resultados sintéticos permanecem iguais. Exportar JSON salva a composição e a análise atualmente exibidas.

Verificações e build, dentro de `frontend/`:

```powershell
npm run typecheck
npm run build
npm start
```

## Simulação de alocação

No dashboard, abra **Simular alocação**, informe os pesos em porcentagem e clique em **Comparar cenário**. Todos os pesos devem estar entre 0 e 100% e somar 100%; zero é permitido. O cenário não é salvo nem altera a carteira original.

O resultado compara retorno, volatilidade, drawdown, VaR, ES e HHI. As diferenças percentuais são exibidas em **pontos percentuais**, como cenário menos atual. Não há otimização automática nem previsão de retorno: é um cálculo retrospectivo sobre dados sintéticos, com os mesmos pressupostos da análise original. A exportação JSON do dashboard permanece relativa à carteira original.

Exemplo de payload da API (pesos em **frações**, não em porcentagens):

```json
{
  "weights": {
    "PETR4": 0.4,
    "VALE3": 0.1,
    "ITUB4": 0.2,
    "WEGE3": 0.1,
    "BOVA11": 0.2
  }
}
```

A resposta inclui `current`, `scenario`, `metric_deltas`, `data_source` e `notice`. O navegador chama o proxy Next.js `POST /api/simulate`; o endereço do backend não é exposto como configuração pública. Em caso de indisponibilidade, o proxy retorna HTTP 503.

## Otimização de mínima variância

Em **Otimizar carteira**, defina o peso máximo por instrumento (padrão: 40%). Para cinco ativos, o mínimo viável é 20%, que força pesos iguais. A carteira permanece comprada, com soma de pesos igual a 100%.

O motor usa SciPy/SLSQP para minimizar `wᵀΣw`, com covariância amostral anualizada por 252. Verifica convergência, soma, limites e objetivo antes de retornar. O resultado compara os pesos e as métricas com a carteira original e pode ser exportado em JSON, sem arredondamento dos pesos calculados.

Endpoint: `POST /api/v1/demo/optimize`, com payload `{"max_weight": 0.4}` (fração). `{}` usa o limite padrão. A resposta inclui `optimization`, `current`, `scenario`, `metric_deltas`, `data_source` e `notice`. Solicitações inválidas/inviáveis retornam 422; falha do solver retorna 503. O navegador usa o proxy `POST /api/optimize`.

**Limitações:** otimização in-sample no próprio histórico sintético, sem avaliação fora da amostra, regularização da covariância, custos, restrições setoriais ou decomposição do ETF. Minimiza variância, não maximiza retorno nem minimiza necessariamente VaR ou drawdown. Se a carteira original não respeitar o limite escolhido, a solução restrita pode ter maior volatilidade que ela. Não modifica a carteira original nem constitui recomendação de investimento.

Se a API já estava rodando antes desta atualização, reinicie-a após instalar as novas dependências:

```powershell
.\.venv\Scripts\python.exe -m pip install -e ".\backend[dev]"
```

## Convenções financeiras

- Carteira comprada, sem alavancagem, pesos somando 100%, moeda-base BRL.
- Retornos simples diários; rebalanceamento diário para pesos fixos. Não é uma carteira buy-and-hold nem uma reconstrução de posições reais.
- Volatilidade amostral anualizada com 252 pregões; inclui covariâncias.
- VaR histórico e Expected Shortfall de um dia a 95%. VaR usa quantil com interpolação linear; ES é a média das perdas observadas maiores ou iguais ao quantil. Ambos têm piso zero.
- Retorno e drawdown calculados a partir do patrimônio composto, incluindo o capital inicial. Drawdown é negativo; volatilidade, VaR e ES são frações positivas, não percentuais formatados.
- HHI é a soma dos quadrados dos pesos (concentração por instrumento, não por exposição econômica).
- Correlações indefinidas (séries constantes) são retornadas como `null`.
- Dados ausentes, preços não positivos, datas repetidas/desordenadas e pesos inválidos são rejeitados.
- Sem custos, impostos, liquidez, benchmark ou eventos corporativos. A futura integração real deverá fornecer preços ajustados e calendário de negociação apropriado.
- A demonstração usa 253 preços artificiais e 252 retornos. Dias úteis genéricos **não** representam o calendário da B3. Nenhuma cotação ou performance apresentada é real.

## Estrutura

```text
backend/
  pyproject.toml
  src/asset_intelligence/
    api.py       # Endpoints
    demo.py      # Ativos e séries sintéticas
    risk.py      # Motor independente da API
    simulation.py # Comparação de cenários
    optimization.py # Mínima variância com limites
  tests/
    test_risk.py
    test_simulation.py
    test_simulation_api.py
    test_optimization.py
    test_optimization_api.py
frontend/
  src/app/              # Página, estilos e estados de carregamento/erro
  src/components/       # Dashboard e gráfico Recharts
  src/lib/              # Tipos dos contratos da API
  .env.example
```

## Próximas etapas

1. Importação de posições e integração com fonte real de preços ajustados.
2. Persistência em PostgreSQL e rastreabilidade de análises.
3. Validação fora da amostra, limites setoriais e modelos de covariância mais robustos.
