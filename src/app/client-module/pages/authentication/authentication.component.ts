import { Component, effect, Signal, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { NbButtonModule, NbCardModule, NbListModule, NbIconModule, NbSpinnerModule } from '@nebular/theme';
import { filter, map, startWith, switchMap, catchError } from 'rxjs/operators';
import { AuthService, ApiService } from 'src/app/common-module/_services';
import { Reservation } from 'src/app/common-module/_models';
import { Observable, of } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
    imports: [
        CommonModule,
        DatePipe,
        NbButtonModule,
        NbCardModule,
        NbListModule,
        NbIconModule,
        NbSpinnerModule,
        RouterLink,
    ],
    standalone: true,
    styles: `
        :host {
            display: block;
            padding: 2rem;
            height: 100%;
            overflow-y: auto;
        }

        .login-container {
            display: grid;
            grid-gap: 1em;
            height: 100%;
            place-content: center;
        }

        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
        }

        .dashboard-header {
            margin-bottom: 2rem;
        }

        .dashboard-cards {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-gap: 1.5rem;
            margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
            .dashboard-cards {
                grid-template-columns: 1fr;
            }
        }

        nb-card {
            height: 100%;
            position: relative;
            overflow: hidden;
        }

        nb-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.75;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 1;
        }

        nb-card > * {
            position: relative;
            z-index: 2;
        }

        nb-card:first-child {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        nb-card:first-child nb-card-header,
        nb-card:first-child nb-card-body {
            color: white;
            border-color: rgba(255, 255, 255, 0.2);
        }

        nb-card:nth-child(2) {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            grid-row: span 2;
        }

        @media (max-width: 768px) {
            nb-card:nth-child(2) {
                grid-row: auto;
            }
        }

        nb-card:nth-child(2) nb-card-header,
        nb-card:nth-child(2) nb-card-body {
            color: white;
            border-color: rgba(255, 255, 255, 0.2);
        }

        nb-card:nth-child(2) .reservation-dates {
            color: rgba(255, 255, 255, 0.85);
        }

        nb-card:nth-child(2) .no-reservations {
            color: rgba(255, 255, 255, 0.85);
        }

        nb-card:nth-child(3) {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
        }

        nb-card:nth-child(3) nb-card-header,
        nb-card:nth-child(3) nb-card-body {
            color: white;
            border-color: rgba(255, 255, 255, 0.2);
        }

        nb-card:nth-child(3) .news-placeholder {
            color: rgba(255, 255, 255, 0.85);
        }

        .reservation-item {
            padding: 0.5rem 0;
            cursor: pointer;
            transition: background-color 0.2s;
            border-radius: 4px;
            padding: 0.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
        }

        .reservation-item:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

        .reservation-info {
            flex: 1;
        }

        .reservation-item button {
            flex-shrink: 0;
        }

        .reservation-name {
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .reservation-dates {
            color: rgba(255, 255, 255, 0.85);
            font-size: 0.875rem;
        }

        .no-reservations {
            text-align: center;
            color: rgba(255, 255, 255, 0.85);
            padding: 2rem;
        }

        .error-message {
            color: #ff3d71;
            text-align: center;
        }

        .button-group {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 1rem;
        }

        .button-group a {
            width: 100%;
        }

        .old-reservations-button {
            display: flex;
            justify-content: center;
            margin-top: 1rem;
            padding-top: 1rem;
        }

        .news-placeholder {
            text-align: center;
            padding: 2rem;
            color: rgba(255, 255, 255, 0.85);
        }

        .reservations-list {
            max-height: 480px;
            overflow-y: auto;
            margin: -1rem;
            padding: 1rem;
        }

        .reservations-list::-webkit-scrollbar {
            width: 8px;
        }

        .reservations-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }

        .reservations-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
        }

        .reservations-list::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.4);
        }
    `,
    template: ` @if (lastError(); as error) {
            <p class="error-message">{{ error }}</p>
        }
        @if (loggedIn()) {
            <div class="dashboard">
                <div class="dashboard-header">
                    <h1>Willkommen, {{ name() }}!</h1>
                </div>

                <div class="dashboard-cards">
                    <nb-card>
                        <nb-card-header>
                            <nb-icon icon="home-outline"></nb-icon>
                            Willkommen im Depot
                        </nb-card-header>
                        <nb-card-body>
                            <p>Herzlich willkommen im Depot-Verwaltungssystem der JDAV Freiburg!</p>
                            <p>
                                Hier können Sie Ihre Reservierungen verwalten und Ausrüstung für Ihre Aktivitäten
                                ausleihen.
                            </p>
                            <div class="button-group">
                                <a nbButton status="primary" routerLink="/reservations"> Alle Reservierungen anzeigen </a>
                                <a nbButton status="primary" routerLink="/reservations/new">
                                    Neue Reservierung erstellen
                                </a>
                            </div>
                        </nb-card-body>
                    </nb-card>

                    <nb-card>
                        <nb-card-header>
                            <nb-icon icon="calendar-outline"></nb-icon>
                            Meine aktuellen Reservierungen
                        </nb-card-header>
                        <nb-card-body>
                            @if (loadingReservations()) {
                                <div style="display: flex; justify-content: center; padding: 2rem;">
                                    <nb-spinner></nb-spinner>
                                </div>
                            } @else if (userReservations() && userReservations().length > 0) {
                                <div class="reservations-list">
                                    <nb-list>
                                        @for (reservation of userReservations(); track reservation.id) {
                                            <nb-list-item class="reservation-item">
                                                <div class="reservation-info" (click)="onClickReservation(reservation)">
                                                    <div class="reservation-name">{{ reservation.name }}</div>
                                                    <div class="reservation-dates">
                                                        {{ reservation.start | date: 'dd.MM.yyyy' }} -
                                                        {{ reservation.end | date: 'dd.MM.yyyy' }}
                                                    </div>
                                                </div>
                                                <button nbButton size="small" status="basic" (click)="onClickReservation(reservation)">
                                                    Details
                                                </button>
                                            </nb-list-item>
                                        }
                                    </nb-list>
                                </div>
                            } @else {
                                <div class="no-reservations">Keine aktiven Reservierungen vorhanden</div>
                            }
                            <div class="old-reservations-button">
                                <button nbButton status="primary" size="small" routerLink="/reservations">
                                    Alte Reservierungen anzeigen
                                </button>
                            </div>
                        </nb-card-body>
                    </nb-card>

                    <!-- TODO: develop a news feature to display important updates and announcements from the materialteam -->
                    <!--  <nb-card>
                        <nb-card-header>
                            <nb-icon icon="bell-outline"></nb-icon>
                            Depot News
                        </nb-card-header>
                        <nb-card-body>
                            <div class="news-placeholder">
                                <p>Aktuell gibt es keine Neuigkeiten.</p>
                            </div>
                        </nb-card-body>
                    </nb-card>  -->
                </div>
            </div>
        } @else {
            <div class="login-container">
                <button nbButton type="button" (click)="login()">Einloggen</button>
            </div>
        }`,
})
export class AuthenticationComponent implements OnInit {
    #returnUrl: string;

    loggedIn: Signal<boolean>;
    name: Signal<string>;
    lastError: Signal<string>;
    userReservations: Signal<Reservation[]>;
    loadingReservations: Signal<boolean>;

    constructor(
        private readonly auth: AuthService,
        private readonly api: ApiService,
        private readonly router: Router,
        route: ActivatedRoute
    ) {
        this.loggedIn = toSignal(auth.loggedIn$);
        this.lastError = toSignal(auth.lastError$);
        this.name = toSignal(
            auth.user$.pipe(
                filter(Boolean),
                map((user) => user.given_name)
            )
        );

        // Load user reservations when logged in
        const reservations$ = this.auth.loggedIn$.pipe(
            switchMap((loggedIn) =>
                loggedIn ? this.api.getReservationsByUser().pipe(catchError(() => of([]))) : of([])
            )
        );

        this.userReservations = toSignal(reservations$, { initialValue: [] });
        this.loadingReservations = toSignal(of(false), { initialValue: false });

        const queryParams = toSignal(route.queryParams);
        effect(() => {
            const params = queryParams();
            if (Object.hasOwnProperty.call(params, 'returnUrl')) {
                this.#returnUrl = decodeURIComponent(params.returnUrl);
            }
        });
    }

    ngOnInit() {
        // Nothing needed here anymore - all setup in constructor
    }

    onClickReservation(reservation: Reservation) {
        this.router.navigate(['/reservations', reservation.id]);
    }

    logout() {
        this.auth.logout();
    }

    login() {
        this.auth.login(this.#returnUrl);
    }
}
