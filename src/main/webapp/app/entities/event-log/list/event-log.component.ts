import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { EventLog, IEventLog } from '../event-log.model';
import { EventLogService } from '../service/event-log.service';
import { EventLogDeleteDialogComponent } from '../delete/event-log-delete-dialog.component';
import { FormBuilder, NgForm } from '@angular/forms';
import { finalize, map, Observable } from 'rxjs';
import { IUser } from 'app/admin/user-management/user-management.model';
import { IEventLogBook } from 'app/entities/event-log-book/event-log-book.model';
import { ITags } from 'app/entities/tags/tags.model';

import { UserService } from 'app/entities/user/user.service';
import { EventLogBookService } from 'app/entities/event-log-book/service/event-log-book.service';
import { TagsService } from 'app/entities/tags/service/tags.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'jhi-event-log',
  templateUrl: './event-log.component.html',
})
export class EventLogComponent implements OnInit, OnDestroy {
  skillsSet: any;
  skills: string[] = [];
  tagsid: ITags[] = [];
  data!: ITags;
  tagValue: ITags[] = [];
  isInsert?: boolean;
  eventLogs: IEventLog[] = [];
  isLoading = false;
  filterEventLogs = '';
  filteredAndSortedEventLogs: IEventLog[] = [];
  orderProp: keyof IEventLog = 'name';
  @Input() event?: IEventLogBook[];
  @Input() eventID: any;

  range = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  // For Edit Pop up

  eventLogRef?: IEventLog;
  @ViewChild('content') content?: TemplateRef<any>;
  isSaving?: boolean;

  // Services Content

  usersSharedCollection: IUser[] = [];
  tagsSharedCollection: ITags[] = [];
  eventLogBooksSharedCollection: IEventLogBook[] = [];

  constructor(
    protected router: Router,
    protected eventLogService: EventLogService,
    protected modalService: NgbModal,
    protected fb: FormBuilder,
    protected userService: UserService,
    protected tagsService: TagsService,
    protected eventLogBookService: EventLogBookService
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
  }
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }

  loadAll(): void {
    this.isLoading = true;

    this.eventLogService.query().subscribe({
      next: (res: HttpResponse<IEventLog[]>) => {
        this.isLoading = false;
        this.eventLogs = res.body ?? [];
        this.filteredAndSortedEventLogs = res.body ?? [];
        if (this.eventID !== undefined && this.eventID !== null && this.eventID !== '') {
          this.filterById(this.filteredAndSortedEventLogs);
        }
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  ngOnInit(): void {
    this.isInsert = true;
    this.loadAll();
    this.loadRelationshipsOptions();
  }

  trackId(index: number, item: IEventLog): number {
    return item.id!;
  }

  sortdate(): void {
    const sortData = this.filteredAndSortedEventLogs.length > 0 ? this.filteredAndSortedEventLogs : this.eventLogs;
    this.filteredAndSortedEventLogs = sortData
      .filter(
        eventLog => eventLog.createdDate && eventLog.createdDate >= this.range.value.start && eventLog.createdDate <= this.range.value.end
      )
      .sort();
  }

  delete(eventLog: IEventLog): void {
    const modalRef = this.modalService.open(EventLogDeleteDialogComponent, { size: 'xl', backdrop: 'static' });
    modalRef.componentInstance.eventLog = eventLog;
    // unsubscribe not needed because closed completes on modal close
    modalRef.closed.subscribe(reason => {
      if (reason === 'deleted') {
        this.loadAll();
      }
    });
  }

  // Filtering based on name

  filterAndSortEventLogs(): void {
    // filteredAndSortedEventLogs

    this.filteredAndSortedEventLogs = this.eventLogs
      .filter(eventLog => !this.filterEventLogs || eventLog.name?.toLowerCase().includes(this.filterEventLogs.toLowerCase()))
      .sort();
  }

  // ngOnDestroy(): void {
  //   console.log('data event');

  //   if (this.reload) {

  //     this.reload.unsubscribe();

  //   }
  // }

  // Clear Button Function

  onClear(): void {
    this.filterEventLogs = '';
    if (this.eventID === undefined || this.eventID === null || this.eventID === '') {
      this.filterAndSortEventLogs();
    }
  }

  onEdit(eventLog: IEventLog): void {
    this.eventLogRef = eventLog;
    console.log('Event log', eventLog);
    console.log('event log ref', this.eventLogRef);
    this.modalService.open(this.content);
  }

  onSubmit(editForm: NgForm): void {
    this.isSaving = true;

    const eventLog = this.createFromForm(editForm.value);
    eventLog.tags = this.tagsid;
    if (eventLog.id !== undefined) {
      console.log('event Log submit', eventLog);
      this.subscribeToSaveResponse(this.eventLogService.update(eventLog));
    } else {
      this.subscribeToSaveResponse(this.eventLogService.create(eventLog));
    }

    this.modalService.dismissAll();
  }

  // Tags

  trackUserById(index: number, item: IUser): number {
    return item.id!;
  }

  trackTagsById(index: number, item: ITags): number {
    return item.id!;
  }

  trackEventLogBookById(index: number, item: IEventLogBook): number {
    return item.id!;
  }

  getSelectedTags(option: ITags, selectedVals?: ITags[]): ITags {
    if (selectedVals) {
      for (const selectedVal of selectedVals) {
        if (option.id === selectedVal.id) {
          return selectedVal;
        }
      }
    }
    return option;
  }

  filterById(eventLogs: any[]): void {
    this.filteredAndSortedEventLogs = eventLogs.filter(arr => {
      if (arr.eventLogBook?.id === this.eventID && this.eventID !== undefined) {
        return arr;
      }
    });
  }

  // my changes in tags
  fetchtag(skillsSet: string, tag: ITags): void {
    let flag = 1;
    this.tagsService.query().subscribe(response => {
      if (response.body !== null) {
        response.body.map(data => {
          if (data.name === skillsSet) {
            flag = 0;
            this.tagsid.push({
              id: data.id,
            });
          }
        });
      }
      if (flag === 1) {
        this.tagsService.create(tag).subscribe(responsedata => {
          if (responsedata.body !== null) {
            this.tagsid.push({
              id: responsedata.body.id,
            });
          }
        });
      }
    });
  }

  onSkillsSetKeydown(): any {
    if (this.skillsSet === '' || this.skillsSet === null) {
      return;
    }
    this.skills.push(this.skillsSet);
    this.data = {
      name: this.skillsSet,
    };
    this.fetchtag(this.skillsSet, this.data);
    this.tagValue.push(this.data);
    this.skillsSet = '';
  }

  dropSkill(index: any): any {
    this.skills.splice(index, 1);
    this.tagValue.splice(index, 1);
    this.tagsid.splice(index, 1);
  }

  protected loadRelationshipsOptions(): void {
    this.userService
      .query()
      .pipe(map((res: HttpResponse<IUser[]>) => res.body ?? []))
      .pipe(map((users: IUser[]) => this.userService.addUserToCollectionIfMissing(users, this.eventLogRef?.user)))
      .subscribe((users: IUser[]) => (this.usersSharedCollection = users));

    this.tagsService
      .query()
      .pipe(map((res: HttpResponse<ITags[]>) => res.body ?? []))
      .pipe(map((tags: ITags[]) => this.tagsService.addTagsToCollectionIfMissing(tags, ...(this.eventLogRef?.tags ?? []))))
      .subscribe((tags: ITags[]) => (this.tagsSharedCollection = tags));

    this.eventLogBookService
      .query()
      .pipe(map((res: HttpResponse<IEventLogBook[]>) => res.body ?? []))
      .pipe(
        map((eventLogBooks: IEventLogBook[]) =>
          this.eventLogBookService.addEventLogBookToCollectionIfMissing(eventLogBooks, this.eventLogRef?.eventLogBook)
        )
      )
      .subscribe((eventLogBooks: IEventLogBook[]) => (this.eventLogBooksSharedCollection = eventLogBooks));
  }

  protected createFromForm(editForm: IEventLog): IEventLog {
    const selectedlog = this.eventLogs.find(logs => logs.uuid === editForm.uuid);
    return {
      ...new EventLog(),
      ...selectedlog,
      ...editForm,
    };
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IEventLog>>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: res => this.onSaveSuccess(res.body ?? {}),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveFinalize(): void {
    this.isSaving = false;
  }

  protected onSaveSuccess(res: IEventLog): void {
    const selectedLog = this.eventLogs.findIndex(logs => logs.uuid === res.uuid);

    if (selectedLog >= 0 && this.eventLogs[selectedLog]) {
      this.eventLogs[selectedLog] = res;
      this.filteredAndSortedEventLogs[selectedLog] = res;
      // this.eventLogs[selectedLog] = res;
    }
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  // Show Event-Log Details in Event-Log-Book - Created by shan 17-03
}
