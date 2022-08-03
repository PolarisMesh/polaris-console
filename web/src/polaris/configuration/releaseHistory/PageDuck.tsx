import { createToPayload } from 'saga-duck'
import { takeLatest } from 'redux-saga-catch'
import { put, select, take } from 'redux-saga/effects'
import { Modal } from 'tea-component'
import { reduceFromPayload } from 'saga-duck/build/helper'
import { GroupNameTagKey, DefaultGroupTagAttribute, FileNameTagKey } from './Page'
import GridPageDuck, { Filter } from '@src/polaris/common/ducks/GridPage'
import { NamespaceItem } from '@src/polaris/service/PageDuck'
import { getAllList } from '@src/polaris/common/util/apiRequest'
import { describeComplicatedNamespaces } from '@src/polaris/namespace/model'
import { ConfigFileReleaseHistory, ConfigFileGroup } from '../fileGroup/types'
import { describeConfigFileReleaseHistories } from './model'
import { describeConfigFileGroups } from '../fileGroup/model'
import React from 'react'
import FileDiff from '../fileGroup/detail/file/FileDiff'

export interface ConfigFileReleaseHistoryItem extends ConfigFileReleaseHistory {
  id: string
}
interface CustomFilters {
  namespace?: string
  group?: string
  fileName: string
}
export const EmptyCustomFilter = {
  namespace: '',
  group: '',
  fileName: '',
}
export default class ConfigFileReleaseHistoryDuck extends GridPageDuck {
  Filter: Filter & CustomFilters
  Item: ConfigFileReleaseHistoryItem
  get baseUrl() {
    return 'file-release-history'
  }
  get quickTypes() {
    enum Types {
      SET_CUSTOM_FILTERS,
      SET_TAGS,
      CHANGE_TAGS,
      SET_NAMESPACE_LIST,
      SET_GROUP_LIST,
      SHOW_DIFF,
      SET_NAMESPACE,
      SET_GROUP_NAME,
      SET_FILENAME,
    }
    return {
      ...super.quickTypes,
      ...Types,
    }
  }
  get initialFetch() {
    return false
  }
  get recordKey() {
    return 'id'
  }
  get watchTypes() {
    return [...super.watchTypes, this.types.SEARCH, this.types.SET_CUSTOM_FILTERS, this.types.SET_NAMESPACE]
  }
  get params() {
    const { types } = this
    return [
      ...super.params,
      {
        key: 'namespace',
        type: types.SET_NAMESPACE,
        defaults: '',
      },
      {
        key: 'group',
        type: types.SET_GROUP_NAME,
        defaults: '',
      },
      {
        key: 'fileName',
        type: types.SET_FILENAME,
        defaults: '',
      },
    ]
  }
  get quickDucks() {
    return {
      ...super.quickDucks,
    }
  }
  get reducers() {
    const { types } = this
    return {
      ...super.reducers,
      tags: reduceFromPayload<any[]>(types.SET_TAGS, []),
      customFilters: reduceFromPayload<CustomFilters>(types.SET_CUSTOM_FILTERS, EmptyCustomFilter),
      namespaceList: reduceFromPayload<NamespaceItem & { key?: string; name?: string }[]>(
        types.SET_NAMESPACE_LIST,
        [] as any,
      ),
      configFileGroupList: reduceFromPayload<ConfigFileGroup & { key?: string; name?: string }[]>(
        types.SET_GROUP_LIST,
        [] as any,
      ),
      namespace: reduceFromPayload<string>(types.SET_NAMESPACE, ''),
    }
  }
  get creators() {
    const { types } = this
    return {
      ...super.creators,
      setCustomFilters: createToPayload<CustomFilters>(types.SET_CUSTOM_FILTERS),
      changeTags: createToPayload(types.CHANGE_TAGS),
      showDiff: createToPayload(types.SHOW_DIFF),
      setNamespace: createToPayload(types.SET_NAMESPACE),
    }
  }
  get rawSelectors() {
    type State = this['State']
    return {
      ...super.rawSelectors,
      filter: (state: State) => ({
        page: state.page,
        count: state.count,
        keyword: state.keyword,
        namespace: state.namespace,
        group: state.customFilters.group,
        fileName: state.customFilters.fileName,
      }),
    }
  }
  get waitRouteInitialized() {
    return true
  }
  *init() {
    const { list: namespaceList } = yield getAllList(describeComplicatedNamespaces, {
      listKey: 'namespaces',
      totalKey: 'amount',
    })({})
    const options = namespaceList.map(item => ({
      ...item,
      text: item.name,
      value: item.name,
      key: item.name,
      name: item.name,
    }))
    //options.unshift({ text: t('全部'), value: '', key: '', name: t('全部') })
    yield put({
      type: this.types.SET_NAMESPACE_LIST,
      payload: options,
    })
    const { list } = yield getAllList(describeConfigFileGroups, {})({})
    yield put({
      type: this.types.SET_GROUP_LIST,
      payload: list.map(item => ({
        ...item,
        text: item.name,
        value: item.name,
        key: item.name,
        name: item.name,
      })),
    })
  }
  *saga() {
    const { types, selector } = this
    yield takeLatest(types.CHANGE_TAGS, function*(action) {
      const tags = action.payload
      const customFilters = { ...EmptyCustomFilter }
      const validTags = tags.map(item => {
        if (item.attr) return item
        else return { ...item, attr: DefaultGroupTagAttribute }
      })
      yield put({ type: types.SET_TAGS, payload: validTags })
      validTags.forEach(tag => {
        const key = tag?.attr?.key || GroupNameTagKey

        if (tag.attr.type === 'input') customFilters[key] = tag.values[0].name
        else customFilters[key] = tag.values[0].key
      })
      yield put({ type: types.SET_CUSTOM_FILTERS, payload: customFilters })
    })
    yield takeLatest(types.SHOW_DIFF, function*(action) {
      const { namespace, group, name, content, format, id } = action.payload
      const { list: previousRelease } = yield describeConfigFileReleaseHistories({
        namespace,
        name,
        group,
        offset: 0,
        limit: 1,
        endId: id,
      })

      const modal = Modal.show({
        size: 'xl',
        caption: '内容对比',
        children: <FileDiff original={previousRelease?.[0]?.content || ''} now={content || ''} format={format} />,
        destroyOnClose: true,
        onClose: () => modal.destroy(),
      })
    })
    yield takeLatest(types.ROUTE_INITIALIZED, function*() {
      yield take([types.SET_NAMESPACE_LIST, types.SET_GROUP_LIST])
      yield take([types.SET_NAMESPACE_LIST, types.SET_GROUP_LIST])
      const { routes, configFileGroupList } = selector(yield select())
      const tags = []
      if (routes.namespace) {
        yield put({ type: types.SET_NAMESPACE, payload: routes.namespace })
      }
      if (routes.group) {
        const option = configFileGroupList.find(item => item.key === routes.group)
        tags.push({
          attr: {
            type: 'single',
            key: GroupNameTagKey,
            name: '分组',
            values: configFileGroupList,
          },
          values: [option],
        })
      }
      if (routes.fileName) {
        tags.push({
          attr: {
            type: 'input',
            key: FileNameTagKey,
            name: '配置文件名',
          },
          values: [{ name: routes.fileName }],
        })
      }
      yield put({ type: types.CHANGE_TAGS, payload: tags })
    })

    yield* super.saga()
    yield* this.init()
  }

  async getData(filters: this['Filter']) {
    const { page, count, namespace, fileName, group } = filters

    const result = await describeConfigFileReleaseHistories({
      limit: count,
      offset: (page - 1) * count,
      group: group || undefined,
      namespace: namespace || undefined,
      name: fileName,
    })
    return {
      totalCount: result.totalCount,
      list:
        result.list?.map(item => ({
          ...item,
        })) || [],
    }
  }
}
