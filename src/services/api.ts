import axios from 'axios';
import useSWR from 'swr';
import { baseURL } from '../config';

const api = axios.create({
  baseURL,
});

export function useFetch(url: string) {
  const { data, error } = useSWR(url, async (url) => {
    const response = await api.get(url);

    return response.data;
  });

  return { data, error };
}

export default api;
