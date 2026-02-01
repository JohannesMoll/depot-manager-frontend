import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { NbDialogRef } from '@nebular/theme';
import { ItemState } from '../../_models';

interface FieldItem {
    key: string;
    value: any;
}

interface ItemStateWithArray extends ItemState {
    changesArray: FieldItem[];
}

@Component({
    selector: 'depot-item-details-reports',
    templateUrl: './item-details-reports.component.html',
    styleUrls: ['./item-details-reports.component.scss'],
    standalone: false
})
export class ItemDetailsReportsComponent implements OnChanges {
    @Input() states: ItemStateWithArray[];
    @Input() itemId: string;
    @Input() dialog?: NbDialogRef<any>;

    displayStates: ItemStateWithArray[];

    constructor(private router: Router) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (this.states) {
            this.displayStates = this.states.filter((state) => state.comment && state.report != null);
        }
    }

    showReport(reportId: string): void {
        // Close the dialog if it exists (when opened from modal)
        if (this.dialog) {
            this.dialog.close();
        }
        this.router.navigate(['/report', this.itemId, reportId]);
    }
}
