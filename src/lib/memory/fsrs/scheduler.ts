import { Card, FSRSParameters, Rating, RecordLog, State } from "./types";
import { FSRSMath } from "./math";

export class FSRSScheduler {
  private math: FSRSMath;

  constructor(params: FSRSParameters) {
    this.math = new FSRSMath(params);
  }

  repeat(card: Card, now: Date): RecordLog {
    card = { ...card };
    if (card.state === State.New) {
      card.elapsed_days = 0;
    } else {
      card.elapsed_days = Math.max(0, Math.floor((now.getTime() - new Date(card.last_review!).getTime()) / (24 * 60 * 60 * 1000)));
    }
    card.last_review = now;
    card.reps += 1;

    const record: RecordLog = {};
    for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      record[r] = this.step(card, now, r);
    }
    return record;
  }

  private step(card: Card, now: Date, rating: Rating): { card: Card; review_log: any } {
    const next_card = { ...card };
    let next_s = 0;
    let next_d = 0;

    if (card.state === State.New) {
      next_s = this.math.init_stability(rating);
      next_d = this.math.init_difficulty(rating);
      next_card.state = rating === Rating.Again ? State.Learning : State.Review;
    } else if (card.state === State.Learning || card.state === State.Relearning) {
      if (rating === Rating.Again) {
        next_s = card.stability * 0.25;
        next_d = this.math.next_difficulty(card.difficulty, rating);
      } else if (rating === Rating.Hard) {
        next_s = card.stability * 0.5;
        next_d = this.math.next_difficulty(card.difficulty, rating);
      } else {
        next_s = this.math.init_stability(rating) * (card.reps + 1);
        next_d = this.math.init_difficulty(rating);
        next_card.state = State.Review;
      }
    } else { // Review
      // If reviewed on the same day, elapsed_days might be 0.
      // For audit purposes, we treat sub-day reviews as having at least some progress
      // but FSRS normally expects days.
      const elapsed = Math.max(card.elapsed_days, 0.1); 
      const r = Math.exp(Math.log(0.9) * elapsed / card.stability);
      
      if (rating === Rating.Again) {
        next_s = this.math.next_forget_stability(card.difficulty, card.stability, r);
        next_d = this.math.next_difficulty(card.difficulty, rating);
        next_card.lapses += 1;
        next_card.state = State.Relearning;
      } else {
        next_s = this.math.next_recall_stability(card.difficulty, card.stability, r, rating);
        next_d = this.math.next_difficulty(card.difficulty, rating);
      }
    }

    next_card.stability = next_s;
    next_card.difficulty = next_d;
    next_card.scheduled_days = this.math.constrained_interval(next_s);
    const due = new Date(now);
    due.setDate(due.getDate() + next_card.scheduled_days);
    next_card.due = due;

    return {
      card: next_card,
      review_log: {
        rating,
        scheduled_days: next_card.scheduled_days,
        elapsed_days: card.elapsed_days,
        review: now,
        state: card.state,
      },
    };
  }
}
