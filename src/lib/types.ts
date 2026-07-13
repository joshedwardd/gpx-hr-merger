export interface TrackPoint {
  /** epoch ms */
  t: number;
  lat?: number;
  lon?: number;
  ele?: number;
  hr?: number;
  cad?: number;
}

export type ParseErrorCode = 'invalid-xml' | 'unknown-format' | 'no-points';

export class ParseError extends Error {
  constructor(
    public readonly code: ParseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export interface ParseSummary {
  totalPoints: number;
  withGps: number;
  withHr: number;
  durationMs: number;
}

export interface ParseResult {
  points: TrackPoint[];
  summary: ParseSummary;
}

export interface MergedPoint extends TrackPoint {
  lat: number;
  lon: number;
}

export interface MergeResult {
  points: MergedPoint[];
  /** fraction of GPS points that received an HR value, 0..1 */
  coverage: number;
}
