import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { ItemsService } from '../../_services';

@Component({
    selector: 'depot-tags-input',
    templateUrl: './tags-input.component.html',
    styleUrls: ['./tags-input.component.scss'],
    standalone: false
})
export class TagsInputComponent {
    @Input() formControlRef: UntypedFormControl;
    @Input() title = '';
    @Input() submitted = false;

    @Output() change: EventEmitter<Event> = new EventEmitter();

    readonly itemTags$: Observable<string[]>;

    constructor(private itemTags: ItemsService) {
        this.itemTags$ = itemTags.itemTags$;
    }
}
