import { Trans, useTranslation } from 'react-i18next'
import React from 'react'
import { DuckCmpProps } from 'saga-duck'
import ServicePageDuck from './PageDuck'
import { Button, Card, Justify, Table, Segment, Form, FormText, FormItem, Text, H3, Drawer } from 'tea-component'
import GridPageGrid from '@src/polaris/common/duckComponents/GridPageGrid'
import GridPagePagination from '@src/polaris/common/duckComponents/GridPagePagination'
import getColumns from './getColumns'
import { expandable } from 'tea-component/lib/table/addons'
import insertCSS from '@src/polaris/common/helpers/insertCSS'
import csvColumns from './csvColumns'
import {
  RULE_TYPE_OPTIONS,
  PolicyMap,
  PolicyName,
  OUTLIER_DETECT_MAP,
  RuleType,
  BREAK_RESOURCE_TYPE_MAP,
  OutlierDetectWhen,
  BREAK_RESOURCE_TYPE,
} from './types'
import { isReadOnly } from '../../utils'
import { EDIT_TYPE_OPTION, EditType } from '../route/types'
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

export default function ServiceInstancePage(props: DuckCmpProps<ServicePageDuck>) {
  const { t } = useTranslation()

  const { duck, store, dispatch } = props
  const { creators, selector, ducks } = duck
  const handlers = React.useMemo(
    () => ({
      reload: () => dispatch(creators.reload()),
      submit: () => dispatch(creators.submit()),
      reset: () => dispatch(creators.reset()),
      export: () => dispatch(creators.export(csvColumns, 'service-list')),
      search: () => dispatch(creators.search('')),
      drawerSubmit: () => dispatch(creators.drawerSubmit()),
      create: payload => dispatch(creators.create(payload)),
      remove: payload => dispatch(creators.remove(payload)),
      setExpandedKeys: payload => dispatch(creators.setExpandedKeys(payload)),
      setRuleType: payload => dispatch(creators.setRuleType(payload)),
      setDrawerStatus: payload => dispatch(creators.setDrawerStatus(payload)),
    }),
    [],
  )
  const {
    expandedKeys,
    ruleType,
    drawerStatus,
    data: { namespace, editable },
    edited,
  } = selector(store)
  const columns = React.useMemo(() => getColumns(props), [ruleType])
  let createDuck
  if (drawerStatus.visible) {
    createDuck = ducks.dynamicCreateDuck.getDuck(drawerStatus.createId)
  }
  return (
    <>
      <Table.ActionPanel>
        <Form layout='inline'>
          <FormItem label={t('编辑格式')}>
            <Segment options={EDIT_TYPE_OPTION} value={EditType.Table}></Segment>
          </FormItem>
        </Form>
        <Form layout='inline'>
          <FormItem label={t('规则类型')}>
            <Segment options={RULE_TYPE_OPTIONS} value={ruleType} onChange={handlers.setRuleType}></Segment>
          </FormItem>
        </Form>
        <Justify
          left={
            <>
              <Button
                type={'primary'}
                onClick={() => {
                  handlers.create(0)
                }}
                disabled={isReadOnly(namespace) || !editable}
                tooltip={isReadOnly(namespace) ? t('该命名空间为只读的') : !editable ? t('无写权限') : ''}
                style={{ marginTop: '20px' }}
              >
                <Trans>新建</Trans>
              </Button>
              <Button
                type={'primary'}
                onClick={() => handlers.submit()}
                disabled={isReadOnly(namespace) || drawerStatus.visible || !edited || !editable}
                tooltip={
                  isReadOnly(namespace)
                    ? t('该命名空间为只读的')
                    : !edited
                    ? t('未更改')
                    : !editable
                    ? t('无写权限')
                    : t('向服务器端提交变更')
                }
                style={{ marginTop: '20px' }}
              >
                <Trans>提交</Trans>
              </Button>
              {edited && (
                <Button onClick={() => handlers.reset()} style={{ marginTop: '20px' }}>
                  <Trans>取消</Trans>
                </Button>
              )}
            </>
          }
          right={<Button type={'icon'} icon={'refresh'} onClick={handlers.reload}></Button>}
        />
      </Table.ActionPanel>
      <Card>
        <Card.Header>
          <H3 style={{ padding: '10px', color: 'black' }}>
            {ruleType === RuleType.Inbound
              ? t('当以下服务调用本服务时，遵守下列熔断规则')
              : t('当本服务调用以下服务时，遵守下列熔断规则')}
          </H3>
        </Card.Header>
        <GridPageGrid
          duck={duck}
          dispatch={dispatch}
          store={store}
          columns={columns}
          addons={[
            expandable({
              // 已经展开的产品
              expandedKeys,
              // 发生展开行为时，回调更新展开键值
              onExpandedKeysChange: keys => handlers.setExpandedKeys(keys),
              render: record => {
                return (
                  <>
                    <Form style={{ marginBottom: '15px' }}>
                      <FormItem label={t('如果请求标签匹配，按以下策略熔断')}></FormItem>
                    </Form>
                    <Form key={record.sources.map(source => source.namespace).join(',')}>
                      {record.destinations.map(destination => {
                        return (
                          <>
                            <FormItem label={t('熔断条件')}>
                              <FormText>
                                {Object.keys(destination.policy).map((key, index) => {
                                  if (!destination.policy[key]) return
                                  if (key === PolicyName.ErrorRate) {
                                    return (
                                      <Text parent='p' key={index}>
                                        {t('当请求个数大于{{attr0}}个，且{{attr1}}大于{{attr2}}%时熔断', {
                                          attr0: destination.policy[key]?.requestVolumeThreshold || 10,

                                          attr1: PolicyMap[key]?.text ?? '-',

                                          attr2: destination.policy[key]?.errorRateToOpen ?? '-',
                                        })}
                                      </Text>
                                    )
                                  }
                                  if (key === PolicyName.SlowRate) {
                                    return (
                                      <Text parent='p' key={index}>
                                        {t('以超过{{attr0}}的请求作为超时请求，{{attr1}}大于{{attr2}}%时熔断', {
                                          attr0: destination.policy[key]?.maxRt ?? '-',

                                          attr1: PolicyMap[key]?.text ?? '-',

                                          attr2: destination.policy[key]?.slowRateToOpen ?? '-',
                                        })}
                                      </Text>
                                    )
                                  }
                                  if (key === PolicyName.ConsecutiveError) {
                                    return (
                                      <Text parent='p' key={index}>
                                        {t('当连续请求错误超过{{attr0}}个时熔断', {
                                          attr0: destination.policy[key]?.consecutiveErrorToOpen ?? '-',
                                        })}
                                      </Text>
                                    )
                                  }
                                })}
                              </FormText>
                            </FormItem>
                            <FormItem label={t('半开时间')}>
                              <FormText>{destination.recover?.sleepWindow ?? '-'}</FormText>
                            </FormItem>
                            <FormItem label={t('熔断粒度')}>
                              {/* 默认值 */}
                              <FormText>
                                {BREAK_RESOURCE_TYPE_MAP[destination?.resource || BREAK_RESOURCE_TYPE.SUBSET]?.text ||
                                  '-'}
                              </FormText>
                            </FormItem>
                            <FormItem label={t('主动探测')}>
                              {/* 默认值 */}
                              <FormText>
                                {OUTLIER_DETECT_MAP[destination.recover?.outlierDetectWhen || OutlierDetectWhen.NEVER]
                                  ?.text || '-'}
                              </FormText>
                            </FormItem>
                          </>
                        )
                      })}
                    </Form>
                  </>
                )
              },
            }),
          ]}
        />
        <GridPagePagination duck={duck} dispatch={dispatch} store={store} />
      </Card>
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
              <Trans>确定</Trans>
            </Button>
            <Button
              onClick={createDuck ? () => handlers.setDrawerStatus({ visible: false }) : undefined}
              style={{ margin: '0 10px' }}
            >
              <Trans>取消</Trans>
            </Button>
          </>
        }
      >
        {createDuck && <Create duck={createDuck} store={store} dispatch={dispatch}></Create>}
      </Drawer>
    </>
  )
}
