# Plan: Dominus Memory Engine v1 (FSRS v4)

Implement the FSRS v4 algorithm to power the spaced repetition system, transforming cognitive evidence into structured memory states and determining the next review date.

## 1. Database Schema Evolution
- Auditing and adapting `memory_states` table to support FSRS fields:
    - stability, difficulty, due, last_review, reps, lapses, state, scheduled_days, elapsed_days.
    - algorithm_version, algorithm_name.
- Updating RLS and Grants.

## 2. Core Engine Implementation (`src/lib/memory/fsrs/`)
- `types.ts`: FSRS states (New, Learning, Review, Relearning) and ratings.
- `constants.ts`: Default FSRS parameters (Retention 0.9, Max Interval 36500).
- `math.ts`: Spacing and interval calculations.
- `scheduler.ts`: Main logic for computing next state based on current state and rating.
- `adapter.ts`: Mapping Dominus evidence (result + confidence) to FSRS ratings.

## 3. Backend Integration (Server Functions & RPC)
- `rebuildMemoryState`: Function to reconstruct the entire state from immutable history.
- `applyReview`: Atomic update function called when a new evidence is recorded.
- Ensuring deterministic calculations and idempotency.

## 4. Frontend Hooks & API
- `useMemoryState`: Refined to return FSRS-aware data.
- `useDueReviews`: Hook to fetch concepts currently due for review.
- Adapting the "Review" area to use the new "due" logic.

## 5. Verification & Testing
- Unit tests for the FSRS math and scheduler.
- Integration tests for state reconstruction.
- Mismatch detection (High confidence + failure).

## Technical Details
- **Algorithm**: FSRS v4 (DSR model).
- **Mapping Strategy**:
    - Correct + Conf 4 -> Good/Easy.
    - Correct + Conf <4 -> Hard.
    - Partial -> Hard/Again.
    - Incorrect -> Again.
- **Persistence**: Calculations happen at review time or rebuild time, never per-render.
- **Safety**: Preservation of existing RLS policies and `cognitive_evidences` immutability.
