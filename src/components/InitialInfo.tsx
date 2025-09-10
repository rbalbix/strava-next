import Divider from '@mui/material/Divider';
import Image from 'next/image';
import { FaMedapps } from 'react-icons/fa';
import styles from '../styles/components/InitialInfo.module.css';

export default function InitialInfo() {
  return (
    <div className={styles.initialInfoContainer}>
      <main>
        <h1>
          Como usar o aplicativo para monitorar equipamentos usando as
          atividades do <span>Strava</span>
        </h1>
        <div>
          Este passo a passo foi feito para ajudar a utilizar esse aplicativo,
          que permite monitorar a vida útil dos seus equipamentos registrados no
          Strava.
        </div>
        <h2>Passo 1: Acesso Inicial e Login</h2>
        <div>Ao abrir o aplicativo, você verá a seguinte tela inicial:</div>

        <div className={styles.screen}>
          <Image
            src='/images/login.png'
            alt='Tela inicial do aplicativo com botão de login via Strava'
            width={203}
            height={387}
          />
        </div>

        <ol>
          <li>
            Clique no botão <span>Sign in</span> localizado no canto superior
            direito da tela.
          </li>
          <li>
            Você será redirecionado para a página de autenticação do Strava.
          </li>
          <li>
            Insira suas credenciais do Strava e autorize a conexão com o
            aplicativo.
          </li>
          <li>
            Após o login, você será levado à lista de equipamentos registrados
            no Strava.
          </li>
        </ol>

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        <h2>Passo 2: Lista de Equipamentos</h2>
        <div>
          Após realizar o login, você será redirecionado para o painel principal
          que lista todos os seus equipamentos registrados no Strava.
        </div>

        <div className={styles.screen}>
          <Image
            src='/images/equipments.png'
            alt='Lista de Equipamentos'
            width={203}
            height={387}
          />
        </div>

        <div>
          Cada cartão representa um equipamento com as seguintes informações:
        </div>

        <ul>
          <li>Nome do equipamento.</li>
          <li>Número total de atividades realizadas.</li>
          <li>Distância total percorrida (em quilômetros).</li>
          <li>Tempo total de uso (em horas).</li>
          <li>
            Para bicicletas, exibe a distância desde a última lubrificação da
            corrente.
          </li>
        </ul>

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        <h2>Passo 3: Detalhes de um Equipamento</h2>
        <div>
          Ao clicar no cartão do equipamento, o aplicativo abre uma tela
          detalhada com todas os componentes e eventos registrados para o
          equipamento.
        </div>

        <div className={styles.screen}>
          <Image
            src='/images/components.png'
            alt='Lista de Componentes'
            width={203}
            height={387}
          />
        </div>

        <div>Nesta tela, você verá:</div>
        <ul>
          <li>Data da atividade: Quando a manutenção foi realizada.</li>
          <li>Descrição da manutenção: Tipo de manutenção realizada.</li>
          <li>
            Distância acumulada: Distância percorrida desde a última manutenção.
          </li>
          <li>Tempo total: Tempo de uso desde a última manutenção.</li>
        </ul>

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        <h2>Passo 4: Lista de Códigos dos Componentes</h2>
        <div>
          Para monitorar diferentes tipos de <span>componentes</span> do
          equipamento, você precisa adicionar o <span>código</span>{' '}
          correspondente no campo de
          <span>Observações Privadas</span> na atividade do Strava e incluir um
          <span>&quot;*&quot;</span> no título da atividade.
        </div>

        <div className={styles.screen}>
          <Image
            src='/images/strava-config.png'
            alt='Configuração na atividade'
            width={203}
            height={387}
          />
        </div>

        <h3>Lista dos códigos dos componentes:</h3>
        <div>
          Esta lista pode ser aberta clicando no ícone{' '}
          <FaMedapps aria-label='Ícone de lista de componentes' />
          que fica no final da lista de equipamentos.
        </div>

        <div className={styles.screen}>
          <Image
            src='/images/component-list.png'
            alt='Lista de Códigos'
            width={203}
            height={387}
          />
        </div>

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        <h3>Observações:</h3>
        <ul>
          <li>
            O tema claro ou escuro é definido pela configuração do ambiente /
            navegador.
          </li>
          {/* <li>
            Caso a atualização feita na atividade do Strava não apareça na lista
            de componentes do equipamento, você vai precisar limpar o cache do
            navegador.{' '}
            <a
              href='http://bit.ly/4fdUkw1'
              target='_blank'
              rel='noopener noreferrer'
            >
              Como limpar o cache do navegador?
            </a>
          </li> */}
        </ul>
      </main>
    </div>
  );
}
