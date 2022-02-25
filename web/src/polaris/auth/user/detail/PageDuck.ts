import { reduceFromPayload, createToPayload } from 'saga-duck'
import DetailPage from '@src/polaris/common/ducks/DetailPage'
import {
  describeGovernanceUsers,
  User,
  describeGovernanceUserToken,
  modifyGovernanceUserToken,
  resetGovernanceUserToken,
} from '../../model'
import { select, put } from 'redux-saga/effects'
import PolicyPageDuck from '../../policy/PageDuck'
import UserGroupDuck from '../../userGroup/PageDuck'
import { takeLatest } from 'redux-saga-catch'
import { AuthSubjectType } from '../../policy/Page'
import ModifyCommentDuck from '../operation/ModifyCommentDuck'
import { notification } from 'tea-component'
import CreateUserDuck from '../operation/CreateUserDuck'
import { resolvePromise } from 'saga-duck/build/helper'
import { showDialog } from '@src/polaris/common/helpers/showDialog'
import CreateUser from '../operation/CreateUser'

interface ComposedId {
  id: string
}

export default abstract class CreateDuck extends DetailPage {
  Data: User
  ComposedId: ComposedId

  get baseUrl() {
    return `/#/user-detail`
  }
  get quickTypes() {
    enum Types {
      SET_INSTANCE_ID,
      TOGGLE_TOKEN,
      RESET_TOKEN,
      MODIFY_COMMENT,
      MODIFY,
      MODIFY_PASSWORD,
    }
    return {
      ...super.quickTypes,
      ...Types,
    }
  }
  get params() {
    const { types } = this
    return [
      ...super.params,
      {
        key: 'instanceId',
        type: types.SET_INSTANCE_ID,
        defaults: '',
      },
    ]
  }
  get quickDucks() {
    return {
      ...super.quickDucks,
      policy: PolicyPageDuck,
      userGroup: UserGroupDuck,
    }
  }
  get reducers() {
    const { types } = this
    return {
      ...super.reducers,
      instanceId: reduceFromPayload(types.SET_INSTANCE_ID, ''),
    }
  }

  get rawSelectors() {
    type State = this['State']
    return {
      ...super.rawSelectors,
      composedId: (state: State) => ({
        id: state.id,
      }),
    }
  }
  get creators() {
    const { types } = this
    return {
      ...super.creators,
      toggleToken: createToPayload<void>(types.TOGGLE_TOKEN),
      resetToken: createToPayload<void>(types.RESET_TOKEN),
      modifyComment: createToPayload<void>(types.MODIFY_COMMENT),
      modifyPassword: createToPayload<void>(types.MODIFY_PASSWORD),
    }
  }
  *saga() {
    yield* super.saga()
    const {
      ducks: { policy, userGroup },
      types,
      selectors,
      selector,
      creators,
    } = this
    yield takeLatest(types.FETCH_DONE, function*() {
      const { id } = selectors.composedId(yield select())
      yield put(policy.creators.load({ principalId: id, principalType: AuthSubjectType.USER }))
      yield put(userGroup.creators.load({ userId: id }, {}))
    })
    yield takeLatest(types.MODIFY_COMMENT, function*() {
      const { id } = yield select(selectors.composedId)
      const data = selectors.data(yield select())
      const result = yield ModifyCommentDuck.show({ comment: data.comment, id })
      if (result) {
        notification.success({ description: '修改成功' })
        yield put(creators.reload())
      } else {
        notification.error({ description: '修改失败' })
      }
    })
    yield takeLatest(types.MODIFY, function*() {
      const { id } = yield select(selectors.composedId)
      const result = yield* resolvePromise(
        new Promise(resolve => {
          showDialog(CreateUser, CreateUserDuck, function*(duck: CreateUserDuck) {
            try {
              resolve(
                yield* duck.execute(
                  { id },
                  {
                    isModify: true,
                  },
                ),
              )
            } finally {
              resolve(false)
            }
          })
        }),
      )
      if (result) {
        yield put(creators.reload())
      }
    })
    yield takeLatest(types.TOGGLE_TOKEN, function*() {
      const { id } = selectors.composedId(yield select())
      const {
        data: { token_enable },
      } = selector(yield select())
      const result = yield modifyGovernanceUserToken({ id, token_enable: !token_enable })
      if (result) {
        notification.success({ description: `${token_enable ? '禁用' : '启用'}}成功` })
        yield put(creators.reload())
      } else {
        notification.error({ description: `${token_enable ? '禁用' : '启用'}失败` })
      }
    })
    yield takeLatest(types.RESET_TOKEN, function*() {
      const { id } = selectors.composedId(yield select())

      const result = yield resetGovernanceUserToken({ id })
      if (result) {
        notification.success({ description: '重置成功' })
        yield put(creators.reload())
      } else {
        notification.error({ description: '重置失败' })
      }
    })
  }
  async getData(composedId) {
    const { id } = composedId
    if (!id) return {} as User
    const { content } = await describeGovernanceUsers({ id }) //id })
    const { user: tokenResult } = await describeGovernanceUserToken({ id })
    return { ...content?.[0], auth_token: tokenResult.auth_token, token_enable: tokenResult.token_enable }
  }
}
