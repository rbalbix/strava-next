import { useRouter } from 'next/router';
import { createContext, ReactNode, useState } from 'react';
import { ActivityStats, DetailedAthlete, Strava } from 'strava';
import api from '../services/api';

interface AuthContextData {
  codeReturned: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
  response_type: string;
  redirect_uri: string;
  approval_prompt: string;
  scope: string;
  athlete: any;
  athleteStats: ActivityStats;
  codeError: any;
  setAthleteInfo: (athele: DetailedAthlete) => void;
  setAthleteInfoStats: (atheleStats: ActivityStats) => void;
  setErrorInfo: (error: Object) => void;
  signIn: () => Promise<Strava>;
  signOut: () => void;
  handleOpenModal: (id: string) => void;
  handleCloseModal: () => void;
}

export const AuthContext = createContext({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
  codeReturned: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
  response_type: string;
  redirect_uri: string;
  approval_prompt: string;
  scope: string;
  athlete?: DetailedAthlete;
  athleteStats?: ActivityStats;
  codeError?: Object;
}

export function AuthProvider({ children, ...rest }: AuthProviderProps) {
  const [codeReturned, setCodeReturned] = useState(rest.codeReturned ?? null);
  const [athlete, setAthlete] = useState(rest.athlete);
  const [athleteStats, setAthleteStats] = useState(rest.athleteStats);
  const [codeError, setCodeError] = useState(rest.codeError);

  const router = useRouter();

  const {
    client_id,
    client_secret,
    grant_type,
    response_type,
    redirect_uri,
    approval_prompt,
    scope,
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
      const response = await api.post(`/token`, null, {
        params: {
          client_id,
          client_secret,
          code: codeReturned,
          grant_type,
        },
      });

      const strava = new Strava({
        client_id,
        client_secret,
        refresh_token: response.data.refresh_token,
      });

      return strava;
    } catch {
      signOut();
    }
  }

  function signOut() {
    router.push('/');

    setCodeReturned(null);
    setAthlete(null);
  }

  function handleOpenModal(id: string) {
    handleCloseModal();
    document.getElementById(id).style.display = 'block';
  }

  function handleCloseModal() {
    const itens = Array.from(
      document.getElementsByClassName('modal') as HTMLCollectionOf<HTMLElement>
    );
    itens.map((item) => {
      item.style.display = 'none';
    });
  }

  return (
    <AuthContext.Provider
      value={{
        codeReturned,
        client_id,
        client_secret,
        grant_type,
        response_type,
        redirect_uri,
        approval_prompt,
        scope,
        athlete,
        athleteStats,
        codeError,
        setAthleteInfo,
        setAthleteInfoStats,
        setErrorInfo,
        signIn,
        signOut,
        handleOpenModal,
        handleCloseModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
