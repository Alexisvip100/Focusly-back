import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFolderInput } from './dto/create-folder.input';
import { UpdateFolderInput } from './dto/update-folder.input';
import { FirebaseService } from '../../firebase/firebase.service';
import { Folder } from './entities/folder.entity';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FoldersService {
  private collectionRef: admin.firestore.CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {
    this.collectionRef = this.firebaseService.db.collection('folders');
  }

  async create(
    createFolderInput: CreateFolderInput,
    userId: string,
  ): Promise<Folder> {
    const id = uuidv4();
    const newFolderRef = this.collectionRef.doc(id);
    const now = new Date();

    const folderData: any = {
      id: newFolderRef.id,
      userId,
      name: createFolderInput.name,
      color: createFolderInput.color,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    };

    // Remove undefined fields for Firestore
    Object.keys(folderData).forEach(
      (key) => folderData[key] === undefined && delete folderData[key],
    );

    await newFolderRef.set(folderData);

    return {
      ...folderData,
      createdAt: now,
      updatedAt: now,
    } as Folder;
  }

  async findAll(userId: string): Promise<Folder[]> {
    const snapshot = await this.collectionRef
      .where('userId', '==', userId)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Folder;
    });
  }

  async findOne(id: string, userId: string): Promise<Folder> {
    const doc = await this.collectionRef.doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    const data = doc.data()!;
    if (data.userId !== userId) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Folder;
  }

  async update(
    id: string,
    updateFolderInput: UpdateFolderInput,
    userId: string,
  ): Promise<Folder> {
    const docRef = this.collectionRef.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    const data = doc.data()!;
    if (data.userId !== userId) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    const now = new Date();
    const updateData: any = {
      ...updateFolderInput,
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    };

    delete updateData.id;

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data()!;

    return {
      ...updatedData,
      createdAt: updatedData.createdAt.toDate(),
      updatedAt: updatedData.updatedAt.toDate(),
    } as Folder;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const docRef = this.collectionRef.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    const data = doc.data()!;
    if (data.userId !== userId) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    // Set folderId to null for all workspaces in this folder
    const workspacesRef = this.firebaseService.db.collection('workspaces');
    const workspacesSnapshot = await workspacesRef
      .where('folderId', '==', id)
      .get();
    
    const batch = this.firebaseService.db.batch();
    workspacesSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { folderId: null });
    });
    await batch.commit();

    await docRef.delete();
    return true;
  }

  async getTotalFolders(userId: string): Promise<number> {
    const snapshot = await this.collectionRef
      .where('userId', '==', userId)
      .count()
      .get();
    return snapshot.data().count;
  }
}
