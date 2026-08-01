// ============================================================================
// CryptoTrader Pro — Core TypeScript Types & Interfaces
// ============================================================================

// ─── OHLCV Data ─────────────────────────────────────────────────────────────

export interface Candle {
  time: number;        // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
};

// ─── Indicator Results ──────────────────────────────────────────────────────

export interface RSIResult {
  values: number[];
  current: number;
  isOversold: boolean;   // < 30
  isOverbought: boolean; // > 70
}

export interface MACDResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
  currentMACD: number;
  currentSignal: number;
  currentHistogram: number;
  isBullishCross: boolean;
  isBearishCross: boolean;
}

export interface EMAResult {
  values: number[];
  current: number;
}

export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
  width: number[];
  currentUpper: number;
  currentMiddle: number;
  currentLower: number;
  currentWidth: number;
}

export interface ATRResult {
  values: number[];
  current: number;
}

export interface VWAPResult {
  values: number[];
  current: number;
}

export interface StochRSIResult {
  k: number[];
  d: number[];
  currentK: number;
  currentD: number;
  isOversold: boolean;
  isOverbought: boolean;
}

export interface ADXResult {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
  currentADX: number;
  currentPlusDI: number;
  currentMinusDI: number;
  isTrending: boolean;    // ADX > 25
  isStrongTrend: boolean; // ADX > 40
}

export interface OBVResult {
  values: number[];
  current: number;
}

export interface MFIResult {
  values: number[];
  current: number;
  isOversold: boolean;
  isOverbought: boolean;
}

export interface IchimokuResult {
  tenkanSen: number[];     // Conversion Line
  kijunSen: number[];      // Base Line
  senkouSpanA: number[];   // Leading Span A
  senkouSpanB: number[];   // Leading Span B
  chikouSpan: number[];    // Lagging Span
  isAboveCloud: boolean;
  isBelowCloud: boolean;
  isInsideCloud: boolean;
}

// ─── Market Structure ───────────────────────────────────────────────────────

export type SwingPointType = 'HH' | 'HL' | 'LH' | 'LL';
export type TrendDirection = 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
export type StructureBreak = 'BOS' | 'CHoCH' | null;

export interface SwingPoint {
  type: SwingPointType;
  price: number;
  index: number;
  time: number;
}

export interface MarketStructureResult {
  swingPoints: SwingPoint[];
  trend: TrendDirection;
  lastBOS: StructureBreak;
  bosIndex: number | null;
  bosPrice: number | null;
}

// ─── Support & Resistance ───────────────────────────────────────────────────

export interface SRLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;          // Number of touches
  isZone: boolean;
  zoneHigh?: number;
  zoneLow?: number;
  isFlipZone: boolean;       // Was support, became resistance (or vice versa)
}

export interface SupplyDemandZone {
  type: 'supply' | 'demand';
  high: number;
  low: number;
  strength: number;          // 0-100
  isFresh: boolean;          // Never retested
  testCount: number;
  departureSpeed: number;    // How fast price left the zone
}

// ─── Candlestick & Chart Patterns ───────────────────────────────────────────

export type CandlestickPatternName =
  | 'HAMMER' | 'INVERTED_HAMMER' | 'SHOOTING_STAR'
  | 'DOJI' | 'DRAGONFLY_DOJI' | 'GRAVESTONE_DOJI'
  | 'BULLISH_ENGULFING' | 'BEARISH_ENGULFING'
  | 'MORNING_STAR' | 'EVENING_STAR'
  | 'THREE_WHITE_SOLDIERS' | 'THREE_BLACK_CROWS'
  | 'INSIDE_BAR' | 'PIN_BAR'
  | 'BULLISH_HARAMI' | 'BEARISH_HARAMI'
  | 'TWEEZER_TOP' | 'TWEEZER_BOTTOM';

export type ChartPatternName =
  | 'DOUBLE_TOP' | 'DOUBLE_BOTTOM'
  | 'HEAD_AND_SHOULDERS' | 'INVERSE_HEAD_AND_SHOULDERS'
  | 'ASCENDING_TRIANGLE' | 'DESCENDING_TRIANGLE' | 'SYMMETRICAL_TRIANGLE'
  | 'RISING_WEDGE' | 'FALLING_WEDGE'
  | 'BULL_FLAG' | 'BEAR_FLAG'
  | 'PENNANT' | 'CUP_AND_HANDLE';

export interface PatternDetection {
  name: CandlestickPatternName | ChartPatternName;
  signal: 'BULLISH' | 'BEARISH';
  confidence: number;          // 0-100
  index: number;               // Candle index where detected
  targetPrice?: number;        // Measured move target
  invalidationPrice?: number;  // Where pattern fails
}

// ─── Smart Money Concepts ───────────────────────────────────────────────────

export interface OrderBlock {
  type: 'BULLISH' | 'BEARISH';
  high: number;
  low: number;
  index: number;
  time: number;
  isMitigated: boolean;       // Partially filled
  isBreaker: boolean;         // Failed OB → opposite zone
}

export interface FairValueGap {
  type: 'BULLISH' | 'BEARISH';
  high: number;
  low: number;
  index: number;
  time: number;
  isFilled: boolean;
}

export interface LiquiditySweep {
  type: 'BUY_SIDE' | 'SELL_SIDE';
  price: number;
  index: number;
  time: number;
}

export interface SMCResult {
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquiditySweeps: LiquiditySweep[];
  premiumZone: { high: number; low: number };
  discountZone: { high: number; low: number };
  equilibrium: number;
}

// ─── Fibonacci ──────────────────────────────────────────────────────────────

export interface FibonacciLevel {
  ratio: number;
  price: number;
  label: string;
  isGoldenZone: boolean;
}

export interface FibonacciResult {
  retracement: FibonacciLevel[];
  extension: FibonacciLevel[];
  swingHigh: number;
  swingLow: number;
  goldenZoneHigh: number;    // 0.618 price
  goldenZoneLow: number;     // 0.786 price
  trend: 'UP' | 'DOWN';
}

// ─── Volume Analysis ────────────────────────────────────────────────────────

export interface VolumeProfileLevel {
  price: number;
  volume: number;
  isHVN: boolean;    // High Volume Node
  isLVN: boolean;    // Low Volume Node
  isPOC: boolean;    // Point of Control
}

export interface VolumeProfileResult {
  levels: VolumeProfileLevel[];
  poc: number;       // Point of Control price
  vah: number;       // Value Area High
  val: number;       // Value Area Low
}

export interface CVDResult {
  values: number[];
  current: number;
  trend: 'RISING' | 'FALLING' | 'FLAT';
}

// ─── Order Book ─────────────────────────────────────────────────────────────

export interface OrderBookWall {
  price: number;
  size: number;
  type: 'BID' | 'ASK';
  isWhale: boolean;     // > $500K
}

export interface OrderBookAnalysis {
  bidAskRatio: number;  // > 1 = more buyers
  walls: OrderBookWall[];
  imbalance: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  totalBidVolume: number;
  totalAskVolume: number;
}

// ─── Futures Sentiment ──────────────────────────────────────────────────────

export interface FuturesSentiment {
  longShortRatio: number;
  fundingRate: number;
  openInterest: number;
  oiChange24h: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'EXTREME_BULLISH' | 'EXTREME_BEARISH';
  isOverLeveragedLong: boolean;
  isOverLeveragedShort: boolean;
}

// ─── Market Correlation ─────────────────────────────────────────────────────

export interface MarketCorrelation {
  btcDominance: number;
  btcDomChange24h: number;
  usdtDominance: number;
  isAltseason: boolean;
  btcTrend: TrendDirection;
  marketPhase: 'BTC_ONLY' | 'ALTSEASON' | 'EVERYTHING_DOWN' | 'MIXED';
}

// ─── Fear & Greed ───────────────────────────────────────────────────────────

export interface FearGreedData {
  value: number;          // 0-100
  classification: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
  timestamp: number;
}

// ─── Divergence ─────────────────────────────────────────────────────────────

export interface Divergence {
  type: 'BULLISH' | 'BEARISH';
  indicator: 'RSI' | 'OBV' | 'MFI' | 'MACD';
  startIndex: number;
  endIndex: number;
  confidence: number;
}

// ─── Session Trading ────────────────────────────────────────────────────────

export type TradingSession = 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP';

export interface SessionInfo {
  current: TradingSession;
  advice: string;
  volatilityExpected: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ─── Signal System ──────────────────────────────────────────────────────────

export type SignalGrade = 'A' | 'B' | 'C' | 'NONE';
export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';

export interface LayerResult {
  name: string;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;   // 0-100
  details: string;
}

export interface Signal {
  id: string;
  coin: string;
  timeframe: Timeframe;
  direction: SignalDirection;
  grade: SignalGrade;
  confidence: number;        // 0-100
  layersAgreed: number;      // out of 12
  layers: LayerResult[];

  entryPriceLow: number;
  entryPriceHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskRewardRatio: number;

  candlePatterns: PatternDetection[];
  chartPatterns: PatternDetection[];

  timestamp: number;
  expiresAt: number;
  status: 'ACTIVE' | 'EXPIRED' | 'HIT_TP' | 'HIT_SL';
}

// ─── Risk Management ────────────────────────────────────────────────────────

export interface RiskSettings {
  totalCapital: number;
  riskPerTrade: number;       // percentage (e.g., 2)
  maxDailyLoss: number;       // percentage (e.g., 5)
  maxWeeklyLoss: number;      // percentage (e.g., 10)
  maxConcurrentPositions: number;
  minRiskReward: number;      // e.g., 2 for 1:2
  cooldownMinutes: number;    // after loss
  maxTradesPerDay: number;
}

export interface PositionSize {
  coins: number;
  dollarAmount: number;
  riskDollars: number;
  stopLossDistance: number;
}

// ─── Trade Journal ──────────────────────────────────────────────────────────

export interface Trade {
  id: string;
  coin: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  entryTime: number;
  exitTime: number | null;
  stopLoss: number;
  takeProfit: number;
  pnl: number | null;
  pnlPercent: number | null;
  status: 'OPEN' | 'CLOSED_TP' | 'CLOSED_SL' | 'CLOSED_MANUAL';
  signalGrade: SignalGrade;
  notes: string;
  emotionTag: 'CONFIDENT' | 'FEARFUL' | 'GREEDY' | 'NEUTRAL' | 'FOMO' | 'REVENGE';
}

// ─── Psychology ─────────────────────────────────────────────────────────────

export interface PsychologyAlert {
  type: 'FOMO' | 'REVENGE' | 'OVERTRADING' | 'GREED' | 'FEAR';
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: number;
}

export interface DisciplineScore {
  score: number;             // 0-100
  rulesFollowed: number;
  rulesTotal: number;
  details: {
    enteredAtSignalPrice: boolean;
    honoredStopLoss: boolean;
    tookTakeProfit: boolean;
    didNotOvertrade: boolean;
    waitedForSignal: boolean;
  };
}

// ─── Trading Plan ───────────────────────────────────────────────────────────

export interface DailyPlan {
  date: string;
  bias: TrendDirection;
  keyLevels: number[];
  maxTrades: number;
  sessionsToTrade: TradingSession[];
  checklist: { item: string; completed: boolean }[];
  notes: string;
}

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  disciplineScore: number;
  lessonsLearned: string;
}

// ─── Coin / Watchlist ───────────────────────────────────────────────────────

export interface WatchlistCoin {
  symbol: string;           // e.g., 'ETHUSDT'
  name: string;             // e.g., 'Ethereum'
  currentPrice: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  signalGrade: SignalGrade;
  signalDirection: SignalDirection;
  dailyRange: number;       // Daily high-low range in $
}

export const DEFAULT_WATCHLIST: string[] = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT',
  'DOGEUSDT', 'SHIBUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'SUIUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT',
];

// ─── App State ──────────────────────────────────────────────────────────────

export interface AppSettings {
  watchlist: string[];
  selectedCoin: string;
  selectedTimeframe: Timeframe;
  riskSettings: RiskSettings;
  indicatorSettings: {
    emaPeriods: number[];
    rsiPeriod: number;
    macdFast: number;
    macdSlow: number;
    macdSignal: number;
    bbPeriod: number;
    bbStdDev: number;
    ichimokuTenkan: number;
    ichimokuKijun: number;
    ichimokuSenkou: number;
    atrPeriod: number;
  };
  signalSettings: {
    minGrade: SignalGrade;
    requireVolumeConfirmation: boolean;
    requireMTFAlignment: boolean;
  };
  telegramChatId: string;
  telegramBotToken: string;
  geminiApiKey: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  watchlist: [...DEFAULT_WATCHLIST],
  selectedCoin: 'BTCUSDT',
  selectedTimeframe: '1h',
  riskSettings: {
    totalCapital: 1000,
    riskPerTrade: 2,
    maxDailyLoss: 5,
    maxWeeklyLoss: 10,
    maxConcurrentPositions: 3,
    minRiskReward: 2,
    cooldownMinutes: 30,
    maxTradesPerDay: 5,
  },
  indicatorSettings: {
    emaPeriods: [20, 50, 100, 200],
    rsiPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    bbPeriod: 20,
    bbStdDev: 2,
    ichimokuTenkan: 10,
    ichimokuKijun: 30,
    ichimokuSenkou: 60,
    atrPeriod: 14,
  },
  signalSettings: {
    minGrade: 'B',
    requireVolumeConfirmation: true,
    requireMTFAlignment: true,
  },
  telegramChatId: '',
  telegramBotToken: '',
  geminiApiKey: '',
};
