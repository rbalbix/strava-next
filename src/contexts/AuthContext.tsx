import { useRouter } from 'next/router';
import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import type { ActivityStats, DetailedAthlete } from 'strava';
import { apiClient } from '../lib/apiClient';

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

  const setAthleteInfo = useCallback((athlete: DetailedAthlete | null) => {
    setAthlete(athlete);
  }, []);

  const setAthleteInfoStats = useCallback(
    (athleteStats: ActivityStats | null) => {
      setAthleteStats(athleteStats);
    },
    [],
  );

  const setErrorInfo = useCallback((errorObj: unknown) => {
    setCodeError(errorObj);
  }, []);

  const signOut = useCallback(async () => {
    // Invalidate server-side cookies (HttpOnly) via API
    try {
      await apiClient.logout();
    } catch (err) {
      // proceed even if server-side logout fails
      console.warn('Server logout failed', err);
    }

    sessionStorage.removeItem('athlete');
    sessionStorage.removeItem('athleteStats');
    sessionStorage.removeItem('gearStats');
    sessionStorage.removeItem('equipmentThresholds');
    sessionStorage.removeItem('hasGear');
    sessionStorage.removeItem('hasActivities');
    sessionStorage.removeItem('athleteCacheTime');

    // Os cookies de sessão (strava_code, strava_athleteId) são HttpOnly e,
    // portanto, invisíveis para o JavaScript — limpar via document.cookie não
    // tem efeito algum. A remoção acontece no POST /api/app/logout, chamado
    // acima. As linhas que faziam isso aqui foram removidas por serem
    // enganosas: sugeriam uma capacidade que não existe.

    setCodeReturned(null);
    setAthlete(null);
    setAthleteStats(null);
    // A landing é renderizada no mesmo AuthProvider e o ModalContainer fica
    // montado acima do conteúdo. Sem limpar este estado, qualquer detalhe de
    // card/modal aberto atravessa o logout e fica por cima da landing.
    setActiveModal(null);
    setModalData(null);
    // Sem isto, o erro que motivou o signOut sobrevivia à navegação e era
    // renderizado pela landing via `<ErroMsg />` — um usuário que simplesmente
    // voltou a entrar via "Sessão expirada / Sua sessão com o Strava expirou
    // ou foi revogada", frase que não faz sentido para quem nunca saiu.
    setCodeError(null);

    // Navigate to home; use replace to avoid back-button returning logged-in state
    router.replace('/');
  }, [router]);

  const openModal = useCallback((modalType: string, data?: unknown) => {
    setActiveModal(modalType);
    setModalData(data);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  const contextValue = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
