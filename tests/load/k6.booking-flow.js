/**
 * @file k6.booking-flow.js
 * @description k6 load test for PawRoute API — booking flow at 500 VUs.
 *
 * Run:
 *   k6 run tests/load/k6.booking-flow.js \
 *     -e API_URL=http://localhost:3000 \
 *     -e TEST_EMAIL=loadtest@pawroute.com \
 *     -e TEST_PASSWORD=LoadTest123!
 *
 * Target: p95 < 500ms at 500 VUs sustained for 5 minutes.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const bookingDuration = new Trend('booking_flow_duration', true);

// ── Test configuration ────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Ramp up to 500 VUs, hold for 5 min, ramp down
    booking_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },   // warm-up
        { duration: '2m', target: 500 },   // ramp to peak
        { duration: '5m', target: 500 },   // hold peak
        { duration: '1m', target: 0 },     // ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Separate scenario for health check (constant low rate)
    health_check: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '9m',
      preAllocatedVUs: 2,
      maxVUs: 5,
      exec: 'healthCheck',
    },
  },
  thresholds: {
    // Primary SLA: p95 < 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Error rate < 1%
    error_rate: ['rate<0.01'],
    // Booking flow end-to-end < 2s p95
    booking_flow_duration: ['p(95)<2000'],
    // All requests must succeed
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL ?? 'http://localhost:3000';
const API = `${BASE_URL}/api/v1`;
const HEADERS = { 'Content-Type': 'application/json' };

// ── Helper ────────────────────────────────────────────────────────────────────
function authedHeaders(token) {
  return { ...HEADERS, Authorization: `Bearer ${token}` };
}

// ── Health check scenario ─────────────────────────────────────────────────────
export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { 'health: status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
}

// ── Main scenario: full booking flow ─────────────────────────────────────────
export default function bookingFlow() {
  const startTime = Date.now();

  // ── 1. Login ──────────────────────────────────────────────────────────────
  const loginRes = http.post(
    `${API}/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_EMAIL ?? 'loadtest@pawroute.com',
      password: __ENV.TEST_PASSWORD ?? 'LoadTest123!',
    }),
    { headers: HEADERS }
  );

  const loginOk = check(loginRes, {
    'login: status 200': (r) => r.status === 200,
    'login: has accessToken': (r) => r.json('data.accessToken') !== null,
  });
  errorRate.add(!loginOk);
  if (!loginOk) return;

  const token = loginRes.json('data.accessToken');
  const ah = authedHeaders(token);

  sleep(0.3);

  // ── 2. Get services ───────────────────────────────────────────────────────
  const servicesRes = http.get(`${API}/services`, { headers: ah });
  check(servicesRes, { 'services: status 200': (r) => r.status === 200 });
  errorRate.add(servicesRes.status !== 200);

  const services = servicesRes.json('data.services') ?? [];
  if (services.length === 0) return;
  const serviceId = services[0].id;

  sleep(0.2);

  // ── 3. Get my pets ────────────────────────────────────────────────────────
  const petsRes = http.get(`${API}/pets`, { headers: ah });
  check(petsRes, { 'pets: status 200': (r) => r.status === 200 });
  errorRate.add(petsRes.status !== 200);

  const pets = petsRes.json('data.pets') ?? [];
  if (pets.length === 0) return;
  const petId = pets[0].id;

  sleep(0.2);

  // ── 4. Check available slots ──────────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const slotsRes = http.get(`${API}/slots/available?startDate=${dateStr}&endDate=${dateStr}`, {
    headers: ah,
  });
  check(slotsRes, { 'slots: status 200': (r) => r.status === 200 });
  errorRate.add(slotsRes.status !== 200);

  const slots = slotsRes.json('data') ?? [];
  if (slots.length === 0) return;
  const slotId = slots[0].id;

  sleep(0.5);

  // ── 5. Create appointment ─────────────────────────────────────────────────
  const apptRes = http.post(
    `${API}/appointments`,
    JSON.stringify({ petId, serviceId, slotId, addonIds: [] }),
    { headers: ah }
  );

  const apptOk = check(apptRes, {
    'appointment: status 201': (r) => r.status === 201,
    'appointment: has bookingRef': (r) => r.json('data.bookingRef') !== null,
  });
  errorRate.add(!apptOk);

  bookingDuration.add(Date.now() - startTime);

  sleep(1);
}
