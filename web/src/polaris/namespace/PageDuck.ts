import { createToPayload, reduceFromPayload } from 'saga-duck'
import { takeLatest } from 'redux-saga-catch'
import Create from './operation/Create'
import CreateDuck from './operation/CreateDuck'
import { put, select } from 'redux-saga/effects'
import GridPageDuck, { Filter as BaseFilter } from '../common/ducks/GridPage'
import { ComposedId } from '../service/detail/types'
import { resolvePromise } from 'saga-duck/build/helper'
import { showDialog } from '../common/helpers/showDialog'
import { Modal, notification } from 'tea-component'
import { Namespace } from '../service/types'
import { deleteNamespace, describeComplicatedNamespaces } from './model'
import { checkAuth } from '../auth/model'

export interface NamespaceItem extends Namespace {
  id: string
}
export default class ServicePageDuck extends GridPageDuck {
  Filter: BaseFilter
  Item: NamespaceItem
  get baseUrl() {
    return ''
  }
  get quickTypes() {
    enum Types {
      EDIT,
      REMOVE,
      CREATE,
      LOAD,
      SET_COMPOSE_ID,
      SET_AUTH_OPEN,
    }
    return {
      ...super.quickTypes,
      ...Types,
    }
  }
  get initialFetch() {
    return true
  }
  get recordKey() {
    return 'id'
  }
  get watchTypes() {
    return [...super.watchTypes, this.types.SEARCH, this.types.SET_COMPOSE_ID]
  }
  get params() {
    return [...super.params]
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
      composedId: reduceFromPayload(types.SET_COMPOSE_ID, {} as ComposedId),
      authOpen: reduceFromPayload(types.SET_AUTH_OPEN, false),
    }
  }
  get creators() {
    const { types } = this
    return {
      ...super.creators,
      edit: createToPayload<NamespaceItem>(types.EDIT),
      remove: createToPayload<NamespaceItem>(types.REMOVE),
      create: createToPayload<void>(types.CREATE),
      load: (composedId, data) => ({
        type: types.LOAD,
        payload: { composedId, data },
      }),
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
      }),
    }
  }

  *saga() {
    const { types, creators, selector } = this
    yield* super.saga()
    const authOpen = yield checkAuth({})
    yield put({ type: types.SET_AUTH_OPEN, payload: authOpen })
    yield takeLatest(types.LOAD, function*(action) {
      const { composedId } = action.payload
      yield put({ type: types.SET_COMPOSE_ID, payload: composedId })
    })
    yield takeLatest(types.CREATE, function*() {
      const { authOpen } = selector(yield select())
      const res = yield* resolvePromise(
        new Promise(resolve => {
          showDialog(Create, CreateDuck, function*(duck: CreateDuck) {
            try {
              resolve(yield* duck.execute({}, { isModify: false, authOpen }))
            } finally {
              resolve(false)
            }
          })
        }),
      )
      if (res) {
        yield put(creators.reload())
      }
    })
    yield takeLatest(types.EDIT, function*(action) {
      const data = action.payload
      const res = yield* resolvePromise(
        new Promise(resolve => {
          showDialog(Create, CreateDuck, function*(duck: CreateDuck) {
            try {
              resolve(yield* duck.execute(data, { isModify: true, authOpen }))
            } finally {
              resolve(false)
            }
          })
        }),
      )
      if (res) {
        yield put(creators.reload())
      }
    })
    yield takeLatest(types.REMOVE, function*(action) {
      const { name } = action.payload

      const confirm = yield Modal.confirm({
        message: this.t('确认删除命名空间', {}),
        description: this.t('删除后，无法恢复'),
        okText: this.t('删除'),
      })
      if (confirm) {
        const res = yield deleteNamespace([{ name, token: 'polaris@12345678' }])
        if (res) notification.success({ description: this.t('删除成功') })
        yield put(creators.reload())
      }
    })
  }

  async getData(filters: this['Filter']) {
    const { page, count, keyword } = filters
    const result = await describeComplicatedNamespaces({
      limit: count,
      offset: (page - 1) * count,
      name: keyword || undefined,
    })
    return {
      totalCount: result.amount,
      list:
        result.namespaces?.map(item => ({
          ...item,
          id: item.name,
        })) || [],
    }
  }
}
