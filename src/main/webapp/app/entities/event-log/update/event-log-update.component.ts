import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { IEventLog, EventLog } from '../event-log.model';
import { EventLogService } from '../service/event-log.service';
import { IUser } from 'app/entities/user/user.model';
import { UserService } from 'app/entities/user/user.service';
import { ITags } from 'app/entities/tags/tags.model';
import { TagsService } from 'app/entities/tags/service/tags.service';
import { IEventLogBook } from 'app/entities/event-log-book/event-log-book.model';
import { EventLogBookService } from 'app/entities/event-log-book/service/event-log-book.service';

@Component({
  selector: 'jhi-event-log-update',
  templateUrl: './event-log-update.component.html',
})
export class EventLogUpdateComponent implements OnInit {
  isSaving = false;
  skillsSet: any;
  skills: string[] = [];
  usersSharedCollection: IUser[] = [];
  tagsSharedCollection: ITags[] = [];
  eventLogBooksSharedCollection: IEventLogBook[] = [];
  data!: ITags;
  tagValue: ITags[] = [];
  isInsert?: boolean;
  editForm = this.fb.group({
    id: [],
    uuid: [],
    name: [],
    detail: [null, [Validators.required]],
    createdDate: [],
    updatedDate: [],
    user: [],
    tags: [],
    eventLogBook: [],
  });

  constructor(
    protected eventLogService: EventLogService,
    protected userService: UserService,
    protected tagsService: TagsService,
    protected eventLogBookService: EventLogBookService,
    protected activatedRoute: ActivatedRoute,
    protected fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.isInsert = true;
    this.activatedRoute.data.subscribe(({ eventLog }) => {
      this.updateForm(eventLog);

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    const eventLog = this.createFromForm();
    console.log('aaaa');
    console.log(eventLog);
    // this.saveTag();

    if (eventLog.id !== undefined) {
      this.subscribeToSaveResponse(this.eventLogService.update(eventLog));
    } else {
      this.subscribeToSaveResponse(this.eventLogService.create(eventLog));
    }
    // this.skills=[];
  }

  saveTag(): void {
    this.tagValue.forEach(value => {
      this.tagsService.create(value).subscribe(response => {
        console.log(response);
      });
    });
  }

  trackUserById(index: number, item: IUser): number {
    return item.id!;
  }

  trackTagsById(index: number, item: ITags): number {
    return item.id!;
  }

  trackTagsByName(index: any, item: ITags): any {
    return item.name!;
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

  onSkillsSetKeydown(): any {
    if (this.skillsSet === '' || this.skillsSet === null) {
      return;
    }
    this.skills.push(this.skillsSet);
    this.data = {
      name: this.skillsSet,
    };
    this.tagValue.push(this.data);
    this.skillsSet = '';
  }

  dropSkill(index: any): any {
    this.skills.splice(index, 1);
    this.tagValue.splice(index, 1);
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IEventLog>>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving = false;
  }

  protected updateForm(eventLog: IEventLog): void {
    this.editForm.patchValue({
      id: eventLog.id,
      uuid: eventLog.uuid,
      name: eventLog.name,
      detail: eventLog.detail,
      createdDate: eventLog.createdDate,
      updatedDate: eventLog.updatedDate,
      user: eventLog.user,
      tags: eventLog.tags,
      eventLogBook: eventLog.eventLogBook,
    });

    this.usersSharedCollection = this.userService.addUserToCollectionIfMissing(this.usersSharedCollection, eventLog.user);
    this.tagsSharedCollection = this.tagsService.addTagsToCollectionIfMissing(this.tagsSharedCollection, ...(eventLog.tags ?? []));
    this.eventLogBooksSharedCollection = this.eventLogBookService.addEventLogBookToCollectionIfMissing(
      this.eventLogBooksSharedCollection,
      eventLog.eventLogBook
    );
  }

  protected loadRelationshipsOptions(): void {
    this.userService
      .query()
      .pipe(map((res: HttpResponse<IUser[]>) => res.body ?? []))
      .pipe(map((users: IUser[]) => this.userService.addUserToCollectionIfMissing(users, this.editForm.get('user')!.value)))
      .subscribe((users: IUser[]) => (this.usersSharedCollection = users));

    this.tagsService
      .query()
      .pipe(map((res: HttpResponse<ITags[]>) => res.body ?? []))
      .pipe(map((tags: ITags[]) => this.tagsService.addTagsToCollectionIfMissing(tags, ...(this.editForm.get('tags')!.value ?? []))))
      .subscribe((tags: ITags[]) => (this.tagsSharedCollection = tags));

    this.eventLogBookService
      .query()
      .pipe(map((res: HttpResponse<IEventLogBook[]>) => res.body ?? []))
      .pipe(
        map((eventLogBooks: IEventLogBook[]) =>
          this.eventLogBookService.addEventLogBookToCollectionIfMissing(eventLogBooks, this.editForm.get('eventLogBook')!.value)
        )
      )
      .subscribe((eventLogBooks: IEventLogBook[]) => (this.eventLogBooksSharedCollection = eventLogBooks));
  }

  protected createFromForm(): IEventLog {
    return {
      ...new EventLog(),
      id: this.editForm.get(['id'])!.value,
      uuid: uuidv4(),
      name: this.editForm.get(['name'])!.value,
      detail: this.editForm.get(['detail'])!.value,
      createdDate: this.editForm.get(['createdDate'])!.value,
      updatedDate: this.editForm.get(['updatedDate'])!.value,
      user: this.editForm.get(['user'])!.value,
      tags: this.tagValue,
      eventLogBook: this.editForm.get(['eventLogBook'])!.value,
    };
  }
}
