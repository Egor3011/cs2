<template>
  <div class="home">
    <!-- Header -->
    <header class="header">
      <div class="container header__inner">

        <router-link to="/" class="logo">
          <span class="logo__cs">CS2</span>
          <span class="logo__command">COMMAND</span>
        </router-link>

        <nav class="nav">
          <router-link to="/" class="nav__link nav__link--active">
            Турниры
          </router-link>

          <router-link to="/matches" class="nav__link">
            Матчи
          </router-link>

          <router-link to="/teams" class="nav__link">
            Команды
          </router-link>

          <router-link to="/rating" class="nav__link">
            Рейтинг
          </router-link>
        </nav>

        <div class="header__actions">
          <button class="icon-button">
            🔔
          </button>

          <button class="btn btn--pink">
            Войти
          </button>
        </div>

      </div>
    </header>


    <!-- Hero -->
    <main>

      <section class="hero">
        <div class="container hero__inner">

          <div class="hero__content">

            <div class="hero__label">
              <span class="hero__dot"></span>
              ОНЛАЙН ТУРНИРЫ CS2
            </div>

            <h1 class="hero__title">
              Играй.
              <br>
              Соревнуйся.
              <br>
              <span>Побеждай.</span>
            </h1>

            <p class="hero__description">
              Платформа для проведения и участия
              в турнирах по Counter-Strike 2.
            </p>

            <div class="hero__buttons">
              <button class="btn btn--pink btn--large">
                Найти турнир
              </button>

              <button class="btn btn--outline btn--large">
                Создать турнир
              </button>
            </div>

          </div>


          <!-- Current match -->
          <div class="hero-match">

            <div class="hero-match__header">
              <div>
                <span class="match-label">
                  LIVE МАТЧ
                </span>

                <span class="match-tournament">
                  CS2 Command Cup
                </span>
              </div>

              <span class="live">
                LIVE
              </span>
            </div>

            <div class="hero-match__teams">

              <div class="hero-team">
                <div class="team-logo team-logo--pink">
                  V
                </div>

                <span>
                  Virtus.pro
                </span>
              </div>

              <div class="hero-score">
                <strong>2</strong>
                <span>:</span>
                <strong>0</strong>
              </div>

              <div class="hero-team">
                <div class="team-logo team-logo--blue">
                  N
                </div>

                <span>
                  NAVI
                </span>
              </div>

            </div>

            <div class="match-map">
              <span>Финал</span>
              <span>Mirage</span>
            </div>

            <button class="match-watch">
              Смотреть матч
              <span>→</span>
            </button>

          </div>

        </div>
      </section>


      <!-- Stats -->
      <section class="stats">
        <div class="container stats__grid">

          <div class="stat">
            <strong>128</strong>
            <span>Турниров</span>
          </div>

          <div class="stat">
            <strong>1 240</strong>
            <span>Команд</span>
          </div>

          <div class="stat">
            <strong>8 600+</strong>
            <span>Игроков</span>
          </div>

          <div class="stat">
            <strong>24/7</strong>
            <span>Матчи</span>
          </div>

        </div>
      </section>


      <!-- Tournaments -->
      <section class="section">
        <div class="container">

          <div class="section-header">
            <div>
              <span class="section-label">
                СЕЙЧАС
              </span>

              <h2 class="section-title">
                Активные турниры
              </h2>
            </div>

            <router-link
              to="/tournaments"
              class="section-link"
            >
              Все турниры →
            </router-link>
          </div>


          <div class="tournaments-grid">

            <article
              v-for="tournament in tournaments"
              :key="tournament.id"
              class="tournament-card"
            >

              <div class="tournament-card__top">

                <span
                  class="status"
                  :class="`status--${tournament.status}`"
                >
                  {{ tournament.statusText }}
                </span>

                <span class="tournament-card__game">
                  CS2
                </span>

              </div>


              <h3 class="tournament-card__title">
                {{ tournament.title }}
              </h3>

              <p class="tournament-card__description">
                {{ tournament.description }}
              </p>


              <div class="tournament-card__info">

                <div>
                  <span>Участники</span>
                  <strong>
                    {{ tournament.players }}
                  </strong>
                </div>

                <div>
                  <span>Призовой фонд</span>
                  <strong>
                    {{ tournament.prize }}
                  </strong>
                </div>

              </div>


              <div class="progress">

                <div class="progress__header">
                  <span>
                    Регистрация
                  </span>

                  <span>
                    {{ tournament.registered }}/{{ tournament.total }}
                  </span>
                </div>

                <div class="progress__track">
                  <div
                    class="progress__value"
                    :style="{
                      width: `${tournament.progress}%`
                    }"
                  ></div>
                </div>

              </div>


              <router-link v-if="tournament.id === 1" to="/tournaments/command-cup" class="btn btn--blue btn--full">
                Сетка турнира
              </router-link>
              <button v-else class="btn btn--blue btn--full">
                Подробнее
              </button>

            </article>

          </div>

        </div>
      </section>


      <!-- Upcoming matches -->
      <section class="section section--gray">
        <div class="container">

          <div class="section-header">
            <div>
              <span class="section-label section-label--blue">
                РАСПИСАНИЕ
              </span>

              <h2 class="section-title">
                Ближайшие матчи
              </h2>
            </div>

            <router-link
              to="/matches"
              class="section-link"
            >
              Все матчи →
            </router-link>
          </div>


          <div class="matches">

            <div
              v-for="match in matches"
              :key="match.id"
              class="match-row"
            >

              <div class="match-row__time">
                <strong>{{ match.time }}</strong>
                <span>{{ match.date }}</span>
              </div>


              <div class="match-row__teams">

                <div class="match-team">
                  <span>{{ match.team1 }}</span>

                  <div class="mini-logo">
                    {{ match.team1Logo }}
                  </div>
                </div>

                <span class="match-row__vs">
                  VS
                </span>

                <div class="match-team">
                  <div class="mini-logo">
                    {{ match.team2Logo }}
                  </div>

                  <span>{{ match.team2 }}</span>
                </div>

              </div>


              <div class="match-row__tournament">
                {{ match.tournament }}
              </div>


              <button class="match-row__button">
                Матч →
              </button>

            </div>

          </div>

        </div>
      </section>


      <!-- CTA -->
      <section class="cta">
        <div class="container">

          <div class="cta__inner">

            <div>
              <span class="section-label">
                ДЛЯ ОРГАНИЗАТОРОВ
              </span>

              <h2>
                Создай свой турнир
              </h2>

              <p>
                Собери команды, настрой сетку и
                проведи свой турнир по CS2.
              </p>
            </div>

            <button class="btn btn--white btn--large">
              Создать турнир
            </button>

          </div>

        </div>
      </section>

    </main>


    <!-- Footer -->
    <footer class="footer">
      <div class="container footer__inner">

        <div class="logo">
          <span class="logo__cs">CS2</span>
          <span class="logo__command">COMMAND</span>
        </div>

        <span class="footer__copyright">
          © 2026 CS2 Command
        </span>

        <div class="footer__links">
          <a href="#">Правила</a>
          <a href="#">Поддержка</a>
          <a href="#">Контакты</a>
        </div>

      </div>
    </footer>

  </div>
</template>


<script setup>
import { ref } from 'vue'

const tournaments = ref([
  {
    id: 1,
    title: 'CS2 Command Cup',
    description: 'Открытый турнир для всех команд',
    status: 'active',
    statusText: 'Регистрация',
    players: '32 команды',
    prize: '$10 000',
    registered: 24,
    total: 32,
    progress: 75
  },
  {
    id: 2,
    title: 'Night Battle',
    description: 'Ночной чемпионат для сильнейших',
    status: 'active',
    statusText: 'Идёт сейчас',
    players: '16 команд',
    prize: '$5 000',
    registered: 16,
    total: 16,
    progress: 100
  },
  {
    id: 3,
    title: 'Community League',
    description: 'Любительская лига CS2',
    status: 'upcoming',
    statusText: 'Скоро',
    players: '64 команды',
    prize: '$2 500',
    registered: 38,
    total: 64,
    progress: 59
  }
])

const matches = ref([
  {
    id: 1,
    time: '18:00',
    date: 'Сегодня',
    team1: 'Virtus.pro',
    team1Logo: 'V',
    team2: 'NAVI',
    team2Logo: 'N',
    tournament: 'CS2 Command Cup'
  },
  {
    id: 2,
    time: '20:30',
    date: 'Сегодня',
    team1: 'Spirit',
    team1Logo: 'S',
    team2: 'G2',
    team2Logo: 'G',
    tournament: 'Night Battle'
  },
  {
    id: 3,
    time: '16:00',
    date: 'Завтра',
    team1: 'FaZe',
    team1Logo: 'F',
    team2: 'Vitality',
    team2Logo: 'V',
    tournament: 'Community League'
  }
])
</script>
