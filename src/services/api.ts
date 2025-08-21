import axios from 'axios';
import { baseURL, stravaAuth } from '../config';

const api = axios.create({
  baseURL,
});

const apiStravaAuth = axios.create({ baseURL: stravaAuth });

export { api, apiStravaAuth };
