# uni-bluetooth-utils

此项目用于帮助开发者开始在uniapp中使用封装好的工具函数实现低功耗蓝牙设备的连接和通讯。

## 安装

```sh
npm install
```

### 引入和使用

```
import BLE from './BLE.js'

const instance = new BLE()

instance.openBluetoothAdapter().catch((e) => {
    uni.showToast({
        title: e.errMsg || '蓝牙未能正常开启',
        icon: 'none'
    })
})

//蓝牙未开启
if (!instance.available) {
     await instance.openBluetoothAdapter()
}
available = await instance.getBluetoothAdapterState()
if (!available) {
    await instance.openBluetoothAdapter()
}
deviceId = await instance.startBluetoothDevicesDiscovery(deviceName, deviceMac)
//未连接
if (!instance.connected) {
    const state = await instance.createBLEConnection(deviceId)
    await instance.getBLEDeviceServices(deviceId)
    await instance.getBLEDeviceCharacteristics(deviceId)
    await instance.notify(deviceId, instance.serviceId)
    instance.onBLECharacteristicValueChange().then((res) => {
        console.log(res)
    })
    setTimeout(async () => {
        uni.showToast({
            icon: 'loading',
            title: '发送中请稍后',
            duration: 2000
        })
        instance.send(instance.readCommand, deviceId)
    }, 800)
}
```

