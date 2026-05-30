export const getAuthHeaders = () => {
  const token = localStorage.getItem('sm_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchWithAuth = (url: string, options: RequestInit = {}) => {
  const headers = {
    ...options.headers,
    ...getAuthHeaders(),
  };

  return fetch(url, { ...options, headers });
};
