import {
  Module,
  VuexModule,
  getModule,
  MutationAction,
  Action,
  Mutation,
} from "vuex-module-decorators";
import store from "./index";
import { getRTCData } from "../api";
import { initRTC } from "../utils";
import router from "@/router";
const RongIMLib = (window as any).RongIMLib;

interface IRTCState {
  appid: string;
  token: string;
  imstatus: number;
  message: string;
}
let rtc: {
  Room: any;
  Stream: any;
  Message: any;
  Device: any;
  Storage: any;
  StreamType: any;
} = null as any;
let room: any;

@Module({ dynamic: true, namespaced: true, store, name: "rtc" })
class RTC extends VuexModule implements IRTCState {
  public appid = "";
  public token = "";
  public userId = "";
  public imstatus = 1;
  public message = "";
  @MutationAction({ mutate: ["appid", "token"] })
  public async getCert(uid: string) {
    const e = await getRTCData(uid);
    if (e.error) {
      return {
        appid: "",
        token: "",
      };
    }
    return e;
  }

  @Mutation
  private SET_IMSTATUS(v: number) {
    this.imstatus = v;
  }
  @Mutation
  private SET_MESSAGE(v: string) {
    this.message = v;
  }

  @Action
  public async init() {
    const { RongIMClient } = RongIMLib;
    console.log(RongIMLib);
    RongIMClient.init(this.appid);
    // 连接状态监听器
    RongIMClient.setConnectionStatusListener({
      onChanged: (status: any) => {
        // status 标识当前连接状态
        if (
          this.imstatus === RongIMLib.ConnectionStatus.CONNECTED &&
          this.imstatus !== status
        ) {
          if (router.currentRoute.path !== "/") {
            router.replace("/");
          } else {
            router.go(0);
          }
        }
        switch (status) {
          case RongIMLib.ConnectionStatus.CONNECTED:
            console.log("链接成功");
            break;
          case RongIMLib.ConnectionStatus.CONNECTING:
            console.log("正在链接");
            break;
          case RongIMLib.ConnectionStatus.DISCONNECTED:
            console.log("断开连接");
            break;
          case RongIMLib.ConnectionStatus.KICKED_OFFLINE_BY_OTHER_CLIENT:
            console.log("其他设备登录");
            break;
          case RongIMLib.ConnectionStatus.DOMAIN_INCORRECT:
            console.log("域名不正确");
            break;
          case RongIMLib.ConnectionStatus.NETWORK_UNAVAILABLE:
            console.log("网络不可用");
            break;
        }
        this.SET_IMSTATUS(status);
      },
    });
    // 消息监听器
    RongIMClient.setOnReceiveMessageListener({
      onReceived: function(message: any) {
        console.log(message);
      },
    });
    RongIMClient.connect(this.token, {
      onSuccess: (userId: string) => {
        this.SET_MESSAGE("Connect successfully. " + userId);
        initRTC();
      },
      onTokenIncorrect: () => {
        this.SET_MESSAGE("token 无效");
      },
      onError: (errorCode: string) => {
        var info = "";
        switch (errorCode) {
          case RongIMLib.ErrorCode.TIMEOUT:
            info = "超时";
            break;
          case RongIMLib.ConnectionState.UNACCEPTABLE_PAROTOCOL_VERSION:
            info = "不可接受的协议版本";
            break;
          case RongIMLib.ConnectionState.IDENTIFIER_REJECTED:
            info = "appkey不正确";
            break;
          case RongIMLib.ConnectionState.SERVER_UNAVAILABLE:
            info = "服务器不可用";
            break;
        }
        this.SET_MESSAGE(info);
      },
    });
  }
}

export const RTCModule = getModule(RTC);