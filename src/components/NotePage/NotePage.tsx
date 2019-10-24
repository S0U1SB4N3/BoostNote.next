import React, { useMemo, useCallback } from 'react'
import NoteList from './NoteList'
import NoteDetail from './NoteDetail'
import {
  useRouteParams,
  StorageAllNotes,
  StorageNotesRouteParams,
  StorageTrashCanRouteParams,
  StorageTagsRouteParams,
  usePathnameWithoutNoteId,
  useRouter
} from '../../lib/router'
import { useDb } from '../../lib/db'
import TwoPaneLayout from '../atoms/TwoPaneLayout'
import { NoteDoc } from '../../lib/db/types'

function sortByUpdatedAt(a: NoteDoc, b: NoteDoc) {
  return b.updatedAt.localeCompare(a.updatedAt)
}

export default () => {
  const db = useDb()

  const routeParams = useRouteParams() as (
    | StorageAllNotes
    | StorageNotesRouteParams
    | StorageTrashCanRouteParams
    | StorageTagsRouteParams)
  const { storageId, noteId } = routeParams
  const currentStorage = useMemo(() => {
    if (storageId == null) return undefined
    return db.storageMap[storageId]
  }, [db.storageMap, storageId])

  const currentPathnameWithoutNoteId = usePathnameWithoutNoteId()

  const notes = useMemo((): NoteDoc[] => {
    if (currentStorage == null) return []
    switch (routeParams.name) {
      case 'storages.allNotes':
        return (Object.values(currentStorage.noteMap) as NoteDoc[]).filter(
          note => !note.trashed
        )
      case 'storages.notes':
        const { folderPathname } = routeParams
        const folder = currentStorage.folderMap[folderPathname]
        if (folder == null) return []
        return [...folder.noteIdSet]
          .map(noteId => currentStorage.noteMap[noteId]!)
          .filter(note => !note.trashed)
          .sort(sortByUpdatedAt)
      case 'storages.tags.show':
        const { tagName } = routeParams
        const tag = currentStorage.tagMap[tagName]
        if (tag == null) return []
        return [...tag.noteIdSet]
          .map(noteId => currentStorage.noteMap[noteId]!)
          .filter(note => !note.trashed)
          .sort(sortByUpdatedAt)
      case 'storages.trashCan':
        return (Object.values(currentStorage.noteMap) as NoteDoc[])
          .filter(note => note.trashed)
          .sort(sortByUpdatedAt)
    }
    return []
  }, [currentStorage, routeParams])

  const router = useRouter()

  if (notes.length > 0 && routeParams.noteId == null) {
    router.replace(currentPathnameWithoutNoteId + `/${notes[0]._id}`)
  }

  const currentNote = useMemo(() => {
    if (currentStorage == null) return null
    if (noteId == null) return null
    return currentStorage.noteMap[noteId]
  }, [noteId, currentStorage])

  const createNote = useCallback(async () => {
    if (storageId == null || routeParams.name === 'storages.trashCan') {
      return
    }
    const folderPathname =
      routeParams.name === 'storages.notes' ? routeParams.folderPathname : '/'

    const tags =
      routeParams.name === 'storages.tags.show' ? [routeParams.tagName] : []
    await db.createNote(storageId, {
      folderPathname,
      tags
    })
  }, [db, routeParams, storageId])

  const removeNote = async () => {}

  return storageId != null ? (
    <TwoPaneLayout
      style={{ height: '100%' }}
      left={
        <NoteList
          storageId={storageId}
          notes={notes}
          currentNoteId={noteId}
          createNote={createNote}
          basePathname={currentPathnameWithoutNoteId}
        />
      }
      right={
        currentNote == null ? (
          <div>No note selected</div>
        ) : (
          <NoteDetail
            storageId={storageId}
            note={currentNote}
            updateNote={db.updateNote}
            trashNote={db.trashNote}
            removeNote={removeNote}
          />
        )
      }
    />
  ) : (
    <div>Storage does not exist</div>
  )
}
