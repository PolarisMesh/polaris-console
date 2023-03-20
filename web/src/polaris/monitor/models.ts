import { APIRequestOption, getApiRequest } from '@src/polaris/common/util/apiRequest'
import axios from 'axios'

interface PromethusResponse<T> {
  data: T
  status: string
}
export interface MonitorFetcherData {
  metrics: Record<string, string>
  values: Array<Array<number>>
}
export async function getPromethusApiRequest<T>(options: APIRequestOption) {
  const { action, data = {}, opts } = options
  try {
    //tips.showLoading({});
    const res = await axios.get<PromethusResponse<T>>(action, {
      params: data,
      ...opts,
    })
    if (res.data.status !== 'success') {
      throw res.data
    }
    return res.data
  } catch (e) {
    console.error(e)
  } finally {
    //tips.hideLoading();
  }
}
export interface DeleteInstancesParams {
  id: string
}
export interface GetMonitorDataParams {
  query: string
  start: number
  end: number
  step: number
}

export interface GetLabelDataParams {
  match?: string[]
  start?: number
  end?: number
  labelKey: string
}
export async function getMonitorData(params: GetMonitorDataParams) {
  const res = await getPromethusApiRequest<{ result: MonitorFetcherData[] }>({
    action: `api/v1/query_range`,
    data: new URLSearchParams(params as any),
  })
  return res.data.result
}
export async function getLabelData(params: GetLabelDataParams) {
  const searchParams = new URLSearchParams()

  if (params.match) {
    params.match.forEach(match => searchParams.append('match[]', match))
    searchParams.append('start', params.start.toString())
    searchParams.append('end', params.end.toString())
  }
  const res = await getPromethusApiRequest<string[]>({
    action: `api/v1/label/${params.labelKey}/values`,
    data: searchParams,
  })
  return res.data
}

export interface MetricInterface {
  name: string // 接口名称
  desc: string // 接口描述
  type: string // 接口类型
  query_labels: string[]
}

export async function getMetricsInterface() {
  const res = await getApiRequest<MetricInterface[]>({
    action: 'metrics/v1/server/interfaces',
    data: {},
  })

  return res
}

export async function getNamespaceNodes() {
  const res = await getApiRequest<{ data: string[] }>({
    action: 'metrics/v1/server/nodes',
    data: {},
  })

  return res.data
}
