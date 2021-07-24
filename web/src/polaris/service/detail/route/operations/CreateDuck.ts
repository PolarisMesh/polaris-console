import DetailPageDuck from "@src/polaris/common/ducks/DetailPage";
import { reduceFromPayload, createToPayload } from "saga-duck";
import { takeLatest } from "redux-saga-catch";
import { select, put } from "redux-saga/effects";
import Form from "@src/polaris/common/ducks/Form";
import { format as prettyFormat } from "pretty-format";

import {
  Destination,
  Source,
  RuleType,
  DestinationItem,
  SourceItem,
  MATCH_TYPE,
  MetadataItem,
  getTemplateRouteInbounds,
  getTemplateRouteOutbounds,
} from "../types";
import {
  describeRoutes,
  DescribeRoutesResult,
  Routing,
  createRoutes,
  modifyRoutes,
} from "../model";
import { ComposedId } from "../../types";
import { EditType } from "./Create";
import router from "@src/polaris/common/util/router";
import tips from "@src/polaris/common/util/tips";

const convertMetadataMapInArray = (o) => {
  return o.map((item) => {
    const metadata = item.metadata;
    const convertedMetadata = Object.keys(metadata).map((key) => {
      return {
        key,
        value: metadata[key].value,
        type: metadata[key].type ? metadata[key].type : MATCH_TYPE.EXACT,
      };
    });
    return {
      ...item,
      metadata: convertedMetadata,
    };
  });
};
const convertMetadataArrayToMap = (metadataArray) => {
  const metadataMap = {};
  metadataArray.forEach((metadata) => {
    const { key, value, type } = metadata;
    metadataMap[key] = { value, type };
  });
  return metadataMap;
};
const convertRuleValuesToParams = (ruleValues, namespace, service) => {
  return ruleValues.map((rule) => {
    return {
      ...rule,
      metadata: convertMetadataArrayToMap(rule.metadata),
      namespace,
      service,
    };
  });
};

export default class RouteCreateDuck extends DetailPageDuck {
  ComposedId: ComposedId;
  Data: Routing;

  get baseUrl() {
    return "/#/route-create";
  }

  get params() {
    const { types } = this;
    return [
      ...super.params,
      {
        key: "namespace",
        type: types.SET_NAMESPACE,
        defaults: "",
      },
      {
        key: "service",
        type: types.SET_SERVICE_NAME,
        defaults: "",
      },
      {
        key: "ruleIndex",
        type: types.SET_RULEINDEX,
        defaults: -1,
      },
      {
        key: "ruleType",
        type: types.SET_RULE_TYPE,
        defaults: RuleType.Inbound,
      },
    ];
  }
  get quickTypes() {
    enum Types {
      SWITCH,
      SET_NAMESPACE,
      SET_SERVICE_NAME,
      SET_RULEINDEX,
      SET_RULE_TYPE,
      SUBMIT,
    }
    return {
      ...super.quickTypes,
      ...Types,
    };
  }
  get quickDucks() {
    return {
      ...super.quickDucks,
      form: CreateForm,
    };
  }
  get reducers() {
    const { types } = this;
    return {
      ...super.reducers,
      namespace: reduceFromPayload(types.SET_NAMESPACE, ""),
      service: reduceFromPayload(types.SET_SERVICE_NAME, ""),

      ruleIndex: reduceFromPayload(types.SET_RULEINDEX, -1),
      ruleType: reduceFromPayload(types.SET_RULE_TYPE, RuleType.Inbound),
    };
  }
  get creators() {
    const { types } = this;
    return {
      ...super.creators,
      submit: createToPayload<void>(types.SUBMIT),
    };
  }
  get rawSelectors() {
    type State = this["State"];
    return {
      ...super.rawSelectors,
      composedId: (state: State) => ({
        name: state.service,
        namespace: state.namespace,
      }),
    };
  }
  async getData(composedId: this["ComposedId"]) {
    const { name, namespace } = composedId;
    const result = await describeRoutes({
      namespace,
      service: name,
    });
    return result;
  }
  *saga() {
    const { types, selector, creators, ducks } = this;
    yield* super.saga();
    yield takeLatest(types.FETCH_DONE, function* (action) {
      const values = action.payload;
      const { ruleIndex, ruleType, service, namespace } = selector(
        yield select()
      );
      const emptyRule = {
        service,
        namespace,
        inboundDestinations: [
          {
            service,
            namespace,
            metadata: [{ key: "", value: "", type: MATCH_TYPE.EXACT }],
            priority: 0,
            weight: 100,
            isolate: true,
          },
        ],
        inboundSources: [
          {
            service: "",
            namespace: "",
            metadata: [{ key: "", value: "", type: MATCH_TYPE.EXACT }],
          },
        ],
        outboundSources: [
          {
            service: "",
            namespace: "",
            metadata: [{ key: "", value: "", type: MATCH_TYPE.EXACT }],
          },
        ],
        outboundDestinations: [
          {
            service,
            namespace,
            metadata: [{ key: "", value: "", type: MATCH_TYPE.EXACT }],
            priority: 0,
            weight: 100,
            isolate: true,
          },
        ],
        inboundNamespace: "*",
        inboundService: "*",
        outboundService: "*",
        outboundNamespace: "*",
        editType: EditType.Manual,
        ruleType: RuleType.Inbound,
        inboundJsonValue: getTemplateRouteInbounds(namespace, service),
        outboundJsonValue: getTemplateRouteOutbounds(namespace, service),
      };
      if (Number(ruleIndex) === -1) {
        yield put(ducks.form.creators.setValues(emptyRule));
      } else {
        if (values.length > 0) {
          const routing = values[0] as Routing;
          const rule = routing[ruleType][ruleIndex];
          const ruleNamespace =
            ruleType === RuleType.Inbound
              ? rule.sources?.[0].namespace
              : rule.destinations?.[0].namespace;
          const ruleService =
            ruleType === RuleType.Inbound
              ? rule.sources?.[0].service
              : rule.destinations?.[0].service;
          const formValueKey =
            ruleType === RuleType.Inbound ? "inbound" : "outbound";
          return yield put(
            ducks.form.creators.setValues({
              ...emptyRule,
              [`${formValueKey}Destinations`]: convertMetadataMapInArray(
                rule.destinations
              ),
              [`${formValueKey}Sources`]: convertMetadataMapInArray(
                rule.sources
              ),
              ruleType,
              [`${formValueKey}Namespace`]: ruleNamespace,
              [`${formValueKey}Service`]: ruleService,
              [`${formValueKey}JsonValue`]: JSON.stringify(rule, null, 4),
            })
          );
        }
      }
    });
    yield takeLatest(types.SUBMIT, function* (action) {
      const { values } = ducks.form.selector(yield select());
      const { ruleIndex, data } = selector(yield select());
      yield put(ducks.form.creators.setAllTouched(true));

      const firstInvalid = yield select(ducks.form.selectors.firstInvalid);
      if (firstInvalid) {
        return false;
      }
      const {
        service: currentService,
        namespace: currentNamespace,
        inboundDestinations,
        inboundSources,
        outboundDestinations,
        outboundSources,
        inboundNamespace,
        inboundService,
        outboundService,
        outboundNamespace,
        editType,
        ruleType,
        inboundJsonValue,
        outboundJsonValue,
      } = values;
      let params = {
        service: currentService,
        namespace: currentNamespace,
      } as any;
      let originData = data[0] || {};
      if (ruleType === RuleType.Inbound) {
        const editItem =
          editType === EditType.Json
            ? JSON.parse(inboundJsonValue)
            : {
                sources: convertRuleValuesToParams(
                  inboundSources,
                  inboundNamespace,
                  inboundService
                ),
                destinations: convertRuleValuesToParams(
                  inboundDestinations,
                  currentNamespace,
                  currentService
                ),
              };
        let newArray;
        if (Number(ruleIndex) === -1) {
          newArray = (originData.inbounds || []).concat([editItem]);
        } else {
          (originData.inbounds || []).splice(ruleIndex, 1, editItem);
          newArray = originData.inbounds;
        }
        params = {
          ...params,
          inbounds: newArray,
          outbounds: originData.outbounds || [],
        };
      } else {
        const editItem =
          editType === EditType.Json
            ? JSON.parse(outboundJsonValue)
            : {
                sources: convertRuleValuesToParams(
                  outboundSources,
                  currentNamespace,
                  currentService
                ),
                destinations: convertRuleValuesToParams(
                  outboundDestinations,
                  outboundNamespace,
                  outboundService
                ),
              };
        let newArray;
        if (Number(ruleIndex) === -1) {
          newArray = (originData.outbounds || []).concat([editItem]);
        } else {
          (originData.outbounds || []).splice(ruleIndex, 1, editItem);
          newArray = originData.outbounds;
        }
        params = {
          ...params,
          inbounds: originData.inbounds || [],
          outbounds: newArray,
        };
      }
      if (
        originData?.inbounds?.length > 0 ||
        originData?.outbounds?.length > 0
      ) {
        const result = yield modifyRoutes([params]);
      } else {
        const result = yield createRoutes([params]);
      }
      router.navigate(
        `/service-detail?namespace=${currentNamespace}&name=${currentService}&tab=route`
      );
    });
  }
}
export interface Values {
  service: string;
  namespace: string;
  inboundDestinations: DestinationItem[];
  inboundSources: SourceItem[];
  outboundDestinations: DestinationItem[];
  outboundSources: SourceItem[];
  inboundNamespace: string;
  inboundService: string;
  outboundService: string;
  outboundNamespace: string;
  editType: EditType;
  ruleType: RuleType;
  inboundJsonValue?: string;
  outboundJsonValue?: string;
}
class CreateForm extends Form {
  Values: Values;
  Meta: {};
  validate(v: this["Values"], meta: this["Meta"]) {
    return validator(v, meta);
  }
}
const validator = CreateForm.combineValidators<Values, {}>({
  inboundJsonValue(v, meta) {
    if (meta.editType === EditType.Json && meta.ruleType === RuleType.Inbound) {
      try {
        JSON.parse(v);
      } catch (e) {
        return "请输入正确的JSON字符串";
      }
    }
  },
  outboundJsonValue(v, meta) {
    if (
      meta.editType === EditType.Json &&
      meta.ruleType === RuleType.Outbound
    ) {
      try {
        JSON.parse(v);
      } catch (e) {
        return "请输入正确的JSON字符串";
      }
    }
  },
  inboundSources(v, meta) {
    if (meta.ruleType !== RuleType.Inbound || meta.editType === EditType.Json) {
      return;
    }
    const res = Form.combineValidators<SourceItem[]>([
      {
        metadata(v, meta) {
          const res = Form.combineValidators<MetadataItem[]>([
            {
              key(v) {
                if (!v) return "标签键不能为空";
              },
              value(v) {
                if (!v) return "标签值不能为空";
              },
            },
          ])(v, meta);
          return res;
        },
      },
    ])(v, meta);
    return res;
  },
  outboundSources(v, meta) {
    if (
      meta.ruleType !== RuleType.Outbound ||
      meta.editType === EditType.Json
    ) {
      return;
    }
    const res = Form.combineValidators<SourceItem[]>([
      {
        metadata(v, meta) {
          const res = Form.combineValidators<MetadataItem[]>([
            {
              key(v) {
                if (!v) return "标签键不能为空";
              },
              value(v) {
                if (!v) return "标签值不能为空";
              },
            },
          ])(v, meta);
          return res;
        },
      },
    ])(v, meta);
    return res;
  },
  inboundDestinations(v, meta) {
    if (meta.ruleType !== RuleType.Inbound || meta.editType === EditType.Json) {
      return;
    }
    const res = Form.combineValidators<DestinationItem[]>([
      {
        metadata(v, meta) {
          const res = Form.combineValidators<MetadataItem[]>([
            {
              key(v) {
                if (!v) return "标签键不能为空";
              },
              value(v) {
                if (!v) return "标签值不能为空";
              },
            },
          ])(v, meta);
          return res;
        },
      },
    ])(v, meta);
    return res;
  },
  outboundDestinations(v, meta) {
    if (
      meta.ruleType !== RuleType.Outbound ||
      meta.editType === EditType.Json
    ) {
      return;
    }
    const res = Form.combineValidators<DestinationItem[]>([
      {
        metadata(v, meta) {
          const res = Form.combineValidators<MetadataItem[]>([
            {
              key(v) {
                if (!v) return "标签键不能为空";
              },
              value(v) {
                if (!v) return "标签值不能为空";
              },
            },
          ])(v, meta);
          return res;
        },
      },
    ])(v, meta);
    return res;
  },
  inboundNamespace(v, meta) {
    if (
      !v &&
      meta.ruleType === RuleType.Inbound &&
      meta.editType !== EditType.Json
    ) {
      return "请输入命名空间";
    }
  },
  inboundService(v, meta) {
    if (
      !v &&
      meta.ruleType === RuleType.Inbound &&
      meta.editType !== EditType.Json
    ) {
      return "请输入服务名";
    }
  },
  outboundNamespace(v, meta) {
    if (
      !v &&
      meta.ruleType === RuleType.Outbound &&
      meta.editType !== EditType.Json
    ) {
      return "请输入命名空间";
    }
  },
  outboundService(v, meta) {
    if (
      !v &&
      meta.ruleType === RuleType.Outbound &&
      meta.editType !== EditType.Json
    ) {
      return "请输入服务名";
    }
  },
});