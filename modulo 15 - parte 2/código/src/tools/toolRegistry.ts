import { jsonSchema } from 'ai';
import type { Tool } from 'ai';

const calcCompoundInterestTool: Tool<any, {
  futureValue: number;
  totalInvested: number;
  totalInterest: number;
  summary: string;
}> = {
  description: 'Calcula o valor futuro de um investimento com juros compostos mensais.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      principal: {
        type: 'number',
        description: 'Valor inicial investido em reais.'
      },
      monthlyRate: {
        type: 'number',
        description: 'Taxa de juros mensal em formato decimal. Ex: 0.01 representa 1% ao mês.'
      },
      months: {
        type: 'number',
        description: 'Número de meses em que o investimento ficará aplicado.'
      }
    },
    required: ['principal', 'monthlyRate', 'months']
  }),
  execute: async ({ principal, monthlyRate, months }: { principal: number; monthlyRate: number; months: number }) => {
    const futureValue = principal * Math.pow(1 + monthlyRate, months);
    const totalInvested = principal;
    const totalInterest = futureValue - totalInvested;

    return {
      futureValue: Number(futureValue.toFixed(2)),
      totalInvested: Number(totalInvested.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      summary: `Investindo R$${principal.toFixed(2)} por ${months} meses a ${(monthlyRate * 100).toFixed(
        2
      )}% ao mês, o valor futuro estimado é de R$${futureValue.toFixed(2)}.`
    };
  }
};

const budgetPlannerTool: Tool<any, {
  essentials: number;
  lifestyle: number;
  investments: number;
  tips: string[];
}> = {
  description: 'Sugere uma divisão de orçamento mensal baseada na regra 50/30/20 com ajustes opcionais.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      income: {
        type: 'number',
        description: 'Renda mensal líquida disponível.'
      },
      rent: {
        type: 'number',
        description: 'Gasto mensal aproximado com moradia, se tiver.'
      },
      debts: {
        type: 'number',
        description: 'Total de parcelas ou dívidas mensais fixas.'
      }
    },
    required: ['income']
  }),
  execute: async ({ income, rent = 0, debts = 0 }: { income: number; rent?: number; debts?: number }) => {
    const essentialsBase = income * 0.5;
    const lifestyleBase = income * 0.3;

    const essentials = Number(Math.max(essentialsBase, rent + debts).toFixed(2));
    const lifestyle = Number(Math.max(lifestyleBase, income * 0.15).toFixed(2));
    const investments = Number((income - essentials - lifestyle).toFixed(2));

    const tips: string[] = [
      'Tente manter os gastos essenciais (moradia, alimentação, transporte) próximos de 50% da renda.',
      'Reserve ao menos 20% para investimentos ou construção de reserva de emergência.'
    ];

    if (debts > 0) {
      tips.push('Priorize quitar dívidas com juros altos usando parte da fatia de estilo de vida.');
    }

    if (investments < income * 0.15) {
      tips.push('Considere rever alguns gastos para aumentar o valor destinado a investimentos.');
    }

    return {
      essentials,
      lifestyle,
      investments,
      tips
    };
  }
};

const cryptoRiskPulseTool: Tool<any, {
  riskLevel: 'baixo' | 'moderado' | 'alto';
  reminder: string;
  checklist: string[];
}> = {
  description:
    'Fornece um lembrete rápido sobre riscos e boas práticas ao investir em criptoativos ou ativos voláteis.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      asset: {
        type: 'string',
        description: 'Nome do criptoativo ou token em análise.'
      }
    }
  }),
  execute: async ({ asset }: { asset?: string }) => {
    const normalizedAsset = asset?.toLowerCase() ?? 'criptoativos';
    const checklist = [
      'Invista apenas o que está disposto a perder.',
      'Diversifique: cripto deve ser uma parte da carteira, não tudo.',
      'Tenha uma estratégia clara de entrada e saída.',
      'Mantenha parte da carteira em ativos defensivos (renda fixa, caixa).'
    ];

    return {
      riskLevel: 'alto',
      reminder: `${normalizedAsset} podem oscilar muito em pouco tempo. Faça aportes graduais e revise sempre sua reserva de emergência antes de aumentar exposição.`,
      checklist
    };
  }
};

type BrapiQuoteListItem = {
  stock?: string;
  symbol?: string;
  name?: string;
  longName?: string;
  close?: number;
  change?: number;
  volume?: number;
  currency?: string;
  market_cap?: number;
  logo?: string;
  sector?: string;
  type?: string;
};

type BrapiNormalizedStock = {
  ticker: string;
  name: string;
  close?: number;
  change?: number;
  volume?: number;
  currency?: string;
  marketCap?: number;
  logo?: string;
  sector?: string;
  assetType?: string;
};

type BrapiIndexItem = {
  stock?: string;
  name?: string;
};

type BrapiNormalizedIndex = {
  ticker: string;
  name: string;
};

type AwesomeApiQuote = {
  code?: string;
  codein?: string;
  name?: string;
  high?: string;
  low?: string;
  varBid?: string;
  pctChange?: string;
  bid?: string;
  ask?: string;
  timestamp?: string;
  create_date?: string;
};

type AwesomeApiNormalizedQuote = {
  pair: string;
  base: string;
  quote: string;
  name?: string;
  high?: number;
  low?: number;
  variation?: number;
  variationPercent?: number;
  bid?: number;
  ask?: number;
  timestamp?: number;
  createdAt?: string;
};

type CoinGeckoSimplePriceEntry = {
  id: string;
  vsCurrency: string;
  price?: number;
  change24h?: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdatedAt?: number;
};

type CryptoCompareTopMarketCapItem = {
  coinInfo?: {
    Id?: string;
    Name?: string;
    FullName?: string;
    Internal?: string;
  };
  raw?: Record<
    string,
    {
      PRICE?: number;
      CHANGEPCT24HOUR?: number;
      MKTCAP?: number;
      TOTALVOLUME24H?: number;
      SUPPLY?: number;
      LASTUPDATE?: number;
    }
  >;
};

type CryptoCompareTopMarketCapNormalized = {
  id: string;
  symbol: string;
  name: string;
  price?: number;
  change24h?: number;
  marketCap?: number;
  volume24h?: number;
  supply?: number;
  quoteCurrency: string;
  lastUpdate?: number;
};

type BinanceTicker24h = {
  symbol?: string;
  priceChange?: string;
  priceChangePercent?: string;
  weightedAvgPrice?: string;
  lastPrice?: string;
  lastQty?: string;
  bidPrice?: string;
  askPrice?: string;
  openPrice?: string;
  highPrice?: string;
  lowPrice?: string;
  volume?: string;
  quoteVolume?: string;
  openTime?: number;
  closeTime?: number;
  count?: number;
};

const brapiFinanceTopVolumeTool: Tool<any, {
  sector: string;
  sortBy: string;
  sortOrder: string;
  limit: number;
  page: number;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  totalCount?: number;
  hasNextPage?: boolean;
  stocks: Array<{
    ticker: string;
    name: string;
    close?: number;
    change?: number;
    volume?: number;
    currency?: string;
    marketCap?: number;
    logo?: string;
    sector?: string;
    assetType?: string;
  }>;
  indexes: Array<{
    ticker: string;
    name: string;
  }>;
  availableSectors: string[];
  availableStockTypes: string[];
  generatedAt?: string;
  summary: string;
}> = {
  description: 'Consulta as ações com maior volume em um setor via Brapi.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'Token de acesso à API Brapi (https://brapi.dev).'
      },
      sector: {
        type: 'string',
        description: 'Setor a ser consultado. Ex: Finance, Technology.'
      },
      sortBy: {
        type: 'string',
        description: 'Campo utilizado para ordenação. Padrão: volume.'
      },
      sortOrder: {
        type: 'string',
        description: 'Direção da ordenação (asc ou desc). Padrão: desc.'
      },
      limit: {
        type: 'number',
        description: 'Quantidade de resultados a retornar. Padrão: 10.'
      },
      page: {
        type: 'number',
        description: 'Página da paginação. Padrão: 1.'
      }
    },
    required: ['token']
  }),
  execute: async ({
    token,
    sector = 'Finance',
    sortBy = 'volume',
    sortOrder = 'desc',
    limit = 10,
    page = 1
  }: {
    token: string;
    sector?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    page?: number;
  }) => {
    const params = new URLSearchParams({
      sector,
      sortBy,
      sortOrder,
      limit: String(Math.max(1, limit)),
      page: String(Math.max(1, page)),
      token
    });

    const response = await fetch(`https://brapi.dev/api/quote/list?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Falha ao consultar a API Brapi (status ${response.status}).`);
    }

    const data = await response.json();

    const rawStocks: BrapiQuoteListItem[] = Array.isArray(data?.stocks)
      ? (data.stocks as BrapiQuoteListItem[])
      : [];

    const stocks: BrapiNormalizedStock[] = rawStocks
      .map((item): BrapiNormalizedStock => ({
        ticker: item.stock ?? item.symbol ?? '',
        name: item.name ?? item.longName ?? '',
        close: typeof item.close === 'number' ? item.close : undefined,
        change: typeof item.change === 'number' ? item.change : undefined,
        volume: typeof item.volume === 'number' ? item.volume : undefined,
        currency: item.currency ?? 'BRL',
        marketCap: typeof item.market_cap === 'number' ? item.market_cap : undefined,
        logo: typeof item.logo === 'string' ? item.logo : undefined,
        sector: typeof item.sector === 'string' ? item.sector : undefined,
        assetType: typeof item.type === 'string' ? item.type : undefined
      }))
      .filter((item) => Boolean(item.ticker));

    const rawIndexes: BrapiIndexItem[] = Array.isArray(data?.indexes)
      ? (data.indexes as BrapiIndexItem[])
      : [];

    const indexes: BrapiNormalizedIndex[] = rawIndexes
      .map((item): BrapiNormalizedIndex => ({
        ticker: item.stock ?? '',
        name: item.name ?? ''
      }))
      .filter((item) => Boolean(item.ticker) && Boolean(item.name));

    const availableSectors: string[] = Array.isArray(data?.availableSectors)
      ? (data.availableSectors as unknown[]).filter((item): item is string => typeof item === 'string')
      : [];

    const availableStockTypes: string[] = Array.isArray(data?.availableStockTypes)
      ? (data.availableStockTypes as unknown[]).filter((item): item is string => typeof item === 'string')
      : [];

    const currentPage = typeof data?.currentPage === 'number' ? data.currentPage : undefined;
    const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : undefined;
    const itemsPerPage = typeof data?.itemsPerPage === 'number' ? data.itemsPerPage : undefined;
    const totalCount = typeof data?.totalCount === 'number' ? data.totalCount : undefined;
    const hasNextPage = typeof data?.hasNextPage === 'boolean' ? data.hasNextPage : undefined;

    const highlightCount = Math.min(3, stocks.length);
    const highlights = highlightCount > 0 ? stocks.slice(0, highlightCount).map((stock) => stock.ticker).join(', ') : '';

    const summaryParts: string[] = [];

    if (stocks.length > 0) {
      summaryParts.push(`Top ${stocks.length} ações do setor ${sector} ordenadas por ${sortBy} (${sortOrder}).`);
      if (highlights) {
        summaryParts.push(`Destaques: ${highlights}.`);
      }
      if (typeof currentPage === 'number' && typeof totalPages === 'number') {
        summaryParts.push(`Página ${currentPage} de ${totalPages}.`);
      }
      if (availableSectors.length > 0) {
        const sectorPreview = availableSectors.slice(0, 5).join(', ');
        summaryParts.push(
          `Setores disponíveis (${availableSectors.length}): ${sectorPreview}${availableSectors.length > 5 ? '...' : ''}.`
        );
      }
    } else {
      summaryParts.push(`Nenhuma ação encontrada para o setor ${sector}.`);
    }

    const summary = summaryParts.join(' ');

    return {
      sector,
      sortBy,
      sortOrder,
      limit: Number(limit),
      page: Number(page),
      stocks,
      indexes,
      availableSectors,
      availableStockTypes,
      currentPage,
      totalPages,
      itemsPerPage,
      totalCount,
      hasNextPage,
      generatedAt: typeof data?.generatedAt === 'string' ? data.generatedAt : undefined,
      summary
    };
  }
};

const awesomeCurrencyRatesTool: Tool<any, {
  requestedPairs: string[];
  quotes: AwesomeApiNormalizedQuote[];
  summary: string;
  fetchedAt: string;
}> = {
  description: 'Obtém cotações em tempo real de moedas selecionadas via AwesomeAPI.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      pairs: {
        description:
          'Lista de pares no formato BASE-QUOTE separados por vírgula ou array. Ex: "USD-BRL,EUR-BRL,BTC-BRL".',
        oneOf: [
          {
            type: 'string'
          },
          {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        ]
      }
    }
  }),
  execute: async ({ pairs }: { pairs?: string | string[] }) => {
    const normalizedPairs =
      typeof pairs === 'string'
        ? pairs
        : Array.isArray(pairs)
        ? pairs.filter((pair) => typeof pair === 'string' && pair.trim().length > 0).join(',')
        : 'USD-BRL,EUR-BRL,BTC-BRL';

    if (!normalizedPairs) {
      throw new Error('Nenhum par de moedas válido informado.');
    }

    const response = await fetch(`https://economia.awesomeapi.com.br/last/${encodeURIComponent(normalizedPairs)}`);

    if (!response.ok) {
      throw new Error(`Falha ao consultar a AwesomeAPI (status ${response.status}).`);
    }

    const rawData = (await response.json()) as Record<string, AwesomeApiQuote>;

    const quotes: AwesomeApiNormalizedQuote[] = Object.entries(rawData).map(([pairKey, quote]) => {
      const [base = '', quoteCurrency = ''] = pairKey.split(/(?=[A-Z]{3})/);
      const parseNumber = (value?: string) => {
        const parsed = typeof value === 'string' ? Number(value) : NaN;
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      return {
        pair: pairKey,
        base: base || quote.code || '',
        quote: quoteCurrency || quote.codein || '',
        name: quote.name,
        high: parseNumber(quote.high),
        low: parseNumber(quote.low),
        variation: parseNumber(quote.varBid),
        variationPercent: parseNumber(quote.pctChange),
        bid: parseNumber(quote.bid),
        ask: parseNumber(quote.ask),
        timestamp: parseNumber(quote.timestamp),
        createdAt: quote.create_date
      };
    });

    const validQuotes = quotes.filter((quote) => quote.base && quote.quote);
    const requestedPairs = normalizedPairs.split(',').map((pair) => pair.trim()).filter(Boolean);

    const highlightQuotes = validQuotes.slice(0, 3).map((quote) => `${quote.pair}: ${quote.bid ?? 'N/A'}`).join(', ');
    const summaryParts: string[] = [];

    if (validQuotes.length > 0) {
      summaryParts.push(`Cotações atualizadas para ${validQuotes.length} pares (${requestedPairs.join(', ')}).`);
      if (highlightQuotes) {
        summaryParts.push(`Destaques: ${highlightQuotes}.`);
      }
    } else {
      summaryParts.push('Não foi possível normalizar nenhuma cotação retornada pela AwesomeAPI.');
    }

    const summary = summaryParts.join(' ');

    return {
      requestedPairs,
      quotes: validQuotes,
      summary,
      fetchedAt: new Date().toISOString()
    };
  }
};

const coingeckoSimplePriceTool: Tool<any, {
  ids: string[];
  vsCurrencies: string[];
  priceEntries: CoinGeckoSimplePriceEntry[];
  summary: string;
  fetchedAt: string;
}> = {
  description: 'Consulta preços e variação 24h de criptoativos via CoinGecko Simple Price API.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      ids: {
        description: 'Lista de IDs CoinGecko (ex: bitcoin,ethereum). Pode ser string CSV ou array.',
        oneOf: [
          { type: 'string' },
          {
            type: 'array',
            items: { type: 'string' }
          }
        ]
      },
      vsCurrencies: {
        description: 'Moedas de referência (ex: brl,usd). Pode ser string CSV ou array.',
        oneOf: [
          { type: 'string' },
          {
            type: 'array',
            items: { type: 'string' }
          }
        ]
      },
      includeMarketCap: {
        type: 'boolean',
        description: 'Inclui market cap no retorno. Padrão: true.'
      },
      include24hVol: {
        type: 'boolean',
        description: 'Inclui volume 24h no retorno. Padrão: true.'
      },
      include24hChange: {
        type: 'boolean',
        description: 'Inclui variação 24h no retorno. Padrão: true.'
      },
      includeLastUpdatedAt: {
        type: 'boolean',
        description: 'Inclui timestamp de atualização. Padrão: true.'
      }
    }
  }),
  execute: async ({
    ids,
    vsCurrencies,
    includeMarketCap = true,
    include24hVol = true,
    include24hChange = true,
    includeLastUpdatedAt = true
  }: {
    ids?: string | string[];
    vsCurrencies?: string | string[];
    includeMarketCap?: boolean;
    include24hVol?: boolean;
    include24hChange?: boolean;
    includeLastUpdatedAt?: boolean;
  }) => {
    const normalizeParam = (value: string | string[] | undefined, fallback: string): string => {
      if (typeof value === 'string') {
        return value;
      }
      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string' && item.trim().length > 0).join(',');
      }
      return fallback;
    };

    const idsParam = normalizeParam(ids, 'bitcoin,ethereum');
    const vsParam = normalizeParam(vsCurrencies, 'usd,brl');

    if (!idsParam || !vsParam) {
      throw new Error('Parâmetros ids e vsCurrencies não podem estar vazios.');
    }

    const searchParams = new URLSearchParams({
      ids: idsParam,
      vs_currencies: vsParam,
      include_market_cap: String(includeMarketCap),
      include_24hr_vol: String(include24hVol),
      include_24hr_change: String(include24hChange),
      include_last_updated_at: String(includeLastUpdatedAt)
    });

    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?${searchParams.toString()}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar a CoinGecko (status ${response.status}).`);
    }

    const rawData = (await response.json()) as Record<string, Record<string, number>>;

    const priceEntries: CoinGeckoSimplePriceEntry[] = [];

    const idList = idsParam.split(',').map((item) => item.trim()).filter(Boolean);
    const vsList = vsParam.split(',').map((item) => item.trim()).filter(Boolean);

    idList.forEach((assetId) => {
      const assetData = rawData?.[assetId];
      if (!assetData) {
        return;
      }

      vsList.forEach((vsCurrency) => {
        const priceKey = vsCurrency;
        const changeKey = `${vsCurrency}_24h_change`;
        const capKey = `${vsCurrency}_market_cap`;
        const volKey = `${vsCurrency}_24h_vol`;

        const entry: CoinGeckoSimplePriceEntry = {
          id: assetId,
          vsCurrency,
          price: typeof assetData?.[priceKey] === 'number' ? assetData[priceKey] : undefined,
          change24h: typeof assetData?.[changeKey] === 'number' ? assetData[changeKey] : undefined,
          marketCap: typeof (assetData as Record<string, number>)?.[capKey] === 'number' ? (assetData as Record<string, number>)[capKey] : undefined,
          volume24h: typeof (assetData as Record<string, number>)?.[volKey] === 'number' ? (assetData as Record<string, number>)[volKey] : undefined,
          lastUpdatedAt: typeof assetData?.last_updated_at === 'number' ? assetData.last_updated_at : undefined
        };

        priceEntries.push(entry);
      });
    });

    const highlight = priceEntries.slice(0, 3).map((entry) => `${entry.id}/${entry.vsCurrency}: ${entry.price ?? 'N/A'}`).join(', ');

    const summary =
      priceEntries.length > 0
        ? `CoinGecko retornou ${priceEntries.length} combinações (ativos: ${idList.join(', ')} | moedas: ${vsList.join(', ')}). Destaques: ${highlight}.`
        : 'Nenhuma cotação encontrada na CoinGecko para os parâmetros informados.';

    return {
      ids: idList,
      vsCurrencies: vsList,
      priceEntries,
      summary,
      fetchedAt: new Date().toISOString()
    };
  }
};

const cryptoCompareTopMarketCapTool: Tool<any, {
  limit: number;
  quoteCurrency: string;
  assets: CryptoCompareTopMarketCapNormalized[];
  summary: string;
  fetchedAt: string;
}> = {
  description: 'Busca os criptoativos com maior market cap via CryptoCompare.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'API Key da CryptoCompare (https://www.cryptocompare.com/).'
      },
      limit: {
        type: 'number',
        description: 'Quantidade de ativos a retornar. Padrão: 10.'
      },
      quoteCurrency: {
        type: 'string',
        description: 'Moeda de referência (ex: USD, BRL). Padrão: USD.'
      }
    }
  }),
  execute: async ({
    apiKey,
    limit = 10,
    quoteCurrency = 'USD'
  }: {
    apiKey?: string;
    limit?: number;
    quoteCurrency?: string;
  }) => {
    const normalizedLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    const normalizedQuote = (quoteCurrency ?? 'USD').toUpperCase();

    const params = new URLSearchParams({
      limit: String(normalizedLimit),
      tsym: normalizedQuote
    });

    const headers: Record<string, string> = {
      Accept: 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Apikey ${apiKey}`;
    }

    const response = await fetch(`https://min-api.cryptocompare.com/data/top/mktcapfull?${params.toString()}`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar a CryptoCompare (status ${response.status}).`);
    }

    const rawData = (await response.json()) as {
      Data?: CryptoCompareTopMarketCapItem[];
      Message?: string;
      Type?: number;
    };

    if (rawData?.Type === 99) {
      throw new Error(`Erro da CryptoCompare: ${rawData?.Message ?? 'mensagem não informada.'}`);
    }

    const items = Array.isArray(rawData?.Data) ? rawData.Data : [];

    const assets: CryptoCompareTopMarketCapNormalized[] = items.map((item) => {
      const coinInfo = item.coinInfo ?? {};
      const rawQuote = item.raw?.[normalizedQuote] ?? {};

      return {
        id: coinInfo.Id ?? '',
        symbol: coinInfo.Name ?? '',
        name: coinInfo.FullName ?? coinInfo.Internal ?? coinInfo.Name ?? '',
        price: typeof rawQuote.PRICE === 'number' ? rawQuote.PRICE : undefined,
        change24h: typeof rawQuote.CHANGEPCT24HOUR === 'number' ? rawQuote.CHANGEPCT24HOUR : undefined,
        marketCap: typeof rawQuote.MKTCAP === 'number' ? rawQuote.MKTCAP : undefined,
        volume24h: typeof rawQuote.TOTALVOLUME24H === 'number' ? rawQuote.TOTALVOLUME24H : undefined,
        supply: typeof rawQuote.SUPPLY === 'number' ? rawQuote.SUPPLY : undefined,
        quoteCurrency: normalizedQuote,
        lastUpdate: typeof rawQuote.LASTUPDATE === 'number' ? rawQuote.LASTUPDATE : undefined
      };
    }).filter((asset) => asset.symbol);

    const highlights = assets.slice(0, 3).map((asset) => `${asset.symbol}: ${asset.price ?? 'N/A'} ${normalizedQuote}`).join(', ');

    const summary =
      assets.length > 0
        ? `CryptoCompare retornou ${assets.length} ativos ordenados por market cap em ${normalizedQuote}. Destaques: ${highlights}.`
        : 'Nenhum ativo retornado pela CryptoCompare para os parâmetros informados.';

    return {
      limit: normalizedLimit,
      quoteCurrency: normalizedQuote,
      assets,
      summary,
      fetchedAt: new Date().toISOString()
    };
  }
};

const binanceTicker24hTool: Tool<any, {
  symbol: string;
  ticker: {
    symbol: string;
    priceChange?: number;
    priceChangePercent?: number;
    weightedAvgPrice?: number;
    lastPrice?: number;
    lastQty?: number;
    bidPrice?: number;
    askPrice?: number;
    openPrice?: number;
    highPrice?: number;
    lowPrice?: number;
    volume?: number;
    quoteVolume?: number;
    openTime?: number;
    closeTime?: number;
    count?: number;
  };
  summary: string;
  fetchedAt: string;
}> = {
  description: 'Consulta estatísticas de 24h para um par spot na Binance.',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Símbolo no formato usado pela Binance (ex: BTCUSDT).'
      }
    },
    required: ['symbol']
  }),
  execute: async ({ symbol }: { symbol: string }) => {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('O símbolo informado é inválido.');
    }

    const normalizedSymbol = symbol.toUpperCase();
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(normalizedSymbol)}`);

    if (!response.ok) {
      throw new Error(`Falha ao consultar a Binance (status ${response.status}).`);
    }

    const data = (await response.json()) as BinanceTicker24h & { code?: number; msg?: string };

    if (typeof data?.code === 'number' && data.code !== 200) {
      throw new Error(`Erro da Binance: ${data.msg ?? 'mensagem não informada.'}`);
    }

    const parseFloatSafe = (value?: string) => {
      if (typeof value !== 'string') {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const ticker = {
      symbol: data.symbol ?? normalizedSymbol,
      priceChange: parseFloatSafe(data.priceChange),
      priceChangePercent: parseFloatSafe(data.priceChangePercent),
      weightedAvgPrice: parseFloatSafe(data.weightedAvgPrice),
      lastPrice: parseFloatSafe(data.lastPrice),
      lastQty: parseFloatSafe(data.lastQty),
      bidPrice: parseFloatSafe(data.bidPrice),
      askPrice: parseFloatSafe(data.askPrice),
      openPrice: parseFloatSafe(data.openPrice),
      highPrice: parseFloatSafe(data.highPrice),
      lowPrice: parseFloatSafe(data.lowPrice),
      volume: parseFloatSafe(data.volume),
      quoteVolume: parseFloatSafe(data.quoteVolume),
      openTime: typeof data.openTime === 'number' ? data.openTime : undefined,
      closeTime: typeof data.closeTime === 'number' ? data.closeTime : undefined,
      count: typeof data.count === 'number' ? data.count : undefined
    };

    const summary = `24h ${ticker.symbol}: preço atual ${ticker.lastPrice ?? 'N/A'}, variação ${ticker.priceChangePercent ?? 'N/A'}%.`;

    return {
      symbol: ticker.symbol,
      ticker,
      summary,
      fetchedAt: new Date().toISOString()
    };
  }
};

export const TOOL_REGISTRY: Record<string, Tool<any, any>> = {
  calc_compound_interest: calcCompoundInterestTool,
  budget_planner: budgetPlannerTool,
  crypto_risk_pulse: cryptoRiskPulseTool,
  brapi_finance_top_volume: brapiFinanceTopVolumeTool,
  awesome_currency_rates: awesomeCurrencyRatesTool,
  coingecko_simple_price: coingeckoSimplePriceTool,
  cryptocompare_top_marketcap: cryptoCompareTopMarketCapTool,
  binance_ticker_24h: binanceTicker24hTool
};

export function buildToolset(toolNames?: string[]): Record<string, Tool<any, any>> | undefined {
  if (!toolNames || toolNames.length === 0) {
    return undefined;
  }

  return toolNames.reduce<Record<string, Tool<any, any>>>((acc, name) => {
    const toolDefinition = TOOL_REGISTRY[name];
    if (toolDefinition) {
      acc[name] = toolDefinition;
    }
    return acc;
  }, {});
}