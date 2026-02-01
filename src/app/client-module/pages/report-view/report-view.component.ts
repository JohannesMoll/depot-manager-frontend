import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { ItemState } from '../../../common-module/_models';
import { ApiService } from '../../../common-module/_services';

@Component({
    selector: 'depot-report-view',
    templateUrl: './report-view.component.html',
    styleUrls: ['./report-view.component.scss'],
    standalone: false
})
export class ReportViewComponent implements OnInit, OnDestroy {
    report$: Observable<ItemState>;
    private destroyed$ = new Subject<void>();

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router,
        public api: ApiService
    ) {}

    ngOnInit() {
        this.report$ = this.activatedRoute.paramMap.pipe(
            switchMap((params) => {
                const reportId = params.get('reportId');
                const itemId = params.get('itemId');
                // Get item history and find the specific report by ID
                return this.api.getItemHistory(itemId, {}).pipe(
                    map(history => history.find(state => state.id === reportId))
                );
            }),
            takeUntil(this.destroyed$)
        );
    }

    ngOnDestroy(): void {
        this.destroyed$.next();
    }

    onBack() {
        this.router.navigate(['/items']);
    }
}
