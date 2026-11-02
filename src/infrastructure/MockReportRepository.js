import { ReportRepository } from '../domain/repositories/ReportRepository.js';
import { Report } from '../domain/entities/Report.js';

/**
 * MockReportRepository
 * In-memory fake repository with rich markdown reports for development and demo.
 * Activate with ?mock=true in the URL.
 */
export class MockReportRepository extends ReportRepository {
  constructor() {
    super();
    this._reports = this._buildReports();
  }

  async listReports() {
    // Simulate network delay
    await this._delay(400);
    return this._reports.map(r => new Report({
      id: r.id,
      title: r.title,
      path: r.id,
      size: r.content.length,
      updatedAt: r.updatedAt,
      content: null,
    }));
  }

  async getReportById(id) {
    await this._delay(600);
    const report = this._reports.find(r => r.id === id);
    if (!report) throw new Error(`Relatório não encontrado: ${id}`);
    return new Report({ ...report });
  }

  async testConnection() {
    await this._delay(200);
    return true;
  }

  _delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  _buildReports() {
    return [
      {
        id: 'relatorios/WEGE3.md',
        title: 'WEG S.A. (WEGE3)',
        updatedAt: '2026-10-15T10:00:00Z',
        content: `# WEG S.A. — WEGE3
> **Análise atualizada:** Outubro 2026 · **Setor:** Bens de Capital · **Segmento:** Novo Mercado

## Resumo Executivo
A **WEG** é uma das maiores fabricantes de equipamentos elétricos do mundo, com presença em mais de 135 países. A companhia apresenta histórico consistente de crescimento de receita e expansão de margens, sustentado por seu modelo de negócio verticalizado e forte presença no mercado de automação industrial e energias renováveis.

## Indicadores Financeiros

| Indicador       | 2023    | 2024    | 2025 (est.) |
|----------------|---------|---------|-------------|
| Receita Líquida | R$ 32,1 bi | R$ 36,8 bi | R$ 40,5 bi |
| EBITDA          | R$ 6,4 bi  | R$ 7,6 bi  | R$ 8,4 bi  |
| Margem EBITDA   | 19,9%   | 20,7%   | 20,7%       |
| Lucro Líquido   | R$ 4,8 bi  | R$ 5,7 bi  | R$ 6,2 bi  |
| Margem Líquida  | 14,9%   | 15,5%   | 15,3%       |
| ROE             | 28,3%   | 29,1%   | 28,8%       |
| Dívida Líquida  | –R$ 2,1 bi | –R$ 3,0 bi | –R$ 3,8 bi |

> 💡 **Caixa líquido positivo** em todos os períodos — empresa é credora líquida.

## Análise Histórica

### Evolução da Receita (2019–2025)
A WEG compõe uma trajetória de crescimento de ~18% ao ano no período, impulsionada por:
- Expansão no segmento de **Geração de Energia** (eólica e solar)
- Crescimento orgânico no mercado **externo** (América do Norte, Europa)
- Aquisições estratégicas (Regal Beloit division, Howard Industries)

### Endividamento
A companhia opera consistentemente em posição de **caixa líquido**, resultado de:
1. Alta geração de caixa operacional (FCO médio de R$ 5 bi/ano)
2. Política de reinvestimento disciplinado
3. Dividendos conservadores (~30% do lucro)

## Riscos Principais
- **Câmbio**: ~55% da receita em moeda estrangeira (exposição a USD/EUR)
- **Ciclo industrial**: Demanda B2B correlacionada com PIB industrial global
- **Valuation**: P/L histórico elevado (~40x) exige crescimento contínuo para justificar

## Dados & Comparativos

| Métrica   | WEGE3 | Setor (mediana) |
|-----------|-------|-----------------|
| P/L       | 38,2x | 22,4x           |
| EV/EBITDA | 27,5x | 14,8x           |
| P/VP      | 10,8x | 3,1x            |
| DY        | 0,9%  | 2,4%            |

## Conclusão
WEG é um ativo de **altíssima qualidade** com histórico excepcional. O principal risco é o valuation esticado — a empresa precisa continuar crescendo acima de 15% ao ano para que o preço atual faça sentido fundamentalista. Para investidores de longo prazo com horizonte >10 anos, o prêmio de qualidade tende a se justificar.

---
*Relatório de caráter educativo. Não constitui recomendação de compra ou venda.*
`,
      },
      {
        id: 'relatorios/VALE3.md',
        title: 'Vale S.A. (VALE3)',
        updatedAt: '2026-10-10T14:00:00Z',
        content: `# Vale S.A. — VALE3
> **Análise atualizada:** Outubro 2026 · **Setor:** Mineração · **Segmento:** Novo Mercado

## Resumo Executivo
A **Vale** é a maior mineradora de minério de ferro do mundo e segunda maior produtora de níquel. Com operações em 5 continentes, a empresa é altamente dependente do ciclo de commodities e da economia chinesa, que absorve ~65% do minério de ferro global.

## Indicadores Financeiros

| Indicador       | 2023     | 2024     | 2025 (est.) |
|----------------|----------|----------|-------------|
| Receita Líquida | US$ 41,8 bi | US$ 38,5 bi | US$ 42,1 bi |
| EBITDA          | US$ 17,3 bi | US$ 15,9 bi | US$ 17,8 bi |
| Margem EBITDA   | 41,4%    | 41,3%    | 42,3%       |
| Lucro Líquido   | US$ 8,5 bi | US$ 7,2 bi | US$ 9,1 bi |
| Dívida Líquida  | US$ 11,1 bi | US$ 9,8 bi | US$ 8,4 bi |
| Dividend Yield  | 8,3%     | 7,1%     | 9,2%        |

## Análise Histórica

### Preço do Minério de Ferro (US$/t)
| Ano  | Preço Médio | Impacto na Vale |
|------|-------------|-----------------|
| 2021 | US$ 158     | Lucros recordes  |
| 2022 | US$ 112     | Normalização     |
| 2023 | US$ 118     | Estável          |
| 2024 | US$ 104     | Pressão margens  |
| 2025 | US$ 115 *   | Recuperação      |

### Histórico em Crises
- **2008 (Crise Global)**: Ações caíram -65%; recuperação completa em 18 meses
- **2015 (Maracatu/Recessão BR)**: –70%; parcialmente da desvalorização do BRL
- **2020 (COVID)**: –40% seguido de recuperação histórica (+180%)
- **2022 (China Lockdown)**: –30%; curta duração

## Riscos Principais
- **Ciclo do minério**: Supersensível ao preço do minério de ferro (correlação >0,85)
- **China**: Desaceleração do setor imobiliário chinês reduz demanda estruturalmente
- **Operacional**: Histórico de desastres (Brumadinho, Mariana) — risco regulatório e reputacional
- **Passivo ambiental**: Ainda ~US$ 4 bi pendentes de indenizações Brumadinho

## Dados & Comparativos

| Métrica   | VALE3 | BHP  | Rio Tinto |
|-----------|-------|------|-----------|
| EV/EBITDA | 5,2x  | 6,8x | 6,1x      |
| P/L       | 8,4x  | 11,2x| 9,7x      |
| DY        | 9,2%  | 5,4% | 6,1%      |
| Dívida/EBITDA | 0,55x | 0,8x | 0,7x |

## Conclusão
Vale negocia com desconto versus pares globais, principalmente pelo risco Brasil e pelo passivo de Brumadinho. Para investidores confortáveis com a volatilidade das commodities, o **dividend yield** elevado e o desconto no múltiplo oferecem margem de segurança. Catalisadores positivos: estímulo chinês ao setor de construção e expansão de produção de níquel (demanda de veículos elétricos).

---
*Relatório de caráter educativo. Não constitui recomendação de compra ou venda.*
`,
      },
      {
        id: 'relatorios/MXRF11.md',
        title: 'Maxi Renda FII (MXRF11)',
        updatedAt: '2026-10-05T09:30:00Z',
        content: `# Maxi Renda — MXRF11
> **Análise atualizada:** Outubro 2026 · **Tipo:** FII de Papel (CRI) · **Gestora:** XP Asset

## Resumo Executivo
O **MXRF11** é um Fundo de Investimento Imobiliário (FII) da categoria **papel**, focado em Certificados de Recebíveis Imobiliários (CRI). Com ~650.000 cotistas e R$ 4,2 bi de patrimônio líquido, é um dos maiores FIIs do Brasil.

## Indicadores do Fundo

| Indicador           | Valor Atual |
|--------------------|-------------|
| Patrimônio Líquido  | R$ 4,2 bi   |
| Número de Cotistas  | ~650.000    |
| Dividend Yield 12m  | 12,4% a.a.  |
| P/VP               | 0,96x       |
| Cotação Atual       | R$ 9,78     |
| VP por Cota         | R$ 10,19    |
| Duration Média Carteira | 3,8 anos |

## Composição da Carteira

| Tipo de CRI        | % Carteira |
|-------------------|------------|
| IPCA +             | 62%        |
| CDI +              | 28%        |
| Prefixado          | 10%        |

| Segmento           | % Carteira |
|-------------------|------------|
| Residencial        | 45%        |
| Lajes Corporativas | 22%        |
| Logística          | 18%        |
| Shoppings          | 15%        |

## Análise Histórica

### Distribuições Mensais (últimos 12 meses)
| Mês     | Rendimento/Cota | Yield Mensal |
|---------|-----------------|--------------|
| Out/25  | R$ 0,100        | 1,02%        |
| Set/25  | R$ 0,100        | 1,01%        |
| Ago/25  | R$ 0,095        | 0,97%        |
| Jul/25  | R$ 0,095        | 0,96%        |

### Em Crises de Taxa de Juros
- **2015–2016 (Selic 14,25%)**: FIIs de papel superaram de longe os de tijolo
- **2021–2022 (Selic subindo)**: Cotação caiu temporariamente, mas rendimentos subiram
- **Lição**: FII de papel é mais resiliente à alta de juros que FII de tijolo

## Riscos Principais
- **Inadimplência de CRIs**: Risco de crédito dos devedores (mitigado pela diversificação)
- **Queda da Selic**: Reduz o CDI+ e parte do portfólio indexado
- **Concentração**: Top 5 devedores representam ~40% da carteira
- **Liquidez de mercado**: Em crises, o P/VP pode cair abaixo de 0,85x

## Conclusão
MXRF11 é uma opção sólida para investidores que buscam **renda passiva** mensal isenta de IR com boa liquidez. O desconto atual (P/VP 0,96x) oferece pequena margem de segurança. Adequado para perfis moderados com foco em renda.

---
*Relatório de caráter educativo. Não constitui recomendação de compra ou venda.*
`,
      },
      {
        id: 'relatorios/HGLG11.md',
        title: 'CSHG Logística FII (HGLG11)',
        updatedAt: '2026-09-28T16:00:00Z',
        content: `# CSHG Logística — HGLG11
> **Análise atualizada:** Setembro 2026 · **Tipo:** FII de Tijolo (Logística) · **Gestora:** Credit Suisse Hedging-Griffo

## Resumo Executivo
O **HGLG11** é um FII de tijolo focado em **galpões logísticos de alto padrão** (Class A). Com portfólio de 27 imóveis e ~1,2 mi m² de ABL, é referência no segmento de logística no Brasil. Principal beneficiário do crescimento do e-commerce e da modernização das cadeias de distribuição.

## Indicadores do Fundo

| Indicador           | Valor Atual  |
|--------------------|--------------|
| Patrimônio Líquido  | R$ 5,8 bi    |
| ABL Total           | 1.216.000 m² |
| Número de Imóveis   | 27           |
| Dividend Yield 12m  | 8,9% a.a.    |
| P/VP               | 1,02x        |
| Cotação Atual       | R$ 172,40    |
| VP por Cota         | R$ 169,02    |
| Taxa de Vacância    | 5,2%         |

## Portfólio Geográfico

| Estado | ABL (m²)   | % Total |
|--------|------------|---------|
| SP     | 712.000    | 58,6%   |
| RJ     | 180.000    | 14,8%   |
| MG     | 145.000    | 11,9%   |
| PR     | 104.000    | 8,5%    |
| Outros | 75.000     | 6,2%    |

## Principais Inquilinos

| Inquilino           | % Receita | Contrato até |
|--------------------|-----------|--------------|
| Magazine Luiza      | 18%       | 2030         |
| Mercado Livre       | 14%       | 2028         |
| DHL                 | 11%       | 2029         |
| Via Varejo          | 9%        | 2027         |
| Amazon Brasil       | 7%        | 2031         |

## Análise Histórica

### Vacância vs. Mercado

| Ano  | HGLG11 | Mercado Galpões SP |
|------|--------|---------------------|
| 2022 | 8,1%   | 14,3%               |
| 2023 | 6,4%   | 11,2%               |
| 2024 | 5,8%   | 9,5%                |
| 2025 | 5,2%   | 8,1%                |

### Reajuste dos Contratos
- 68% dos contratos indexados ao **IGPM**
- 32% indexados ao **IPCA**
- Prazo médio remanescente: 4,3 anos

## Riscos Principais
- **Concentração geográfica**: 58% em SP — risco de sobretaxação ou regulação
- **Inquilino chave**: 18% de receita de um único inquilino (Magalu)
- **Ciclo imobiliário**: Novo estoque de galpões no pipeline pode pressionar aluguéis
- **Taxa de juros**: Custo de oportunidade alto com Selic elevada pode suprimir P/VP

## Vantagens Competitivas
- ✅ Contratos **built-to-suit** (inquilino projeta o imóvel) = menor risco de saída
- ✅ Localização estratégica em **anéis viários** e próximo a grandes centros urbanos
- ✅ Gestão ativa com histórico de **reciclagem de portfólio** (venda de ativos maduros)
- ✅ Imóveis com certificação ambiental **LEED** / **GBC Brasil**

## Conclusão
HGLG11 é o **FII de logística de referência** no Brasil. Vacância baixa, inquilinos sólidos e contratos longos conferem estabilidade. O P/VP levemente acima de 1x reflete a qualidade do portfólio. Risco principal é concentração em e-commerce e a macro (juros). Indicado para investidores de renda com horizonte >5 anos.

---
*Relatório de caráter educativo. Não constitui recomendação de compra ou venda.*
`,
      },
    ];
  }
}
