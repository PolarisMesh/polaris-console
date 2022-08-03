import React from 'react'
import { DuckCmpProps } from 'saga-duck'
import RuleLimitPageDuck from './PageDuck'
import { Button, Card, Justify, Table, Segment, Form, FormText, FormItem, Text, H3, Drawer } from 'tea-component'
import GridPageGrid from '@src/polaris/common/duckComponents/GridPageGrid'
import GridPagePagination from '@src/polaris/common/duckComponents/GridPagePagination'
import getColumns from './getColumns'
import { selectable, expandable } from 'tea-component/lib/table/addons'
import insertCSS from '@src/polaris/common/helpers/insertCSS'
import csvColumns from './csvColumns'
import { LimitType, LimitRange } from './model'
import { LIMIT_TYPE_MAP, LIMIT_THRESHOLD_MAP, LimitThresholdMode } from './types'
import { EDIT_TYPE_OPTION, EditType } from '../route/types'
import { isReadOnly } from '../../utils'
import Create from './operations/Create'
insertCSS(
  'service-detail-instance',
  `
.justify-search{
  margin-right:20px
}
.justify-button{
  vertical-align: bottom
}
`,
)

export default function RuleLimitPage(props: DuckCmpProps<RuleLimitPageDuck>) {
  const { duck, store, dispatch } = props
  const { creators, selector, ducks } = duck
  const handlers = React.useMemo(
    () => ({
      reload: () => dispatch(creators.reload()),
      export: () => dispatch(creators.export(csvColumns, 'service-list')),
      search: () => dispatch(creators.search('')),
      create: () => dispatch(creators.create()),
      remove: payload => dispatch(creators.remove(payload)),
      setExpandedKeys: payload => dispatch(creators.setExpandedKeys(payload)),
      setLimitRange: payload => dispatch(creators.setLimitRange(payload)),
      select: payload => dispatch(creators.setSelection(payload)),
      setDrawerStatus: payload => dispatch(creators.setDrawerStatus(payload)),
      drawerSubmit: () => dispatch(creators.drawerSubmit()),
    }),
    [],
  )
  const columns = React.useMemo(() => getColumns(props), [])
  const {
    expandedKeys,
    selection,
    data: { namespace, editable },
    drawerStatus,
  } = selector(store)
  let createDuck
  if (drawerStatus.visible) {
    createDuck = ducks.dynamicCreateDuck.getDuck(drawerStatus.createId)
  }
  return (
    <>
      <Table.ActionPanel>
        <Form layout='inline'>
          <FormItem label={'编辑格式'}>
            <Segment options={EDIT_TYPE_OPTION} value={EditType.Table}></Segment>
          </FormItem>
        </Form>
        <Justify
          left={
            <>
              <Button
                type={'primary'}
                onClick={handlers.create}
                disabled={isReadOnly(namespace) || !editable}
                tooltip={isReadOnly(namespace) ? '该命名空间为只读的' : !editable ? '无写权限' : ''}
                style={{ marginTop: '20px' }}
              >
                新建
              </Button>
              <Button
                onClick={() => handlers.remove(selection)}
                disabled={!selection || selection?.length <= 0 || !editable}
                tooltip={!editable ? '无写权限' : ''}
                style={{ marginTop: '20px' }}
              >
                删除
              </Button>
            </>
          }
          right={<Button type={'icon'} icon={'refresh'} onClick={handlers.reload}></Button>}
        />
      </Table.ActionPanel>
      <Card>
        <Card.Header>
          <H3 style={{ padding: '10px', color: 'black' }}>当本服务或者接口被调用时，遵守以下限流规则</H3>
        </Card.Header>
        <GridPageGrid
          duck={duck}
          dispatch={dispatch}
          store={store}
          columns={columns}
          addons={[
            selectable({
              all: true,
              value: selection,
              onChange: handlers.select,
              rowSelectable: () => !isReadOnly(namespace),
            }),
            expandable({
              // 已经展开的产品
              expandedKeys,
              // 发生展开行为时，回调更新展开键值
              onExpandedKeysChange: keys => handlers.setExpandedKeys(keys),
              render: record => {
                return (
                  <>
                    <Form>
                      <FormItem label={'如果请求标签匹配，按以下策略限流'}></FormItem>
                    </Form>
                    <Form style={{ marginTop: '15px' }}>
                      <FormItem label='限流条件'>
                        <FormText>
                          {record.amounts.map((amount, index) => {
                            return (
                              <Text parent='p' key={index}>
                                当{amount.validDuration}
                                内，收到符合条件的请求超过
                                {amount.maxAmount}个，将会进行
                                {LIMIT_TYPE_MAP[record.action]?.text}限流
                              </Text>
                            )
                          })}
                        </FormText>
                      </FormItem>
                      <FormItem label='限流效果'>
                        <FormText>{LIMIT_TYPE_MAP[!record.action ? LimitType.REJECT : record.action]?.text}</FormText>
                      </FormItem>
                      <FormItem label='阈值模式'>
                        <FormText>
                          {record.type === LimitRange.LOCAL
                            ? '-'
                            : LIMIT_THRESHOLD_MAP[
                                !record.amountMode ? LimitThresholdMode.GLOBAL_TOTAL : record.amountMode
                              ]?.text}
                        </FormText>
                      </FormItem>
                    </Form>
                  </>
                )
              },
            }),
          ]}
        />
        <GridPagePagination duck={duck} dispatch={dispatch} store={store} />
        <Drawer
          title={drawerStatus.title}
          outerClickClosable={false}
          disableCloseIcon={true}
          visible={drawerStatus.visible}
          onClose={() => {}}
          style={{ width: '1000px' }}
          footer={
            <>
              <Button
                type={'primary'}
                onClick={createDuck ? () => handlers.drawerSubmit() : undefined}
                style={{ margin: '0 10px' }}
              >
                确定
              </Button>
              <Button
                onClick={createDuck ? () => handlers.setDrawerStatus({ visible: false }) : undefined}
                style={{ margin: '0 10px' }}
              >
                取消
              </Button>
            </>
          }
        >
          {createDuck && <Create duck={createDuck} store={store} dispatch={dispatch}></Create>}
        </Drawer>
      </Card>
    </>
  )
}
