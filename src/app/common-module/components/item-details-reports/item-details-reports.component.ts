import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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

    displayStates: ItemStateWithArray[];

    ngOnChanges(changes: SimpleChanges): void {
        if (this.states) {
            this.displayStates = this.states.filter((state) => state.comment && state.report != null);
        }
    }
}
