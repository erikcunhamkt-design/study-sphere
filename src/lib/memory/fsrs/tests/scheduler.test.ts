import { describe, it, expect } from "vitest";
import { FSRSScheduler, DEFAULT_PARAMS, State, Rating, Card } from "../index";

describe("FSRSScheduler", () => {
  const scheduler = new FSRSScheduler(DEFAULT_PARAMS);
  const now = new Date("2026-08-15T12:00:00Z");

  const initialCard: Card = {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
  };

  it("should handle new card - Good rating", () => {
    const record = scheduler.repeat(initialCard, now);
    const result = record[Rating.Good].card;
    
    expect(result.state).toBe(State.Review);
    expect(result.reps).toBe(1);
    expect(result.stability).toBeGreaterThan(0);
    expect(result.difficulty).toBeGreaterThan(0);
    expect(result.scheduled_days).toBeGreaterThan(0);
    expect(result.due.getTime()).toBeGreaterThan(now.getTime());
  });

  it("should handle new card - Again rating", () => {
    const record = scheduler.repeat(initialCard, now);
    const result = record[Rating.Again].card;
    
    expect(result.state).toBe(State.Learning);
    expect(result.reps).toBe(1);
    expect(result.scheduled_days).toBe(1);
  });

  it("should increase interval for successive Good ratings", () => {
    let card = initialCard;
    
    // First review
    let record = scheduler.repeat(card, now);
    card = record[Rating.Good].card;
    const firstInterval = card.scheduled_days;

    // Second review (simulated 4 days later)
    const later = new Date(now);
    later.setDate(later.getDate() + 4);
    record = scheduler.repeat(card, later);
    card = record[Rating.Good].card;
    
    expect(card.scheduled_days).toBeGreaterThan(firstInterval);
    expect(card.reps).toBe(2);
  });

  it("should handle lapse (Review -> Again)", () => {
    const record1 = scheduler.repeat(initialCard, now);
    const reviewCard = record1[Rating.Good].card;
    
    const record2 = scheduler.repeat(reviewCard, now);
    const lapsedCard = record2[Rating.Again].card;
    
    expect(lapsedCard.state).toBe(State.Relearning);
    expect(lapsedCard.lapses).toBe(1);
  });
});
