import React from 'react'
import { Card, Icon, Text } from 'tea-component'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
import i18n from './i18n'

interface TipProps {
  text: string
  icon: string
}

function Tip(props: TipProps) {
  const { t } = useTranslation()

  const { icon, text } = props
  return (
    <Card
      style={{
        position: 'fixed',
        top: '25px',
        left: 0,
        right: 0,
        maxWidth: 200,
      }}
    >
      <Card.Body style={{ padding: 10 }}>
        <Icon type={icon}></Icon>
        <Text>{text || t('加载中...')}</Text>
      </Card.Body>
    </Card>
  )
}

// 唯一dom
function _getDialogRootDom() {
  const id = '__atom_tips'
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.id = id
    document.body.appendChild(el)
  }
  return el
}

let tipVisible = false
type Watcher = (visible: boolean) => any
const duckDialogVisibleWatchers = new Set<Watcher>()
function fireVisibleChange(visible: boolean) {
  tipVisible = visible
  for (const watcher of duckDialogVisibleWatchers) {
    watcher(visible)
  }
}

/**
 * 展示纯React弹窗
 * @param element
 */
export function showReactDialog(element: React.ReactElement) {
  const el = _getDialogRootDom()
  ReactDOM.render(element, el)
  fireVisibleChange(true)

  return () => {
    fireVisibleChange(false)
    // 有时unmount会报错，进行try...catch防止中止新弹窗
    try {
      ReactDOM.unmountComponentAtNode(el)
    } catch (e) {
      // 打印出来方便定位
      console.error(e)
    }
  }
}

let tipHandler = null
let tipTimer = null

interface TipOption {
  duration?: number
  text?: string
}

function clearTipTask() {
  if (tipTimer) {
    clearTimeout(tipTimer)
  }
  if (tipHandler) {
    tipHandler()
    tipHandler = null
  }
}
export default {
  showLoading(options: TipOption) {
    if (tipHandler) {
      return
    }
    const { text = i18n.t('加载中'), duration = 2000 } = options

    tipHandler = showReactDialog(<Tip icon='loading' text={text} />)
  },
  hideLoading() {
    clearTipTask()
  },
  info(options: TipOption) {
    clearTipTask()
    const { text = '', duration = 2000 } = options
    tipHandler = showReactDialog(<Tip icon='info' text={text} />)
    tipTimer = setTimeout(() => {
      if (tipHandler) tipHandler()
      tipHandler = null
    }, duration)
  },
}
