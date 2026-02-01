import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { shareReplay, switchMap, map } from 'rxjs/operators';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { NbToastrService } from '@nebular/theme';
import { Picture } from '../../_models';
import { ApiService } from '../../_services';
import { parseHttpError } from '../../_helpers';

@Component({
    selector: 'depot-picture-list',
    templateUrl: './picture-list.component.html',
    styleUrls: ['./picture-list.component.scss'],
    standalone: false
})
export class PictureListComponent implements OnInit {
    pictures$: Observable<Picture[]>;
    reload$ = new BehaviorSubject<void>(undefined);

    @Input() public selectedPicture: string;
    @Output() public selectPicture = new EventEmitter<string>();

    constructor(private api: ApiService, private toastrService: NbToastrService) {}

    ngOnInit() {
        this.pictures$ = this.reload$.pipe(
            switchMap(() => this.api.getPictures()),
            map(pictures => pictures.reverse()),
            shareReplay(1)
        );
    }

    getPictureUrl(picture: Picture): string {
        return this.api.getPicturePreviewUrl(picture.id);
    }

    onFileDrop(files: NgxFileDropEntry[]) {
        for (const droppedFile of files) {
            // Is it a file?
            if (droppedFile.fileEntry.isFile) {
                const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
                fileEntry.file((file: File) => {
                    this.api.createPicture(file).subscribe(
                        (pictureId) => {
                            console.log('Saved picture', pictureId);
                            this.reload$.next();
                            this.toastrService.success('Picture was uploaded successfully', 'Picture Uploaded');
                        },
                        (error) => {
                            console.error('Failed to upload picture', error);
                            this.toastrService.danger(parseHttpError(error), 'Upload Failed');
                        }
                    );
                });
            }
        }
    }

    onOpen(openFileSelectorCallback) {
        // Needed for correct typing :-/
        openFileSelectorCallback();
    }

    onDelete(event: Event, pictureId: string) {
        event.stopPropagation();
        if (confirm('Are you sure you want to delete this picture?')) {
            this.api.deletePicture(pictureId).subscribe(() => {
                console.log('Deleted picture', pictureId);
                this.reload$.next();
            });
        }
    }
}
