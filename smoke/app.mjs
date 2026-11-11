import { init, start } from '@pyroscope/nodejs';

function smokeWork(n) {
  const primes = [];
  let candidate = 2;
  while (primes.length < n) {
    const isPrime = !primes.some((p) => candidate % p === 0);
    if (isPrime) primes.push(candidate);
    candidate++;
  }
  return primes;
}

const N = 10_000_000;

init({
  serverAddress: process.env.PYROSCOPE_SERVER_ADDRESS,
  appName: 'smoke',
  flushIntervalMs: 5000,
  wall: {
    samplingDurationMs: 5000,
  },
});
start();

smokeWork(N);
