import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { Item, ItemState, Reservation } from '../../../common-module/_models';
import { ApiService } from '../../../common-module/_services';
import { toIsoDate } from '../../../common-module/_helpers';

interface FieldItem {
    key: string;
    value: any;
}

interface ItemStateWithArray extends ItemState {
    changesArray: FieldItem[];
}

@Component({
    selector: 'depot-item-details-page',
    templateUrl: './item-details-page.component.html',
    styleUrls: ['./item-details-page.component.scss'],
    standalone: false
})
export class ItemDetailsPageComponent implements OnInit, OnDestroy {
    item$: Observable<Item>;
    item: Item;
    reservationStart: string = toIsoDate(new Date());
    reservationEnd: string = toIsoDate(new Date(Date.now() + 60 * 60 * 24 * 1000));

    reservations: Reservation[] = [];
    itemHistoryWithState: ItemStateWithArray[] = [];

    page = 1;
    pageSize = 10;
    hasMorePages = true;

    private destroyed$ = new Subject<void>();

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router,
        public api: ApiService
    ) {}

    ngOnInit() {
        this.item$ = this.activatedRoute.paramMap.pipe(
            switchMap((params) => {
                const itemId = params.get('itemId');
                return this.api.getItem(itemId);
            }),
            takeUntil(this.destroyed$)
        );

        this.item$.pipe(takeUntil(this.destroyed$)).subscribe(item => {
            this.item = item;
            this.loadHistory(item);
            this.loadReservations(item);
        });
    }

    ngOnDestroy(): void {
        this.destroyed$.next();
    }

    loadHistory(item: Item) {
        this.api.getItemHistory(item.id, {
            start: this.reservationStart + 'T00:00:00',
            end: this.reservationEnd + 'T23:59:59',
            limit: 10,
            limitBeforeStart: 10,
            limitAfterEnd: 0,
        }).subscribe(history => {
            this.itemHistoryWithState = history.map(entry => ({
                changesArray: Object.entries(entry.changes)
                    .filter(([_, value]) => value != null)
                    .map(([key, value]) => ({ key, value: value.next })),
                ...entry,
            }));
        });
    }

    loadReservations(item: Item) {
        this.api.getReservationHistory(item.id, this.page, this.pageSize)
            .subscribe(newPage => {
                this.hasMorePages = newPage.length >= this.pageSize;
                this.reservations = [...this.reservations, ...newPage];
            });
    }

    loadNextPage(): void {
        this.page++;
        this.loadReservations(this.item);
    }

    onBack() {
        this.router.navigate(['/items']);
    }

    onEdit(item: Item) {
        this.router.navigate(['/', 'items', item.id]);
    }

    getPicturePreviewUrl(pictureId: string): string {
        return this.api.getPicturePreviewUrl(pictureId);
    }
}
