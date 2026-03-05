import { describe, expect, it } from 'vitest';
import {
  getActivitySportType,
  getStravaErrorDetails,
} from '../../../src/services/strava-sdk';

describe('strava-sdk helpers', () => {
  describe('getActivitySportType', () => {
    it('prefers sport_type when available', () => {
      expect(
        getActivitySportType({
          sport_type: 'GravelRide',
          type: 'Ride',
        }),
      ).toBe('GravelRide');
    });

    it('falls back to legacy type and trims values', () => {
      expect(
        getActivitySportType({
          sport_type: '   ',
          type: '  Ride  ',
        }),
      ).toBe('Ride');
    });

    it('returns null when neither value is a non-empty string', () => {
      expect(
        getActivitySportType({
          sport_type: null,
          type: undefined,
        }),
      ).toBeNull();
    });
  });

  describe('getStravaErrorDetails', () => {
    it('extracts status and message from axios error response.message', () => {
      const error = {
        isAxiosError: true,
        message: 'fallback message',
        response: {
          status: 503,
          data: { message: 'service unavailable' },
        },
      };

      expect(getStravaErrorDetails(error)).toEqual({
        status: 503,
        message: 'service unavailable',
      });
    });

    it('extracts message from axios response.error and handles missing status', () => {
      const error = {
        isAxiosError: true,
        message: 'fallback message',
        response: {
          data: { error: 'token expired' },
        },
      };

      expect(getStravaErrorDetails(error)).toEqual({
        status: null,
        message: 'token expired',
      });
    });

    it('extracts message from axios response.errors array', () => {
      const error = {
        isAxiosError: true,
        message: 'fallback message',
        response: {
          status: 400,
          data: {
            errors: [
              { message: 'invalid athlete' },
              { code: 'bad_request' },
              'missing scope',
            ],
          },
        },
      };

      expect(getStravaErrorDetails(error)).toEqual({
        status: 400,
        message: 'invalid athlete; bad_request; missing scope',
      });
    });

    it('uses object error fields for non-axios errors', () => {
      const error = {
        status: 429,
        message: 'rate limited',
        response: {
          status: 500,
          data: { message: 'ignored because status/message already present' },
        },
      };

      expect(getStravaErrorDetails(error)).toEqual({
        status: 429,
        message: 'ignored because status/message already present',
      });
    });

    it('falls back to generic message for unknown object payload', () => {
      const error = {
        response: {
          status: 401,
          data: { errors: [{}, 123] },
        },
        message: '   ',
      };

      expect(getStravaErrorDetails(error)).toEqual({
        status: 401,
        message: 'Unknown Strava error',
      });
    });

    it('handles primitive and Error instances in final fallback', () => {
      expect(getStravaErrorDetails(new Error('boom'))).toEqual({
        status: null,
        message: 'boom',
      });

      expect(getStravaErrorDetails('raw error')).toEqual({
        status: null,
        message: 'raw error',
      });
    });
  });
});
