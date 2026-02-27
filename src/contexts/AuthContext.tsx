import { useRouter } from 'next/router';
import { createContext, ReactNode, useState } from 'react';
import { ActivityStats, DetailedAthlete } from 'strava';
import { getLogger } from '../services/logger';

interface AuthContextData {
  codeReturned: string | null;
  client_id?: string;
  grant_type?: string;
  response_type?: string;
  approval_prompt?: string;
  scope?: string;
  oauth_state: string;
  athlete: DetailedAthlete | null;
  athleteStats: ActivityStats | null;
  codeError: unknown;
  activeModal: string | null;
  modalData: unknown;
  setAthleteInfo: (athlete: DetailedAthlete | null) => void;
  setAthleteInfoStats: (athleteStats: ActivityStats | null) => void;
  setErrorInfo: (error: unknown) => void;
  signOut: () => void;
  openModal: (modalType: string, data?: unknown) => void;
  closeModal: () => void;
}
interface AuthProviderProps {
  children: ReactNode;
  codeReturned: string | null;
  client_id?: string;
  grant_type?: string;
  response_type?: string;
  approval_prompt?: string;
  scope?: string;
  oauth_state: string;
  athlete_id: number | null;
  athlete?: DetailedAthlete;
  athleteStats?: ActivityStats;
  codeError?: unknown;
}

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children, ...rest }: AuthProviderProps) {
  const [codeReturned, setCodeReturned] = useState<string | null>(
    rest.codeReturned,
  );
  const [athlete, setAthlete] = useState<DetailedAthlete | null>(
    rest.athlete || null,
  );
  const [athleteStats, setAthleteStats] = useState<ActivityStats | null>(
    rest.athleteStats || null,
  );
  const [codeError, setCodeError] = useState<unknown>(rest.codeError);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<unknown>(null);

  const router = useRouter();

  const {
    client_id,
    grant_type,
    response_type,
    approval_prompt,
    scope,
    oauth_state,
  } = rest;

  function setAthleteInfo(athlete: DetailedAthlete | null) {
    setAthlete(athlete);
  }

  function setAthleteInfoStats(athleteStats: ActivityStats | null) {
    setAthleteStats(athleteStats);
  }

  function setErrorInfo(errorObj: unknown) {
    setCodeError(errorObj);
  }

  async function signOut() {
    // Invalidate server-side cookies (HttpOnly) via API
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      // proceed even if server-side logout fails
      getLogger().warn({ err }, 'Server logout failed');
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

  const openModal = (modalType: string, data?: unknown) => {
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
        grant_type,
        response_type,
        approval_prompt,
        scope,
        oauth_state,
        athlete,
        athleteStats,
        codeError,
        activeModal,
        modalData,
        setAthleteInfo,
        setAthleteInfoStats,
        setErrorInfo,
        signOut,
        openModal,
        closeModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
