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
// Run against deployed URL:
//   k6 run --env BASE_URL=https://your-app.netlify.app k6/load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const pageLoadTime = new Trend('page_load_time', true);
const errorRate    = new Rate('error_rate');

export const options = {
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

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const res = http.get(`${BASE_URL}/browser-ml.html`, {
    headers: { 'Accept': 'text/html' },
  });

  const ok = check(res, {
    'status is 200':              r => r.status === 200,
    'contains Browser ML Playground': r => r.body.includes('Browser ML Playground'),
    'contains all 7 backends':    r => ['blazeface', 'mediapipe', 'cocossd', 'posenet',
                                        'handpose', 'bodypix', 'facemesh']
                                        .every(b => r.body.includes(b)),
    'response under 100KB':       r => r.body.length < 102_400,
    'content-type is html':       r => (r.headers['Content-Type'] || '').includes('text/html'),
  });

  pageLoadTime.add(res.timings.duration);
  errorRate.add(!ok);

  sleep(1);
}
