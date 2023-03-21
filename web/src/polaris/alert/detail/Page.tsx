import { Trans, useTranslation } from 'react-i18next'
import React from 'react'
import { DuckCmpProps, purify } from 'saga-duck'
import DetailPage from '@src/polaris/common/duckComponents/DetailPage'
import { Form, Card, FormItem, FormText, Text } from 'tea-component'
import PageDuck from './PageDuck'
import { AlertTimeIntervalMap, AlterExprMap, MetricNameMap, MonitorTypeMap } from '../types'

export default purify(function CustomRoutePage(props: DuckCmpProps<PageDuck>) {
  const { t } = useTranslation()

  const { duck, store, dispatch } = props
  const { selectors } = duck
  const composedId = selectors.composedId(store)
  const data = selectors.data(store)

  const backRoute = `/alert`
  if (!data?.alertInfo) {
    return <noscript />
  }
  const { alertInfo } = data
  return (
    <DetailPage
      store={store}
      duck={duck}
      dispatch={dispatch}
      title={`${data?.alertInfo?.name} (${composedId.id || '-'})`}
      backRoute={backRoute}
    >
      <Card>
        <Card.Body>
          <Form>
            <FormItem label={t('告警策略名称')}>
              <FormText>{alertInfo.name}</FormText>
            </FormItem>
            <FormItem label={t('启用状态')}>
              <FormText>{alertInfo.enable ? t('已启用') : t('未启用')}</FormText>
            </FormItem>
            <FormItem label={t('监控类型')}>
              <FormText>
                <Text tooltip={MonitorTypeMap[alertInfo.monitor_type]}>
                  {MonitorTypeMap[alertInfo.monitor_type] || '-'}
                </Text>
              </FormText>
            </FormItem>
            <FormItem label={t('更新时间')}>
              <FormText>{alertInfo.modify_time}</FormText>
            </FormItem>
            <FormItem label={t('触发条件')}>
              <FormText>
                <Text parent={'div'}>
                  {MetricNameMap[alertInfo.alter_expr?.metrics_name]?.text} {AlterExprMap[alertInfo.alter_expr?.expr]}{' '}
                  {alertInfo.alter_expr?.value}
                  {MetricNameMap[alertInfo.alter_expr?.metrics_name]?.unit}
                </Text>
                <Text parent={'div'}>
                  <Trans>持续</Trans>
                  {alertInfo.alter_expr.for}
                  {AlertTimeIntervalMap[alertInfo.alter_expr.for_unit]}
                </Text>
              </FormText>
            </FormItem>
            <FormItem label={t('告警周期')}>
              <FormText>
                <Text>
                  <Trans>每隔</Trans>
                  {`${alertInfo.interval}${AlertTimeIntervalMap[alertInfo.interval_unit]}`}
                  <Trans>告警一次</Trans>
                </Text>
              </FormText>
            </FormItem>
            <FormItem label={t('告警主题')}>
              <FormText>{alertInfo.topic}</FormText>
            </FormItem>
            <FormItem label={t('告警周期')}>
              <FormText>{alertInfo.message}</FormText>
            </FormItem>
            <FormItem label={t('通知回调地址')}>
              <FormText>{alertInfo.callback?.info?.url}</FormText>
            </FormItem>
          </Form>
        </Card.Body>
      </Card>
    </DetailPage>
  )
})
