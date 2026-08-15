/**
 * FSRS v4 States
 */
export enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

/**
 * FSRS v4 Ratings
 */
export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface FSRSParameters {
  request_retention: number;
  max_interval: number;
  w: number[];
}

export interface Card {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: Date;
}

export interface ReviewLog {
  rating: Rating;
  scheduled_days: number;
  elapsed_days: number;
  review: Date;
  state: State;
}

export interface SchedulingInfo {
  card: Card;
  review_log: ReviewLog;
}

export interface RecordLog {
  [key: number]: SchedulingInfo;
}
