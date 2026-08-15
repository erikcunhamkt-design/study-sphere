import { FSRSParameters } from "./types";

/**
 * FSRS v4 Default Parameters
 * Based on official FSRS v4 research.
 */
export const DEFAULT_W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34,
  1.26, 0.29, 2.61,
];

export const DEFAULT_PARAMS: FSRSParameters = {
  request_retention: 0.9,
  max_interval: 36500,
  w: DEFAULT_W,
};

export const ALGORITHM_NAME = "fsrs";
export const ALGORITHM_VERSION = "fsrs_v4";
