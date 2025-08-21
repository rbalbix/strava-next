import axios from 'axios';
import { remoteStorage } from '../config';

const apiStorage = axios.create({
  baseURL: remoteStorage,
});

export default apiStorage;
