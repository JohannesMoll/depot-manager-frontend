import { Component, OnInit, OnDestroy, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { switchMap, takeUntil, map, distinctUntilChanged, startWith } from 'rxjs/operators';
import { Item, ItemState, Reservation, ItemCondition, ReportElement, TotalReportState } from '../../../common-module/_models';
import { ApiService, ReportProfileWithElements, ReportService } from '../../../common-module/_services';
import { toIsoDate, parseHttpError } from '../../../common-module/_helpers';
import { UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NbDialogService, NbDialogRef, NbToastrService } from '@nebular/theme';
import { Choice } from '../../../common-module/components/form-element/form-element.component';

class ReportElementFormGroup extends UntypedFormGroup {
    constructor(public readonly reportElement: ReportElement) {
        super({
            reportElementId: new UntypedFormControl(reportElement.id),
            state: new UntypedFormControl(null, Validators.required),
            comment: new UntypedFormControl(null),
        });
    }
}

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

    loading = false;
    submitted = false;

    conditionTranslation: Record<ItemCondition, [string, string]> = {
        good: ['Good', 'success'],
        ok: ['Ok', 'success'],
        bad: ['Bad', 'warning'],
        gone: ['Unavailable', 'danger'],
    };

    conditionChoices: Choice<ItemCondition>[] = [
        ItemCondition.Good,
        ItemCondition.Ok,
        ItemCondition.Bad,
        ItemCondition.Gone,
    ].map((value) => {
        return {
            value,
            title: this.conditionTranslation[value][0],
            status: this.conditionTranslation[value][1],
        };
    });

    reportProfile$: Observable<ReportProfileWithElements>;
    readonly reportForm: UntypedFormArray = new UntypedFormArray([]);
    readonly reportFormGroup: UntypedFormGroup = new UntypedFormGroup({
        lastService: new UntypedFormControl(new Date().toISOString().substring(0, 10)),
        totalReportState: new UntypedFormControl(null, Validators.required),
        report: this.reportForm,
        condition: new UntypedFormControl(null, Validators.required),
        conditionComment: new UntypedFormControl(''),
        changeComment: new UntypedFormControl('Inspection'),
    });

    private destroyed$ = new Subject<void>();

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router,
        public api: ApiService,
        private dialogService: NbDialogService,
        private reportService: ReportService,
        private toastrService: NbToastrService
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

            // Set up report profile observable
            if (item.reportProfileId) {
                this.reportProfile$ = this.reportService.profilesByIdWithElements$.pipe(
                    map((byId) => byId[item.reportProfileId]),
                    takeUntil(this.destroyed$)
                );
            }
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

    onNewReport($event: MouseEvent, dialog: TemplateRef<any>) {
        $event.preventDefault();
        $event.stopPropagation();

        if (!this.item || !this.item.reportProfileId) {
            this.toastrService.warning('Item must have a report profile assigned', 'No Report Profile');
            return;
        }

        // Initialize the report form
        this.reportForm.clear();
        this.submitted = false;
        this.reportFormGroup.reset({
            lastService: new Date().toISOString().substring(0, 10),
            totalReportState: null,
            condition: null,
            conditionComment: '',
            changeComment: 'Inspection',
        });

        // Load report profile elements
        this.reportService.profilesByIdWithElements$.pipe(
            map((byId) => byId[this.item.reportProfileId]),
            takeUntil(this.destroyed$)
        ).subscribe(reportProfile => {
            if (reportProfile != null) {
                for (const element of reportProfile.elements) {
                    const elementForm = new ReportElementFormGroup(element);
                    this.reportForm.push(elementForm);
                }
            }
        });

        this.dialogService.open(dialog, {
            hasBackdrop: true,
            closeOnBackdropClick: false,
            hasScroll: false,
            autoFocus: true,
        });
    }

    onSubmitReport(dialogRef: NbDialogRef<any>) {
        this.submitted = true;
        if (!this.reportFormGroup.valid) {
            return;
        }

        this.loading = true;
        const reportFormData = this.reportFormGroup.getRawValue();

        // Merge report data with existing item data (API requires all item fields)
        const reportData = {
            externalId: this.item.externalId,
            manufacturer: this.item.manufacturer,
            model: this.item.model,
            serialNumber: this.item.serialNumber,
            manufactureDate: this.item.manufactureDate,
            purchaseDate: this.item.purchaseDate,
            firstUseDate: this.item.firstUseDate,
            name: this.item.name,
            description: this.item.description,
            reportProfileId: this.item.reportProfileId,
            pictureId: this.item.pictureId,
            groupId: this.item.groupId,
            tags: this.item.tags,
            internalNotes: this.item.internalNotes,
            ...reportFormData, // This includes: lastService, totalReportState, report, condition, conditionComment, changeComment
        };

        this.api.reportItem(this.item.id, reportData).subscribe(
            (item) => {
                console.log('Report saved', item);
                this.toastrService.success('Report was saved', 'Report Saved');
                this.loading = false;
                this.submitted = false;
                dialogRef.close();

                // Reload item data
                this.item = item;
                this.loadHistory(item);
                this.loadReservations(item);
            },
            (error) => {
                console.log(error);
                this.toastrService.danger(parseHttpError(error), 'Failed');
                this.loading = false;
            }
        );
    }
}
