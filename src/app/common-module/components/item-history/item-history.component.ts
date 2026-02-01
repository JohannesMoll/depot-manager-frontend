import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ItemState } from '../../_models';
import { ApiService } from '../../_services';

interface FieldItem {
    key: string;
    value: any;
}

interface ItemStateWithArray extends ItemState {
    changesArray: FieldItem[];
}

@Component({
    selector: 'depot-item-history',
    templateUrl: './item-history.component.html',
    styleUrls: ['./item-history.component.scss'],
    standalone: false
})
export class ItemHistoryComponent implements OnChanges {
    @Input() states: ItemStateWithArray[];

    displayStates: ItemStateWithArray[];

    constructor(private api: ApiService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (this.states) {
            this.displayStates = this.states.filter((state) => state.comment && state.changesArray.length > 0);
        }
    }

    getPicturePreviewUrl(pictureId: string): string {
        return this.api.getPicturePreviewUrl(pictureId);
    }

    stateFields(state: ItemState): FieldItem[] {
        return Object.entries(state.changes).map(([key, value]) => ({ key, value }));
    }
}
