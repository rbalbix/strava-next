# Strava Stats

🚴 **Strava Next** é uma aplicação web desenvolvida com Next.js que interage com a API do Strava para exibir estatísticas de atividades, equipamentos e outros dados dos usuários.

## 📸 Capturas de Tela

### Login page

| ![Login page](assets/Captura%20de%20tela%20de%202023-05-15%2011-57-24.png) | ![Login page](assets/Captura%20de%20tela%20de%202023-05-15%2011-57-42.png) |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |

### List of equipments

| ![List of equipments](assets/Captura%20de%20tela%20de%202023-05-15%2011-58-16.png) | ![List of equipments](assets/Captura%20de%20tela%20de%202023-05-15%2011-58-02.png) |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |

### General statistics

| ![General statistics](assets/Captura%20de%20tela%20de%202023-05-15%2011-58-30.png) | ![General statistics](assets/Captura%20de%20tela%20de%202023-05-15%2011-58-48.png) |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |

### Equipment statistics

| ![Equipment statistics](assets/Captura%20de%20tela%20de%202023-05-15%2011-59-09.png) | ![Equipment statistics](assets/Captura%20de%20tela%20de%202023-05-15%2011-59-01.png) |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |

<br/>

### Strava Configuration

![Strava Configuration](assets/config-strava.png)

## List of equipments:

|      Code      | Equipment                               |
| :------------: | --------------------------------------- |
|      lub       | `Lubrification`                         |
|     review     | `Complete Review`                       |
|     clean      | `Clean`                                 |
|      susp      | `Suspension review`                     |
|                |                                         |
|     tires      | `Both tires`                            |
|   fronttire    | `Front tire`                            |
|    reartire    | `Rear tire`                             |
|     tubes      | `Both tubes`                            |
|    tubeless    | `Tubeless installation or replacement ` |
|   fronttube    | `Front tube`                            |
|    reartube    | `Rear tube`                             |
|                |                                         |
|      stem      | `Stem`                                  |
|   handlebar    | `Handlebar`                             |
|    wheelset    | `Wheel Set`                             |
|   frontwheel   | `Front Wheel`                           |
|   rearwheel    | `Rear Wheel`                            |
|                |                                         |
|     breaks     | `Both breaks pads`                      |
|   frontbreak   | `Front brak pad`                        |
|   rearbreak    | `Rear break pad`                        |
|                |                                         |
|     disks      | `Both disks`                            |
|   frontDisk    | `Front disk`                            |
|    rearDisk    | `Rear disk`                             |
|                |                                         |
|      tape      | `Handlebar Tape`                        |
|      grip      | `Handlebar Grip`                        |
|    dropper     | `Dropper post`                          |
|     saddle     | `Saddle`                                |
|                |                                         |
|     pedal      | `Pedals`                                |
|     chain      | `Chain`                                 |
|       bb       | `Bottom Bracket`                        |
|                |                                         |
|    cassette    | `Cassette`                              |
|    crankset    | `Crankset`                              |
| rearderailleur | `Rear Derailleur`                       |
|  rearshifter   | `Rear Shifter`                          |
|                |                                         |
|   frontlight   | `Front light`                           |
|   rearlight    | `Rear light`                            |

## 🚀 Tecnologias Utilizadas

- **Next.js** - Framework React para aplicações web
- **React.js** - Biblioteca para construção de interfaces
- **TypeScript** - Tipagem estática para JavaScript
- **Strava API** - Integração com a plataforma Strava

## 📦 Instalação e Configuração

### 🔹 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Node.js** (versão 16 ou superior)
- **Yarn** ou **npm**
- Uma conta de desenvolvedor no **Strava API**

### 🔹 Clonando o Repositório

```sh
 git clone https://github.com/rbalbix/strava-next.git
 cd strava-next
```

### 🔹 Instalando Dependências

Com `npm`:

```sh
npm install
```

Com `yarn`:

```sh
yarn install
```

### 🔹 Configurando Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto e adicione as seguintes variáveis:

```ini
NEXT_PUBLIC_STRAVA_CLIENT_ID=SEU_CLIENT_ID
NEXT_PUBLIC_STRAVA_CLIENT_SECRET=SEU_CLIENT_SECRET
NEXT_PUBLIC_STRAVA_REDIRECT_URI=SEU_REDIRECT_URI
NEXT_PUBLIC_API_BASE_URL=https://www.strava.com/api/v3
```

🚨 **Atenção**: Nunca compartilhe suas credenciais publicamente!

### 🔹 Executando o Projeto

Com `npm`:

```sh
npm run dev
```

Com `yarn`:

```sh
yarn dev
```

O projeto estará disponível em `http://localhost:3000`

## 🛠️ Estrutura do Projeto

```plaintext
📂 strava-next
 ├── 📁 components    # Componentes reutilizáveis
 ├── 📁 pages         # Páginas da aplicação
 ├── 📁 styles        # Estilos CSS/Tailwind
 ├── 📁 utils         # Funções auxiliares
 ├── .env.local       # Configuração de variáveis ambiente (não versionado)
 ├── package.json     # Configuração do projeto
 ├── README.md        # Documentação
```

## 📡 API do Strava

A aplicação consome a API do Strava para obter dados do usuário. Para mais detalhes sobre os endpoints disponíveis, consulte a documentação oficial:
🔗 [Strava API Docs](https://developers.strava.com/docs/reference/)

## ✅ Melhorias Futuras

- [ ] Melhorar a interface para dispositivos móveis 📱
- [ ] Implementar testes automatizados 🧪
- [ ] Adicionar cache para reduzir chamadas à API 🚀

## 🤝 Contribuição

Contribuições são bem-vindas! Para colaborar:

1. Faça um fork do projeto 🍴
2. Crie uma branch com a nova funcionalidade: `git checkout -b minha-feature`
3. Faça commit das alterações: `git commit -m 'Minha nova feature'`
4. Envie para o repositório remoto: `git push origin minha-feature`
5. Abra um Pull Request 🚀

## 📜 Licença

Este projeto é distribuído sob a licença MIT. Veja mais detalhes no arquivo `LICENSE`.

---

Feito com ❤️ por [rbalbix](https://github.com/rbalbix) 🚴‍♂️

</br>
<div align="center">
  <img alt="GitHub language count" src="https://img.shields.io/github/languages/count/rbalbix/strava-next">

  <img alt="Repository size" src="https://img.shields.io/github/repo-size/rbalbix/strava-next">

  <img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/rbalbix/strava-next">

  <img alt="Repository issues" src="https://img.shields.io/github/issues/rbalbix/strava-next">

  <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/rbalbix/strava-next">

  <img alt="License" src="https://img.shields.io/badge/license-MIT-brightgreen">

  <img alt="License" src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg">

![Anurag's GitHub stats](https://github-readme-stats.vercel.app/api?username=rbalbix&show_icons=true&theme=dracula)

</div>

## Contribuidores

<a href="https://github.com/rbalbix/strava-stats/graphs/contributors">
  <img src="https://contributors-img.web.app/image?repo=rbalbix/strava-stats" alt="Lista de contribuidores"/>
</a>
