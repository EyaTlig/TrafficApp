const axios = require('axios');
const { serviceUrls } = require('./config');

async function forward(service, query, variables = {}, authHeader = null) {
  const url = serviceUrls[service];
  if (!url) {
    throw new Error(`Unknown service: ${service}`);
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authHeader) {
    headers.Authorization = authHeader;
  }

  try {
    const response = await axios.post(
      url,
      { query, variables },
      {
        headers,
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 500,
      }
    );

    const data = response.data;
    if (data.errors) {
      const error = data.errors[0];
      throw new Error(error?.message || 'Remote GraphQL error');
    }

    return data.data;
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message;
    throw new Error(`Service ${service} unavailable: ${message}`);
  }
}

module.exports = { forward };