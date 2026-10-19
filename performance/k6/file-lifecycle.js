import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 2 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:login}': ['p(95)<500'],
    'http_req_duration{endpoint:files}': ['p(95)<500'],
    'http_req_duration{endpoint:upload}': ['p(95)<2000'],
    'http_req_duration{endpoint:download}': ['p(95)<2000'],
    'http_req_duration{endpoint:cleanup}': ['p(95)<500'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';
const login = __ENV.PERF_LOGIN;
const password = __ENV.PERF_PASSWORD;

export function setup() {
  if (!login || !password) {
    throw new Error('PERF_LOGIN and PERF_PASSWORD must be defined');
  }
}

export default function () {
  const loginResponse = http.post(
    `${baseUrl}/api/login`,
    JSON.stringify({ login, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' },
    },
  );

  const loginSucceeded = check(loginResponse, {
    'login returns 200': (response) => response.status === 200,
    'login returns a JWT': (response) => response.body.length > 20,
  });

  if (!loginSucceeded) {
    return;
  }

  const authorization = {
    Authorization: `Bearer ${loginResponse.body}`,
  };

  const filesResponse = http.get(`${baseUrl}/api/files`, {
    headers: authorization,
    tags: { endpoint: 'files' },
  });

  check(filesResponse, {
    'file list returns 200': (response) => response.status === 200,
  });

  const filename = `perf-test-${Date.now()}-${__VU}-${__ITER}.txt`;
  const content = `DataShare performance test ${__VU}-${__ITER}`;
  const uploadResponse = http.post(
    `${baseUrl}/api/file/upload`,
    {
      file: http.file(content, filename, 'text/plain'),
      expirationDays: '1',
      password: '',
    },
    {
      headers: authorization,
      tags: { endpoint: 'upload' },
    },
  );

  const uploadSucceeded = check(uploadResponse, {
    'upload returns 200': (response) => response.status === 200,
  });

  if (!uploadSucceeded) {
    return;
  }

  let uploadedFile;
  try {
    uploadedFile = uploadResponse.json();
  } catch (error) {
    console.error(`Unable to parse upload response: ${error.message}`);
    return;
  }

  const downloadResponse = http.post(
    `${baseUrl}/api/file`,
    JSON.stringify({
      objectPath: uploadedFile.objectPath,
      password: null,
    }),
    {
      headers: {
        ...authorization,
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'download' },
      responseType: 'none',
    },
  );

  check(downloadResponse, {
    'download returns 200': (response) => response.status === 200,
  });

  // Always attempt cleanup after a successful upload, even if download fails.
  const deleteResponse = http.del(
    `${baseUrl}/api/file/${uploadedFile.id}`,
    null,
    {
      headers: authorization,
      tags: { endpoint: 'cleanup' },
    },
  );

  check(deleteResponse, {
    'cleanup returns 204': (response) => response.status === 204,
  });

  sleep(1);
}
