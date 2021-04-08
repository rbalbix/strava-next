import { createContext, ReactNode, useState } from 'react';

interface UserData {
  name: string;
  avatar: string;
}

interface AuthContextData {
  codeReturned: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
  response_type: string;
  user: UserData;
  setUserInfo: (user: UserData) => void;
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
  user?: UserData;
}

export function AuthProvider({ children, ...rest }: AuthProviderProps) {
  const [codeReturned, setCodeReturned] = useState(rest.codeReturned ?? '');
  const [user, setUser] = useState<UserData>(rest.user);

  const { client_id, client_secret, grant_type, response_type } = rest;

  function setUserInfo(user: UserData) {
    setUser(user);
  }

  function signOut() {
    setCodeReturned('');
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        codeReturned,
        client_id,
        client_secret,
        grant_type,
        response_type,
        user,
        setUserInfo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
