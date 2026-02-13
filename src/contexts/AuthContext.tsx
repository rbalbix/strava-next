import { useRouter } from 'next/router';
import { createContext, ReactNode, useState } from 'react';
import { ActivityStats, DetailedAthlete, Strava } from 'strava';
import { REDIS_KEYS } from '../config';
import { apiRemoteStorage } from '../services/api';

interface AuthContextData {
  codeReturned: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
  response_type: string;
  approval_prompt: string;
  scope: string;
  athlete: any;
  athleteStats: ActivityStats;
  codeError: any;
  activeModal: string | null;
  modalData: any;
  setAthleteInfo: (athele: DetailedAthlete) => void;
  setAthleteInfoStats: (atheleStats: ActivityStats) => void;
  setErrorInfo: (error: Object) => void;
  signIn: () => Promise<Strava>;
  signOut: () => void;
  openModal: (modalType: string, data?: any) => void;
  closeModal: () => void;
}
interface AuthProviderProps {
  children: ReactNode;
  codeReturned: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
  response_type: string;
  approval_prompt: string;
  scope: string;
  athlete_id: number;
  athlete?: DetailedAthlete;
  athleteStats?: ActivityStats;
  codeError?: Object;
}

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children, ...rest }: AuthProviderProps) {
  const [codeReturned, setCodeReturned] = useState<string>(rest.codeReturned);
  const [athlete, setAthlete] = useState(rest.athlete);
  const [athleteStats, setAthleteStats] = useState(rest.athleteStats);
  const [codeError, setCodeError] = useState(rest.codeError);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  const router = useRouter();

  const {
    client_id,
    client_secret,
    grant_type,
    response_type,
    approval_prompt,
    scope,
    athlete_id,
  } = rest;

  function setAthleteInfo(athlete: DetailedAthlete) {
    setAthlete(athlete);
  }

  function setAthleteInfoStats(athleteStats: ActivityStats) {
    setAthleteStats(athleteStats);
  }

  function setErrorInfo(errorObj: Object) {
    setCodeError(errorObj);
  }

  async function signIn(): Promise<Strava> {
    try {
      const storedAuth = await apiRemoteStorage.get(
        REDIS_KEYS.auth(athlete_id),
      );

      const strava = new Strava({
        client_id,
        client_secret,
        refresh_token: storedAuth.data.refreshToken,
      });

      return strava;
    } catch (error) {
      console.error('💥 ERRO COMPLETO:', error);
      console.error('Stack:', error.stack);
      signOut();
    }
  }

  async function signOut() {
    // Invalidate server-side cookies (HttpOnly) via API
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      // proceed even if server-side logout fails
      console.warn('Server logout failed', err);
    }

    sessionStorage.removeItem('athlete');
    sessionStorage.removeItem('athleteStats');
    sessionStorage.removeItem('athleteCacheTime');

    // Clear non-HttpOnly cookies (best-effort)
    document.cookie = 'strava_code=; Path=/; Max-Age=0';
    document.cookie = 'strava_athleteId=; Path=/; Max-Age=0';

    setCodeReturned(null);
    setAthlete(null);
    setAthleteStats(null);

    // Navigate to home; use replace to avoid back-button returning logged-in state
    router.replace('/');
  }

  const openModal = (modalType: string, data?: any) => {
    setActiveModal(modalType);
    setModalData(data);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        codeReturned,
        client_id,
        client_secret,
        grant_type,
        response_type,
        approval_prompt,
        scope,
        athlete,
        athleteStats,
        codeError,
        activeModal,
        modalData,
        setAthleteInfo,
        setAthleteInfoStats,
        setErrorInfo,
        signIn,
        signOut,
        openModal,
        closeModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
