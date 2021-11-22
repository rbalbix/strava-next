import { useRouter } from 'next/router';
import { createContext, ReactNode, useState } from 'react';
import { DetailedAthlete, Strava } from 'strava';
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
  setAthleteInfo: (athele: DetailedAthlete) => void;
  signIn: () => Promise<Strava>;
  signOut: () => void;
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
}

export function AuthProvider({ children, ...rest }: AuthProviderProps) {
  const [codeReturned, setCodeReturned] = useState(rest.codeReturned ?? null);
  const [athlete, setAthlete] = useState(rest.athlete);

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
    } catch (error) {
      signOut();
    }
  }

  function signOut() {
    router.push('/');

    setCodeReturned(null);
    setAthlete(null);
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
        setAthleteInfo,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
