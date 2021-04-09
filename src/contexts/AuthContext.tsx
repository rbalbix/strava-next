import { createContext, ReactNode, useState } from 'react';

// interface UserData {
//   name: string;
//   avatar: string;
// }

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
  setAthleteInfo: (athele) => void;
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
  athlete?: any;
}

export function AuthProvider({ children, ...rest }: AuthProviderProps) {
  const [codeReturned, setCodeReturned] = useState(rest.codeReturned ?? '');
  const [athlete, setAthlete] = useState(rest.athlete);

  const {
    client_id,
    client_secret,
    grant_type,
    response_type,
    redirect_uri,
    approval_prompt,
    scope,
  } = rest;

  function setAthleteInfo(athlete) {
    setAthlete(athlete);
  }

  function signOut() {
    setCodeReturned('');
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
