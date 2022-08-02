import Base from '@src/polaris/common/ducks/Page'
import CreateDuck from './operation/CreateDuck'
import { select, put } from 'redux-saga/effects'
import { takeLatest } from 'redux-saga-catch'
import { reduceFromPayload, createToPayload } from 'saga-duck'
import { notification, Modal } from 'tea-component'
import { getAllList } from '@src/polaris/common/util/apiRequest'
import { ConfigFile, ConfigFileGroup, ConfigFileReleaseHistory } from '@src/polaris/configuration/fileGroup/types'
import DynamicDuck from '@src/polaris/common/ducks/DynamicDuck'
import { resolvePromise } from 'saga-duck/build/helper'
import { showDialog } from '@src/polaris/common/helpers/showDialog'
import Create from './operation/Create'
import React from 'react'
import FileDiff from './FileDiff'
import {
  modifyConfigFile,
  deleteConfigFiles,
  describeConfigFilesByGroup,
  describeLastReleaseConfigFile,
  releaseConfigFile,
} from '../../model'
import Fetcher from '@src/polaris/common/ducks/Fetcher'
import { describeConfigFileReleaseHistories } from '@src/polaris/configuration/releaseHistory/model'
interface MyFilter {
  namespace: string
  group: string
}
interface ComposedId {
  namespace: string
  group: string
}

export class DynamicConfigFileReleaseHistoryDuck extends DynamicDuck {
  get ProtoDuck() {
    return FileHistoryFetcher
  }
}

class FileHistoryFetcher extends Fetcher {
  Data: Array<ConfigFileReleaseHistory>
  Param: { namespace: string; group: string; name: string }
  fetchConfigsKey: string
  get reducers() {
    const { types } = this
    return {
      ...super.reducers,
      selected: reduceFromPayload(types.SELECT, {} as ConfigFileReleaseHistory),
    }
  }
  get quickTypes() {
    enum Types {
      SELECT,
    }
    return {
      ...super.quickTypes,
      ...Types,
    }
  }
  get creators() {
    const { types } = this
    return {
      ...super.creators,
      select: createToPayload<string>(types.SELECT),
    }
  }
  async getDataAsync(param: this['Param']) {
    const { list } = await getAllList(describeConfigFileReleaseHistories)(param)
    if (list.length === 0) return []
    return list
  }
}

export const NODE_LIMIT_STEP = 100

const generateFileTree = (fileList: ConfigFile[]) => {
  const fileTree = {}
  fileList.forEach(file => {
    let lastFolder = fileTree
    const splitArray = file.name.split('/').filter(item => item)
    if (splitArray.length === 0) {
      lastFolder[file.name] = file
    } else {
      const folderNameArray = splitArray.slice(0, splitArray.length - 1)
      const fileName = splitArray[splitArray.length - 1]
      folderNameArray.forEach(folderName => {
        const folder = lastFolder[folderName]
        if (!folder) {
          lastFolder[folderName] = {
            __isDir__: true,
          }
          lastFolder = lastFolder[folderName]
        } else {
          lastFolder = folder
        }
      })
      lastFolder[fileName] = file
    }
  })
  return fileTree
}

export default class PageDuck extends Base {
  baseUrl = null
  Filter: MyFilter
  Item: ConfigFileGroup

  get quickTypes() {
    enum Types {
      LOAD,
      SET_DATA,
      SET_COMPOSE_ID,
      EDIT,
      FETCH_DATA,
      SET_FILE_TREE,
      CLICK_FILE_ITEM,
      SET_CURRENT_SHOW_NODE,
      SET_EXPANDED_IDS,
      SET_LOADING_MAP,
      DELETE,
      ADD,
      RELOAD_DATA,
      SEARCH_PATH,
      SET_SEARCH_PATH_KEYWORD,
      SET_FILE_MAP,
      EDIT_CURRENT_NODE,
      SET_EDITING,
      SET_EDIT_CONTENT,
      RELEASE_CURRENT_NODE,
      SAVE_CURRENT_NODE,
      SHOW_RELEASE_HISTORY,
      SET_HISTORY_MAP,
      SET_HIT_PATH,
      SELECT,
      EDIT_FILE_META,
      CANCEL,
    }
    return {
      ...super.quickTypes,
      ...Types,
    }
  }

  get quickDucks() {
    return {
      ...super.quickDucks,
      configFileDynamicDuck: DynamicConfigFileReleaseHistoryDuck,
    }
  }

  get reducers() {
    const { types } = this
    return {
      ...super.reducers,
      data: reduceFromPayload(types.SET_COMPOSE_ID, {} as ConfigFileGroup),
      composedId: reduceFromPayload(types.SET_COMPOSE_ID, {} as ComposedId),
      fileTree: reduceFromPayload(types.SET_FILE_TREE, {}),
      expandedIds: reduceFromPayload(types.SET_EXPANDED_IDS, [] as string[]),
      currentNode: reduceFromPayload(types.SET_CURRENT_SHOW_NODE, {} as ConfigFile),
      searchKeyword: reduceFromPayload(types.SET_SEARCH_PATH_KEYWORD, ''),
      editing: reduceFromPayload(types.SET_EDITING, false),
      editContent: reduceFromPayload(types.SET_EDIT_CONTENT, ''),
      fileMap: reduceFromPayload(types.SET_FILE_MAP, {} as Record<string, ConfigFile>),
      showHistoryMap: reduceFromPayload(types.SET_HISTORY_MAP, {}),
      hitPath: reduceFromPayload(types.SET_HIT_PATH, []),
      selection: reduceFromPayload(types.SELECT, [] as string[]),
    }
  }

  get creators() {
    const { types } = this
    return {
      ...super.creators,
      load: (composedId, data) => ({
        type: types.LOAD,
        payload: { composedId, data },
      }),
      add: createToPayload<void>(types.ADD),
      delete: createToPayload<string>(types.DELETE),
      clickFileItem: createToPayload<string>(types.CLICK_FILE_ITEM),
      setExpandedIds: createToPayload<string[]>(types.SET_EXPANDED_IDS),
      searchPath: createToPayload<string>(types.SEARCH_PATH),
      setSearchKeyword: createToPayload<string>(types.SET_SEARCH_PATH_KEYWORD),
      fetchData: createToPayload<void>(types.FETCH_DATA),
      editCurrentNode: createToPayload<void>(types.EDIT_CURRENT_NODE),
      edit: createToPayload<string>(types.EDIT_FILE_META),
      setEditContent: createToPayload<string>(types.SET_EDIT_CONTENT),
      releaseCurrentFile: createToPayload<void>(types.RELEASE_CURRENT_NODE),
      showReleaseHistory: createToPayload<ConfigFile>(types.SHOW_RELEASE_HISTORY),
      save: createToPayload<void>(types.SAVE_CURRENT_NODE),
      select: createToPayload<string[]>(types.SELECT),
      cancel: createToPayload<void>(types.CANCEL),
    }
  }

  get rawSelectors() {
    type State = this['State']
    return {
      ...super.rawSelectors,
      data: (state: State) => state.data,
      composedId: (state: State) => state.composedId,
      fileTree: (state: State) => state.fileTree,
      expandedIds: (state: State) => state.expandedIds,
      currentNode: (state: State) => state.currentNode,
      searchKeyword: (state: State) => state.searchKeyword,
      editing: (state: State) => state.editing,
    }
  }

  *saga() {
    yield* super.saga()
    const { types, selectors, creators, selector, ducks } = this
    yield takeLatest(types.LOAD, function*(action) {
      const { composedId, data } = action.payload
      yield put({ type: types.SET_DATA, payload: data })
      yield put({ type: types.SET_COMPOSE_ID, payload: composedId })
      yield put({ type: types.FETCH_DATA })
      // 重置搜索框
      yield put({ type: types.SET_SEARCH_PATH_KEYWORD, payload: '' })
    })
    yield takeLatest(types.ADD, function*() {
      const composedId = selectors.composedId(yield select())

      const res = yield* resolvePromise(
        new Promise(resolve => {
          showDialog(Create, CreateDuck, function*(duck: CreateDuck) {
            try {
              resolve(
                yield* duck.execute({ namespace: composedId.namespace, group: composedId.group }, { isModify: false }),
              )
            } finally {
              resolve(false)
            }
          })
        }),
      )
      if (res) {
        yield put({ type: types.FETCH_DATA })
      }
    })
    yield takeLatest(types.EDIT_FILE_META, function*(action) {
      const { fileMap } = selector(yield select())
      const res = yield* resolvePromise(
        new Promise(resolve => {
          showDialog(Create, CreateDuck, function*(duck: CreateDuck) {
            try {
              resolve(yield* duck.execute(fileMap[action.payload], { isModify: true }))
            } finally {
              resolve(false)
            }
          })
        }),
      )
      if (res) {
        yield put({ type: types.FETCH_DATA })
      }
    })
    yield takeLatest(types.CANCEL, function*() {
      const currentNode = selectors.currentNode(yield select())
      yield put({ type: types.SET_EDITING, payload: false })
      yield put(creators.setEditContent(currentNode.content))
    })
    yield takeLatest(types.EDIT_CURRENT_NODE, function*() {
      const currentNode = selectors.currentNode(yield select())
      yield put({ type: types.SET_EDITING, payload: true })
      yield put(creators.setEditContent(currentNode.content))
    })
    yield takeLatest(types.DELETE, function*(action) {
      const { namespace, group } = selectors.composedId(yield select())
      const confirm = yield Modal.confirm({
        message: '确认删除配置文件？',
        description: '删除后，无法恢复。',
      })
      if (confirm) {
        const deleteId = action.payload
        const result = yield deleteConfigFiles({ namespace, group, name: deleteId })
        if (result) {
          notification.success({ description: '删除成功' })
          yield put({ type: types.FETCH_DATA })
        } else {
          notification.error({ description: '删除失败' })
        }
      }
    })
    yield takeLatest(types.FETCH_DATA, function*() {
      const composedId = selectors.composedId(yield select())
      const searchKeyword = selectors.searchKeyword(yield select())
      const currentNode = selectors.currentNode(yield select())
      const { namespace, group } = composedId
      const fileResult = yield getAllList(describeConfigFilesByGroup)({ namespace, group, name: searchKeyword || undefined })
      const fileList = fileResult.list as ConfigFile[]
      const fileMap = fileList.reduce((prev, curr) => {
        prev[curr.name] = curr
        return prev
      }, {})
      yield put({ type: types.SET_FILE_MAP, payload: fileMap })
      const fileTree = generateFileTree(fileList)
      yield put({ type: types.SET_FILE_TREE, payload: fileTree })
      if (currentNode?.name && fileMap[currentNode.name]) {
        yield put({ type: types.SET_CURRENT_SHOW_NODE, payload: fileMap[currentNode.name] })
      }
    })
    yield takeLatest(types.SEARCH_PATH, function*(action) {
      if (action.payload === '') {
        yield put({ type: types.SET_EXPANDED_IDS, payload: [...new Set([])] })
        yield put({ type: types.SET_HIT_PATH, payload: [...new Set([])] })
        return
      }
      const { fileMap } = selector(yield select())
      const keyword = action.payload
      const hitName = Object.keys(fileMap).filter(fileName => {
        const file = fileMap[fileName]
        return `${file.name}.${file.format}`.indexOf(keyword) > -1
      })
      const hitPath = []
      hitName.forEach(item => {
        item.split('/').reduce((prev, curr) => {
          let next
          if (!prev) next = curr
          else next = `${prev}/${curr}`
          hitPath.push(next)
          return next
        }, '')
      })
      yield put({ type: types.SET_EXPANDED_IDS, payload: [...new Set(hitPath)] })
      yield put({ type: types.SET_HIT_PATH, payload: [...new Set(hitPath)] })
    })
    yield takeLatest(types.CLICK_FILE_ITEM, function*(action) {
      const { editing, currentNode, fileMap } = selector(yield select())
      const nextNode = fileMap[action.payload]
      if (editing && currentNode.name !== nextNode.name) {
        const confirm = yield Modal.confirm({
          message: '确认切换展示节点？',
          description: '编辑未发布，现在切换将丢失已编辑内容',
        })
        if (!confirm) return
      }
      yield put({ type: types.SET_CURRENT_SHOW_NODE, payload: nextNode })
      yield put({ type: types.SET_EDITING, payload: false })
    })
    yield takeLatest(types.SHOW_RELEASE_HISTORY, function*(action) {
      const { showHistoryMap } = selector(yield select())
      const { name, namespace, group } = action.payload
      if (showHistoryMap[name]) {
        yield put({ type: types.SET_HISTORY_MAP, payload: { ...showHistoryMap, [name]: false } })
      } else {
        yield put({ type: types.SET_HISTORY_MAP, payload: { ...showHistoryMap, [name]: true } })
      }
      let releaseHistoryDuck = ducks.configFileDynamicDuck.getDuck(name)
      if (!releaseHistoryDuck) {
        yield put(ducks.configFileDynamicDuck.creators.createDuck(name))
        releaseHistoryDuck = ducks.configFileDynamicDuck.getDuck(name)
      }
      yield put(releaseHistoryDuck.creators.fetch({ name, namespace, group }))
    })
    yield takeLatest(types.RELEASE_CURRENT_NODE, function*() {
      const currentNode = selectors.currentNode(yield select())
      const { namespace, group, name, content, format } = currentNode
      const { configFileRelease: lastRelease } = yield describeLastReleaseConfigFile({ namespace, name, group })
      if (lastRelease) {
        const confirm = yield Modal.confirm({
          size: 'xl',
          caption: '内容对比',
          description: <FileDiff original={lastRelease.content} now={content} format={format} />,
        } as any)
        if (!confirm) {
          return
        }
      }
      const result = yield releaseConfigFile({ namespace, group, fileName: name, name })
      if (result) {
        notification.success({ description: '发布成功' })
        yield put({ type: types.FETCH_DATA })
        yield put({ type: types.SET_EDITING, payload: false })
      } else {
        notification.error({ description: '发布失败' })
      }
    })
    yield takeLatest(types.SAVE_CURRENT_NODE, function*() {
      const {
        editContent,
        currentNode,
        composedId: { namespace, group },
      } = selector(yield select())
      const result = yield modifyConfigFile({
        ...currentNode,
        namespace,
        group,
        content: editContent,
        name: currentNode.name,
      })
      if (result) {
        notification.success({ description: '保存成功' })
        yield put({ type: types.FETCH_DATA })
        yield put({ type: types.SET_EDITING, payload: false })
      } else {
        notification.error({ description: '保存失败' })
      }
    })
  }
}
