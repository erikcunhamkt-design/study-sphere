import { Card, FSRSParameters, Rating, State } from "./types";

export class FSRSMath {
  private p: FSRSParameters;

  constructor(params: FSRSParameters) {
    this.p = params;
  }

  init_stability(r: Rating): number {
    return Math.max(this.p.w[r - 1], 0.1);
  }

  init_difficulty(r: Rating): number {
    return Math.min(Math.max(this.p.w[4] - this.p.w[5] * (r - 3), 1), 10);
  }

  next_difficulty(d: number, r: Rating): number {
    const next_d = d - this.p.w[6] * (r - 3);
    return Math.min(Math.max(this.mean_reversion(this.p.w[4], next_d), 1), 10);
  }

  mean_reversion(init: number, current: number): number {
    return this.p.w[7] * init + (1 - this.p.w[7]) * current;
  }

  next_recall_stability(d: number, s: number, r: number, rating: Rating): number {
    const hard_penalty = rating === Rating.Hard ? this.p.w[15] : 1;
    const easy_bonus = rating === Rating.Easy ? this.p.w[16] : 1;
    return (
      s *
      (1 +
        Math.exp(this.p.w[8]) *
          (11 - d) *
          Math.pow(s, -this.p.w[9]) *
          (Math.exp(this.p.w[10] * (1 - r)) - 1) *
          hard_penalty *
          easy_bonus)
    );
  }

  next_forget_stability(d: number, s: number, r: number): number {
    return (
      this.p.w[11] *
      Math.pow(d, -this.p.w[12]) *
      (Math.pow(s + 1, this.p.w[13]) - 1) *
      Math.exp(this.p.w[14] * (1 - r))
    );
  }

  constrained_interval(stability: number): number {
    const interval = Math.max(1, Math.round(stability * Math.log(this.p.request_retention) / Math.log(0.9)));
    return Math.min(interval, this.p.max_interval);
  }
}
