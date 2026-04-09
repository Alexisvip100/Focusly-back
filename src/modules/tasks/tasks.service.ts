import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ITask } from './interfaces/task.interface';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { TaskFilterInput, TaskSortInput } from './dto/create-task.input';
import { Filter } from 'firebase-admin/firestore';

@Injectable()
export class TasksService {
  private collection: admin.firestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.collection = this.firebaseService.db.collection('tasks');
  }

  async create(taskData: Partial<ITask>): Promise<ITask> {
    const id = uuidv4();
    const docRef = this.collection.doc(id);
    const now = new Date();

    const task: ITask = {
      ...taskData,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
      tags: taskData.tags,
      subtasks: taskData.subtasks?.map((s) => ({ ...s })) || [],
    } as ITask;

    const cleanedData = this.sanitizeData({
      ...taskData,
      id: docRef.id,
      deletedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await docRef.set(cleanedData);

    return task;
  }

  async findAll(): Promise<ITask[]> {
    const snapshot = await this.collection.where('deletedAt', '==', null).get();
    return snapshot.docs.map((doc) => this.mapToTask(doc.data()));
  }

  async filterByStatus(
    filters: TaskFilterInput,
    sort?: TaskSortInput,
  ): Promise<ITask[]> {
    const fireStoreFilters: Filter[] = [Filter.where('deletedAt', '==', null)];
    if (filters.status) {
      fireStoreFilters.push(Filter.where('status', '==', filters.status));
    }
    if (filters.priorityLevel) {
      fireStoreFilters.push(
        Filter.where('priorityLevel', '==', filters.priorityLevel),
      );
    }
    if (filters.category) {
      fireStoreFilters.push(Filter.where('category', '==', filters.category));
    }

    let query: admin.firestore.Query = this.collection.where(
      Filter.and(...fireStoreFilters),
    );

    if (sort && sort.sort) {
      const fieldMap: Record<string, string> = {
        deadline: 'deadline',
        priority_level: 'priorityLevel',
        estimate_minutes: 'estimateTimer',
        created_at: 'createdAt',
      };
      const field = fieldMap[sort.sort] || sort.sort;
      const direction =
        sort.order?.toLowerCase() === 'desc' ? 'desc' : ('asc' as const);
      query = query.orderBy(field, direction);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.mapToTask(doc.data()));
  }

  async findAllByUser(
    userId: string,
    filters?: TaskFilterInput,
    sort?: TaskSortInput,
  ): Promise<ITask[]> {
    const fireStoreFilters: Filter[] = [Filter.where('userId', '==', userId)];
    fireStoreFilters.push(Filter.where('deletedAt', '==', null));

    if (filters) {
      if (filters.status) {
        fireStoreFilters.push(Filter.where('status', '==', filters.status));
      }
      if (filters.priorityLevel) {
        fireStoreFilters.push(
          Filter.where('priorityLevel', '==', filters.priorityLevel),
        );
      }
      if (filters.category) {
        fireStoreFilters.push(Filter.where('category', '==', filters.category));
      }
    }

    let query: admin.firestore.Query = this.collection.where(
      Filter.and(...fireStoreFilters),
    );

    if (sort && sort.sort) {
      const fieldMap: Record<string, string> = {
        deadline: 'deadline',
        priority_level: 'priorityLevel',
        estimate_minutes: 'estimateTimer',
        created_at: 'createdAt',
      };
      const field = fieldMap[sort.sort] || sort.sort;
      const direction =
        sort.order?.toLowerCase() === 'desc' ? 'desc' : ('asc' as const);
      query = query.orderBy(field, direction);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.mapToTask(doc.data()));
  }

  async findOne(id: string): Promise<ITask> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return this.mapToTask(doc.data()!);
  }

  async update(id: string, updateData: Partial<ITask>): Promise<ITask> {
    const docRef = this.collection.doc(id);
    const sanitizedUpdate = this.sanitizeData(updateData);

    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        ...sanitizedUpdate,
        id: id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedAt: null,
      });
    } else {
      await docRef.update({
        ...sanitizedUpdate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const updatedDoc = await docRef.get();
    return this.mapToTask(updatedDoc.data()!);
  }

  // Cambiamos 'Record<string, unknown>' por un genérico 'T extends object'
  async addSubtask<T extends object>(id: string, subtask: T): Promise<ITask> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const taskData = doc.data();
    const currentSubtasks =
      (taskData?.subtasks as Record<string, unknown>[]) || [];

    // this.sanitizeData se encargará de convertir tu SubtaskInput en un objeto plano para Firestore
    const newSubtasks = [...currentSubtasks, this.sanitizeData(subtask)];

    await docRef.update({
      subtasks: newSubtasks,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return docRef.get().then((d) => this.mapToTask(d.data()!));
  }

  async delete(id: string): Promise<void> {
    const docRef = this.collection.doc(id);

    const workspacesSnapshot = await this.firebaseService.db
      .collection('workspaces')
      .where('taskId', '==', id)
      .get();

    if (!workspacesSnapshot.empty) {
      const batch = this.firebaseService.db.batch();
      workspacesSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          taskId: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    await docRef.delete();
  }

  async deleteWorkspaceTasks(workspaceId: string): Promise<void> {
    const snapshot = await this.collection
      .where('workspaceId', '==', workspaceId)
      .get();
    const batch = this.firebaseService.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  private sanitizeData<T>(data: T): T {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    if (data instanceof Date || data instanceof admin.firestore.FieldValue) {
      return data;
    }

    if (Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return data.map((item) => this.sanitizeData(item)) as unknown as T;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = this.sanitizeData(value);
      }
    }
    return sanitized as T;
  }

  private mapToTask(data: admin.firestore.DocumentData): ITask {
    const convertDate = (val: unknown): Date | undefined => {
      if (!val) return undefined;
      if (val instanceof admin.firestore.Timestamp) {
        return val.toDate();
      }
      if (val instanceof Date) {
        return isNaN(val.getTime()) ? undefined : val;
      }
      if (typeof val === 'string') {
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : date;
      }
      return undefined;
    };

    const subtasksRaw = (data.subtasks as Record<string, unknown>[]) || [];

    return {
      ...data,
      deadline: convertDate(data.deadline),
      createdAt: convertDate(data.createdAt)!,
      updatedAt: convertDate(data.updatedAt)!,
      completedAt: convertDate(data.completedAt),
      deletedAt: convertDate(data.deletedAt),
      duration: convertDate(data.duration),
      subtasks: subtasksRaw.map((s) => ({
        title: (s.title as string) || 'Untitled',
        completed: (s.completed as boolean) || false,
        timer: (s.timer as number) || 0,
        notesEncrypted: s.notesEncrypted as string | undefined,
        estimateTimer: s.estimateTimer as number | undefined,
        priorityLevel: s.priorityLevel as string | undefined,
        status: s.status as string | undefined,
        deadline: convertDate(s.deadline),
        category: s.category as string | undefined,
      })),
    } as ITask;
  }
}
