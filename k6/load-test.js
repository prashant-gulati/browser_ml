// k6 load test for browser-ml.html static hosting layer.
//
// Tests the static file server only — not the in-browser ML inference,
// which runs entirely on the client side.
//
// Install k6: https://k6.io/docs/getting-started/installation/
//
// Run against local dev server:
//   k6 run k6/load-test.js
//
// Run against deployed Netlify URL:
//   k6 run --env BASE_URL=https://prashantgulati.netlify.app k6/load-test.js
//
// Netlify free tier will rate-limit / reset connections above ~10 VUs.
// The profile auto-scales based on whether BASE_URL is set.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const pageLoadTime = new Trend('page_load_time', true);
const errorRate    = new Rate('error_rate');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Use a lighter profile for production (Netlify CDN rate-limits at high concurrency).
// Local dev server can handle the heavier profile.
const isProduction = BASE_URL.startsWith('https://');

export const options = isProduction
  ? {
      // Conservative profile for Netlify / any CDN-fronted host.
      // Stays well below the rate-limit threshold (~10 VUs on free tier).
      stages: [
        { duration: '30s', target: 3  },   // ramp up gently
        { duration: '1m',  target: 8  },   // hold at 8 VUs
        { duration: '30s', target: 0  },   // ramp down
      ],
      thresholds: {
        http_req_failed:   ['rate<0.05'],    // allow up to 5% — CDN may 429 briefly
        http_req_duration: ['p(95)<3000'],   // CDN adds latency vs local
        error_rate:        ['rate<0.05'],
      },
    }
  : {
      // Aggressive profile for local dev server.
      stages: [
        { duration: '30s', target: 10 },   // ramp up to 10 VUs
        { duration: '1m',  target: 50 },   // ramp to 50 VUs
        { duration: '2m',  target: 50 },   // hold at 50 VUs
        { duration: '30s', target: 0  },   // ramp down
      ],
      thresholds: {
        http_req_failed:   ['rate<0.01'],    // <1% HTTP errors
        http_req_duration: ['p(95)<2000'],   // 95th percentile < 2s
        error_rate:        ['rate<0.01'],
      },
    };

export default function () {
  const res = http.get(`${BASE_URL}/browser-ml.html`, {
    headers: { 'Accept': 'text/html' },
  });

  const ok = check(res, {
    'status is 200':              r => r.status === 200,
    'contains Browser ML Playground': r => r.body != null && r.body.includes('Browser ML Playground'),
    'contains all 7 backends':    r => r.body != null && ['blazeface', 'mediapipe', 'cocossd', 'posenet',
                                        'handpose', 'bodypix', 'facemesh']
                                        .every(b => r.body.includes(b)),
    'response under 100KB':       r => r.body != null && r.body.length < 102_400,
    'content-type is html':       r => (r.headers['Content-Type'] || '').includes('text/html'),
  });

  pageLoadTime.add(res.timings.duration);
  errorRate.add(!ok);

  // Longer think-time in production to reduce request rate further.
  sleep(isProduction ? 2 : 1);
}
