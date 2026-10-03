export interface Asset {
  ticker: string;
  name: string;
  asset_class: string;
  sector: string;
  weight: number;
}
export interface Portfolio {
  name: string;
  currency: string;
  data_source: string;
  notice: string;
  assets: Asset[];
}
export interface Risk {
  data_source: string;
  notice: string;
  period: { start: string; end: string; return_observations: number };
  assumptions: { currency: string; annualization_factor: number; confidence: number; risk_horizon_days: number; rebalancing: string; costs_included: boolean };
  metrics: { total_return: number; annualized_volatility: number; max_drawdown: number; historical_var: number; historical_expected_shortfall: number; concentration_hhi: number };
  weights: Record<string, number>;
  correlation: Record<string, Record<string, number | null>>;
  equity_curve: { date: string; value: number }[];
}
