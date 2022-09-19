import React from 'react'
import { DuckCmpProps, purify } from 'saga-duck'
import Duck from './CreateDuck'
import { Form, Select, FormItem, Table, FormControl, Button } from 'tea-component'
import Dialog from '@src/polaris/common/duckComponents/Dialog'
import FormField from '@src/polaris/common/duckComponents/form/Field'
import Input from '@src/polaris/common/duckComponents/form/Input'
import { TagTable } from '@src/polaris/common/components/TagTable'

export default function Create(props: DuckCmpProps<Duck>) {
  const { duck, store, dispatch } = props
  const { selectors } = duck
  const visible = selectors.visible(store)
  if (!visible) {
    return <noscript />
  }
  const data = selectors.data(store)
  return (
    <Dialog
      duck={duck}
      store={store}
      dispatch={dispatch}
      size={'l'}
      title={data.name ? '编辑配置文件' : '新建配置文件'}
    >
      <CreateForm duck={duck} store={store} dispatch={dispatch} />
    </Dialog>
  )
}

export enum FileFormat {
  YAML = 'yaml',
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  PROPERTIES = 'properties',
  TEXT = 'text',
}
const FileFormatOptions = Object.values(FileFormat).map(item => ({ text: item, value: item }))

const CreateForm = purify(function CreateForm(props: DuckCmpProps<Duck>) {
  const { duck, store, dispatch } = props
  const {
    ducks: { form },
    selectors,
  } = duck

  const formApi = form.getAPI(store, dispatch)
  const { namespace, comment, name, group, format, tags } = formApi.getFields([
    'namespace',
    'name',
    'comment',
    'group',
    'format',
    'tags',
  ])
  const options = selectors.options(store)

  return (
    <>
      <Form>
        <FormField field={namespace} label={'命名空间'} required>
          <Select
            searchable
            value={namespace.getValue()}
            options={options.namespaceList}
            onChange={value => {
              if (value !== namespace.getValue()) {
                group.setValue('')
              }
              namespace.setValue(value)
            }}
            type={'simulate'}
            appearance={'button'}
            size='m'
            disabled={options.isModify}
          ></Select>
        </FormField>
        <FormField field={group} label={'配置分组'} required>
          <Select
            searchable
            value={group.getValue()}
            options={options.configFileGroupList?.map(item => ({ text: item.name, value: item.name }))}
            onChange={value => group.setValue(value)}
            type={'simulate'}
            appearance={'button'}
            size='m'
            disabled={options.isModify}
          ></Select>
        </FormField>
        <FormField
          field={name}
          label={'配置文件名'}
          required
          message={'可通过/分隔符创建文件夹，强烈建议文件名带上后缀，如：datasource/master.json'}
        >
          <Input
            field={name}
            disabled={options.isModify}
            maxLength={128}
            onChange={val => {
              const suffix = val.substring(val.lastIndexOf('.') + 1)
              FileFormatOptions.forEach(item => {
                if (suffix === item.text) {
                  format.setValue(suffix)
                }
              })
            }}
            placeholder={'允许数字、英文字母、.、-、_，限制128个字符'}
            size={'l'}
          />
        </FormField>
        <FormField field={format} label={'文件格式'} required>
          <Select
            value={format.getValue()}
            options={FileFormatOptions}
            onChange={value => format.setValue(value)}
            type={'simulate'}
            appearance={'button'}
          ></Select>
        </FormField>
        <FormField field={comment} label={'备注'}>
          <Input field={comment} maxLength={1024} placeholder={'长度不超过1024个字符'} size={'l'} />
        </FormField>
        <FormItem label={'配置标签'}>
          <TagTable tags={tags} />
        </FormItem>
      </Form>
    </>
  )
})
