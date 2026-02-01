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

            // TODO: introduce a api endpoint to get a specific report by its ID (without fetching the whole item history)
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

    exportAsPdf(): void {
        const report = document.querySelector('.report-details') as HTMLElement;
        if (!report) return;

        // Create a printable version
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const styles = `
            <style>
                body { font-family: Arial, sans-serif; margin: 2rem; }
                .report-header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #333; }
                .header-main h3 { margin: 0 0 1rem 0; font-size: 1.5rem; }
                .header-meta { display: flex; gap: 2rem; margin-top: 1rem; }
                .meta-item { display: flex; align-items: center; gap: 0.5rem; color: #666; }
                .report-element-item { padding: 1.5rem 0; }
                .element-header h5 { margin: 0 0 1rem 0; font-size: 1.2rem; }
                .element-content { margin-left: 1rem; }
                .report-description, .report-rating, .report-comment { margin-bottom: 1rem; }
                strong { display: block; margin-bottom: 0.5rem; color: #666; text-transform: uppercase; font-size: 0.85rem; }
                .status-badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 0.25rem; margin-top: 0.5rem; }
                .status-success { background-color: #d4edda; color: #155724; }
                .status-warning { background-color: #fff3cd; color: #856404; }
                .status-danger { background-color: #f8d7da; color: #721c24; }
                .status-basic { background-color: #e2e3e5; color: #383d41; }
                .element-divider { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
                p { margin: 0.5rem 0; line-height: 1.6; }
                nb-icon { font-size: 1rem !important; width: 1rem; height: 1rem; display: inline-block; }
                nb-icon svg { width: 1rem; height: 1rem; }
                @media print { body { margin: 0; } }
            </style>
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Report - ${report.querySelector('h3')?.textContent || 'Export'}</title>
                ${styles}
            </head>
            <body>
                ${report.innerHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}
