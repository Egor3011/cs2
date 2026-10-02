<template>
  <div class="match-page">

    <!-- =========================================
         HEADER
         ========================================= -->

    <header class="header">
      <div class="container header__inner">

        <router-link to="/" class="logo">
          <span class="logo__cs">CS2</span>
          <span class="logo__command">COMMAND</span>
        </router-link>

        <nav class="nav">
          <router-link to="/tournaments" class="nav__link">
            Турниры
          </router-link>

          <router-link
            to="/matches"
            class="nav__link nav__link--active"
          >
            Матчи
          </router-link>

          <router-link to="/teams" class="nav__link">
            Команды
          </router-link>

          <router-link to="/rating" class="nav__link">
            Рейтинг
          </router-link>
        </nav>

        <button class="btn btn--pink">
          Войти
        </button>

      </div>
    </header>


    <main>

      <!-- =========================================
           BREADCRUMBS
           ========================================= -->

      <section class="breadcrumbs-section">
        <div class="container breadcrumbs">

          <router-link to="/">
            Главная
          </router-link>

          <span>/</span>

          <router-link to="/tournaments">
            CS2 Command Cup
          </router-link>

          <span>/</span>

          <span class="breadcrumbs__current">
            Финал
          </span>

        </div>
      </section>


      <!-- =========================================
           STREAM + MATCH
           ========================================= -->

      <section class="match-hero">
        <div class="container">

          <!-- Stream -->

          <div class="stream">

            <div class="stream__video">
                <StreamPlayer channel="anarabdullaev" />
            </div>

            <!-- Stream information -->

            <aside class="stream__side">

              <div class="stream__side-label">
                ТРАНСЛЯЦИЯ
              </div>

              <h1>
                CS2 Command Cup
              </h1>

              <p>
                Финал турнира
              </p>

              <div class="stream__side-divider"></div>

              <div class="caster">
                <div class="caster__avatar">
                  A
                </div>

                <div>
                  <span>Комментатор</span>
                  <strong>Alex «Machine»</strong>
                </div>
              </div>

              <div class="stream__side-divider"></div>

              <div class="stream-stat">
                <span>Зрителей</span>
                <strong>12 482</strong>
              </div>

              <div class="stream-stat">
                <span>Карта</span>
                <strong>Mirage</strong>
              </div>

              <div class="stream-stat">
                <span>Раунд</span>
                <strong>24 / 30</strong>
              </div>

            </aside>

          </div>


          <!-- =========================================
               MATCH HEADER
               ========================================= -->

          <div class="match-card">

            <div class="match-card__top">

              <div>
                <span class="match-card__stage">
                  ФИНАЛ
                </span>

                <h2>
                  CS2 Command Cup
                </h2>

                <span class="match-card__date">
                  Сегодня · 18:00
                </span>
              </div>

              <span class="live-badge">
                LIVE
              </span>

            </div>


            <div class="match-card__teams">

              <!-- Team 1 -->

              <div class="match-team match-team--left">

                <div class="match-team__name">
                  Virtus.pro
                </div>

                <div class="team-logo team-logo--pink">
                  V
                </div>

              </div>


              <!-- Score -->

              <div class="match-score">

                <div class="match-score__numbers">
                  <strong>2</strong>

                  <span>:</span>

                  <strong>0</strong>
                </div>

                <span class="match-score__status">
                  LIVE · MAP 3
                </span>

              </div>


              <!-- Team 2 -->

              <div class="match-team match-team--right">

                <div class="team-logo team-logo--blue">
                  N
                </div>

                <div class="match-team__name">
                  NAVI
                </div>

              </div>

            </div>


            <!-- Maps -->

            <div class="maps">

              <div class="map map--won">
                <span>MAP 1</span>
                <strong>Mirage</strong>
                <b>13 : 9</b>
              </div>

              <div class="map map--won">
                <span>MAP 2</span>
                <strong>Inferno</strong>
                <b>13 : 11</b>
              </div>

              <div class="map map--live">
                <span>MAP 3</span>
                <strong>Nuke</strong>
                <b>8 : 7</b>
              </div>

              <div class="map">
                <span>MAP 4</span>
                <strong>Ancient</strong>
                <b>—</b>
              </div>

              <div class="map">
                <span>MAP 5</span>
                <strong>Dust II</strong>
                <b>—</b>
              </div>

            </div>

          </div>


          <!-- =========================================
               MATCH INFORMATION
               ========================================= -->

          <div class="match-layout">

            <div class="match-main">

              <!-- Statistics -->

              <section class="panel">

                <div class="panel__header">
                  <h2>Статистика матча</h2>

                  <span>
                    Nuke · 8 : 7
                  </span>
                </div>


                <div class="stats-table">

                  <div class="stats-table__head">
                    <span>Игрок</span>
                    <span>K-D</span>
                    <span>ADR</span>
                    <span>KAST</span>
                    <span>Rating</span>
                  </div>


                  <div
                    v-for="player in players"
                    :key="player.name"
                    class="stats-table__row"
                  >

                    <div class="player">
                      <div class="player__avatar">
                        {{ player.name.charAt(0) }}
                      </div>

                      <div>
                        <strong>
                          {{ player.name }}
                        </strong>

                        <span>
                          {{ player.team }}
                        </span>
                      </div>
                    </div>

                    <strong>
                      {{ player.kd }}
                    </strong>

                    <span>
                      {{ player.adr }}
                    </span>

                    <span>
                      {{ player.kast }}
                    </span>

                    <strong
                      :class="{
                        'rating--good': player.rating >= 1.15
                      }"
                    >
                      {{ player.rating }}
                    </strong>

                  </div>

                </div>

              </section>


              <!-- Event information -->

              <section class="panel">

                <div class="panel__header">
                  <h2>О турнире</h2>
                </div>

                <div class="event-info">

                  <div>
                    <span>Турнир</span>
                    <strong>CS2 Command Cup</strong>
                  </div>

                  <div>
                    <span>Стадия</span>
                    <strong>Финал</strong>
                  </div>

                  <div>
                    <span>Призовой фонд</span>
                    <strong>$10 000</strong>
                  </div>

                  <div>
                    <span>Команд</span>
                    <strong>32</strong>
                  </div>

                  <div>
                    <span>Формат</span>
                    <strong>BO5</strong>
                  </div>

                  <div>
                    <span>Статус</span>
                    <strong class="text-pink">
                      LIVE
                    </strong>
                  </div>

                </div>

              </section>

            </div>


            <!-- Right side -->

            <aside class="match-sidebar">

              <div class="panel">

                <div class="panel__header">
                  <h2>Следующий матч</h2>
                </div>

                <div class="next-match">

                  <span>
                    Если матч завершится сейчас
                  </span>

                  <div class="next-match__team">
                    Virtus.pro
                  </div>

                  <div class="next-match__vs">
                    ФИНАЛ
                  </div>

                  <div class="next-match__team">
                    —
                  </div>

                </div>

              </div>


              <div class="panel">

                <div class="panel__header">
                  <h2>Карты</h2>
                </div>

                <div class="map-list">

                  <div class="map-list__item">
                    <span>Mirage</span>
                    <strong>13 : 9</strong>
                  </div>

                  <div class="map-list__item">
                    <span>Inferno</span>
                    <strong>13 : 11</strong>
                  </div>

                  <div class="map-list__item map-list__item--live">
                    <span>Nuke</span>
                    <strong>8 : 7</strong>
                  </div>

                </div>

              </div>

            </aside>

          </div>

        </div>
      </section>


      <!-- =========================================
           TOURNAMENT BRACKET
           ========================================= -->

      <section class="bracket-section">
        <div class="container">
          <TournamentBracket :data="tournament" />
        </div>
      </section>


      <!-- =========================================
           FOOTER
           ========================================= -->

      <footer class="footer">

        <div class="container footer__inner">

          <div class="logo">
            <span class="logo__cs">CS2</span>
            <span class="logo__command">COMMAND</span>
          </div>

          <span>
            © 2026 CS2 Command
          </span>

        </div>

      </footer>

    </main>

  </div>
</template>


<script setup>
import { ref } from 'vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import tournament from '@/data/tournament.example.json'

import StreamPlayer from '@/components/StreamPlayer.vue'

const players = ref([
  {
    name: 'FL1T',
    team: 'Virtus.pro',
    kd: '18–11',
    adr: '92.4',
    kast: '82%',
    rating: 1.32
  },
  {
    name: 'Jame',
    team: 'Virtus.pro',
    kd: '16–12',
    adr: '81.7',
    kast: '79%',
    rating: 1.18
  },
  {
    name: 'fame',
    team: 'Virtus.pro',
    kd: '15–13',
    adr: '78.2',
    kast: '75%',
    rating: 1.12
  },
  {
    name: 'b1t',
    team: 'NAVI',
    kd: '14-15',
    adr: '76.3',
    kast: '71%',
    rating: 1.04
  },
  {
    name: 'iM',
    team: 'NAVI',
    kd: '13–16',
    adr: '71.8',
    kast: '68%',
    rating: 0.98
  }
])
</script>
