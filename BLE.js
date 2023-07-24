class BLE {
    constructor(isIOS = false) {
        this.isIOS = isIOS || false //是否为ios
        this.available = false //蓝牙适配器状态
        this.searching = false //蓝牙搜索状态
        this.connected = false //蓝牙连接状态
        this.searchTimeout = 10000 // 默认搜索时长10s
        this.deviceId = '' //需要连接的蓝牙设备id
        this.connectedDevices = '' //连接过的设备
        this.timeout = 0 //搜索超时时长
        this.serviceId = '0000FE60-0000-1000-8000-00805F9B34FB' //服务id
        this.sendCharacteristicId = '0000FE61-0000-1000-8000-00805F9B34FB' //发送特征码
        this.reCharacteristicId = '0000FE62-0000-1000-8000-00805F9B34FB' //读取特征码
        this.readCommand = '6821AAAAAAAAAAAAAA0813010004EE950BDFE352DCEE8588CBEDB8D145344F16' //要发送的指令
    }

    //获取蓝牙适配器状态
    getBluetoothAdapterState() {
        const self = this
        return new Promise((resolve, reject) => {
            uni.getBluetoothAdapterState({
                success(res) {
                    self.available = res.available
                    if (res.available) {
                        resolve(res.available)
                    } else {
                        uni.showToast({
                            duration: 2000,
                            title: '蓝牙适配器异常',
                            icon: 'error'
                        })
                        reject(res.available)
                    }
                },
                fail(e) {
                    reject(e)
                }
            })
        })
    }

    //开启蓝牙适配器
    openBluetoothAdapter() {
        const self = this
        return new Promise((resolve, reject) => {
            uni.openBluetoothAdapter({
                success(res) {
                    console.log('初始化蓝牙成功', res)
                    uni.showToast({
                        duration: 1000,
                        title: '蓝牙已开启',
                        icon: 'success'
                    })
                    self.available = true
                    //监听连接状态
                    uni.onBLEConnectionStateChange((res1) => {
                        console.log(`设备${res1.deviceId} 连接状态已更改, 连接状态: ${res1.connected}`)
                        self.connected = res1.connected
                        if (!res1.connected) {
                            uni.showToast({
                                duration: 2000,
                                title: '当前设备已断开连接',
                                icon: 'error'
                            })
                        }
                    })
                    resolve(res)
                },
                fail(err) {
                    console.log('初始化蓝牙失败', err)
                    if (err.errCode === 10001) {
                        self.available = false
                        reject('请确保开启手机蓝牙')
                    }
                    reject('蓝牙设备异常')
                },
                complete() {
                    // 监听蓝牙适配器状态变化事件
                    uni.onBluetoothAdapterStateChange((res) => {
                        if (res.available) {
                            self.available = true
                        } else {
                            uni.showToast({
                                duration: 1000,
                                title: '蓝牙已关闭',
                                icon: 'error'
                            })
                            self.available = false
                            self.connected = false
                        }
                    })
                }
            })
        })
    }

    //关闭蓝牙适配器
    closeBluetoothAdapter() {
        console.log('关闭蓝牙适配器')
        const self = this
        return new Promise((resolve, reject) => {
            uni.closeBluetoothAdapter({
                success: (res) => {
                    self.available = false //蓝牙适配器状态
                    self.searching = false //蓝牙搜索状态
                    self.connected = false //蓝牙连接状态
                    // self.deviceId = '' //需要连接的蓝牙设备id
                    resolve('蓝牙适配器已关闭')
                },
                fail: (err) => reject('蓝牙关闭异常')
            })
        })
    }

    //开始搜索外围设备,匹配设备名称和mac地址获取设备id,此处判断为相同设备的条件为mac地址和设备名称与传入的参数相同,如不需要可自行去除
    /**
     *
     * @param deviceName 指定搜寻的设备名称
     * @param mac        要搜索的设备的mac地址
     * @param timeout    搜索指定设备的搜索时长
     * @returns {Promise<unknown>} 返回搜寻的指定设备的deviceId
     */
    startBluetoothDevicesDiscovery(deviceName = '', mac = '', timeout = 0) {
        const self = this
        self.timeout = timeout
        let deviceMac
        return new Promise((resolve, reject) => {
            uni.showLoading({
                title: '查找设备中'
            })
            //获取已连接设备列表，如发现指定折别先前已连接过直接跳过搜索,
            uni.getBluetoothDevices({
                success(res) {
                    if (res.devices.length) {
                        res.devices.forEach((device, index, arr) => {
                            deviceMac = self.convertMac(device)
                            if (mac.toUpperCase() === deviceMac && device.localName === deviceName) {
                                self.searching = false
                                uni.hideLoading()
                                resolve(arr[index].deviceId)
                            }
                            //没有找到则开启搜索
                            else {
                                //如果设定了搜索时长
                                if (self.timeout) {
                                    setTimeout(() => {
                                        if (self.searching) {
                                            self.stopBluetoothDevicesDiscovery()
                                            self.searching = false
                                            uni.hideLoading()
                                            reject('未找到设备,请确保设备在3米范围内')
                                        }
                                    }, self.timeout) // 超过指定时间后停止搜索
                                }
                                if(self.searching){
                                    return
                                }
                                uni.startBluetoothDevicesDiscovery({
                                    services: [self.serviceId],
                                    allowDuplicatesKey: false, //不允许重复上报同一设备
                                    success(res1) {
                                        //已经连接的表广播数据为空
                                        self.searching = true
                                        uni.onBluetoothDeviceFound((devices1) => {
                                            deviceMac = self.convertMac(devices1.devices[0])
                                            if (mac.toUpperCase() === deviceMac && devices1.devices[0].localName === deviceName) {
                                                self.searching = false
                                                uni.hideLoading()
                                                self.stopBluetoothDevicesDiscovery()
                                                resolve(devices1.devices[0].deviceId)
                                            }
                                        })
                                    },
                                    fail(err) {
                                        console.error('搜索失败', err)
                                        if (err.errno === 1509008) {
                                            uni.showModal({
                                                title: '警告',
                                                content: '微信的位置权限被拒绝，请到设置中手动开启授权！',
                                                showCancel: false
                                            })
                                        }
                                        uni.hideLoading()
                                        reject('请开启微信位置授权')
                                    }
                                })
                            }
                        })
                    }
                    // 初次搜索,没有找到在蓝牙模块生效期间所有已发现的蓝牙设备。包括已经和本机处于连接状态的设备。
                    else {
                        //如果设定了搜索时长
                        if (self.timeout) {
                            setTimeout(() => {
                                if (self.searching) {
                                    self.stopBluetoothDevicesDiscovery()
                                    self.searching = false
                                    uni.hideLoading()
                                    reject('未找到设备,请确保设备在3米范围内')
                                }
                            }, self.timeout) // 超过指定时间后停止搜索
                        }
                        uni.startBluetoothDevicesDiscovery({
                            services: [self.serviceId],
                            allowDuplicatesKey: false, //不允许重复上报同一设备
                            success(res2) {
                                //已经连接的表广播数据为空
                                self.searching = true
                                uni.onBluetoothDeviceFound((devices2) => {
                                    deviceMac = self.convertMac(devices2.devices[0])
                                    if (mac.toUpperCase() === deviceMac && devices2.devices[0].localName === deviceName) {
                                        self.searching = false
                                        uni.hideLoading()
                                        self.stopBluetoothDevicesDiscovery()
                                        resolve(devices2.devices[0].deviceId)
                                    }
                                })
                            },
                            fail(err) {
                                console.error('搜索失败', err)
                                if (err.errno === 1509008) {
                                    uni.showModal({
                                        title: '警告',
                                        content: '微信的位置权限被拒绝，请到设置中手动开启授权！',
                                        showCancel: false
                                    })
                                }
                                uni.hideLoading()
                                reject('未能开启蓝牙搜索')
                            }
                        })
                    }
                },
                fail(err) {
                    uni.hideLoading()
                    reject(err.errMsg)
                }
            })
        })
    }

    //停止搜素外围设备
    stopBluetoothDevicesDiscovery() {
        const self = this
        return new Promise((resolve, reject) => {
            uni.stopBluetoothDevicesDiscovery({
                success(res) {
                    console.log('停止搜索: ', res)
                    self.searching = false
                    resolve()
                },
                fail(err) {
                    reject('停止搜索蓝牙设备异常')
                    console.error(err)
                }
            })
        })
    }

    // 获取在蓝牙模块生效期间所有搜索到的蓝牙设备。包括已经和本机处于连接状态的设备。
    getBluetoothDevices() {
        return new Promise((resolve, reject) => {
            uni.getBluetoothDevices({
                success: (res) => resolve(res),
                fail: (err) => reject(err.errMsg)
            })
        })
    }

    //连接低功耗蓝牙
    createBLEConnection(deviceId) {
        const self = this
        // if (self.connected && self.deviceId && deviceId == self.deviceId) {
        // 	uni.showToast({
        // 		title: '请勿重复连接',
        // 		icon: 'none'
        // 	});
        // 	return Promise.reject();
        // }
        uni.showLoading({
            title: '连接中请稍后'
        })
        return new Promise((resolve, reject) => {
            uni.createBLEConnection({
                deviceId: deviceId,
                success(res) {
                    console.log('连接成功: ', res)
                    // 根据主服务 UUID 获取已连接的蓝牙设备。
                    uni.getConnectedBluetoothDevices({
                        services: [self.serviceId],
                        success(res) {
                            console.log('根据主服务 UUID 获取已连接的蓝牙设备。', res)
                        }
                    })
                    self.deviceId = deviceId
                    if (!self.isIOS) {
                        uni.setBLEMTU({
                            deviceId: deviceId || self.deviceId,
                            mtu: 210
                        })
                    }
                    uni.hideLoading()
                    uni.showToast({
                        icon: 'success',
                        title: '蓝牙已连接',
                        duration: 2000
                    })
                    self.connected = true
                    resolve(res)
                },
                fail(err) {
                    console.error('连接失败', err)
                    self.connected = false
                    uni.showToast({
                        title: '蓝牙连接失败',
                        icon: 'error'
                    })
                    reject('蓝牙连接异常,请保持设备在3米范围内')
                },
                complete() {
                    uni.hideLoading()
                }
            })
        })
    }

    //断开低功耗蓝牙连接
    closeBLEConnection(deviceId) {
        const self = this
        return new Promise((resolve, reject) => {
            uni.closeBLEConnection({
                deviceId: deviceId || self.deviceId,
                success: (res) => {
                    console.log('蓝牙已断开')
                    self.connected = false
                    resolve('蓝牙已断开')
                },
                fail: (e) => {
                    console.log('蓝牙未能正常断开')
                    reject('蓝牙未能正常断开')
                }
            })
        })
    }

    //获取指定蓝牙设备服务
    getBLEDeviceServices(deviceId) {
        return new Promise((resolve, reject) => {
            uni.getBLEDeviceServices({
                deviceId,
                success(res) {
                    console.log('获取服务成功: ', res)
                    resolve(res)
                },
                fail(err) {
                    console.error('获取服务失败', err)
                    reject('获取服务失败')
                }
            })
        })
    }

    //获取服务特征值
    getBLEDeviceCharacteristics(deviceId) {
        const self = this
        return new Promise((resolve, reject) => {
            uni.getBLEDeviceCharacteristics({
                deviceId,
                serviceId: self.serviceId,
                success(res) {
                    console.log('获取特征值成功: ', res)
                    resolve(res)
                },
                fail(err) {
                    console.error(err)
                    reject('获取特征值失败')
                }
            })
        })
    }

    //启用蓝牙低功耗设备特征值变化时的 notify 功能，订阅特征
    notify(deviceId, serviceId, state = true) {
        const self = this
        return new Promise((resolve, reject) => {
            uni.notifyBLECharacteristicValueChange({
                deviceId,
                serviceId,
                characteristicId: self.reCharacteristicId,
                state,
                type: 'notification',
                success(res) {
                    console.log('订阅成功', res)
                    resolve(res)
                },
                fail(err) {
                    console.error(err)
                    reject('订阅失败')
                }
            })
        })
    }

    //监听蓝牙低功耗设备的特征值变化事件
    onBLECharacteristicValueChange() {
        const self = this
        console.log('开始监听特征值变化')
        return new Promise((resolve) => {
            uni.onBLECharacteristicValueChange((res) => {
                let resHex = self.ab2hex(res.value)
                console.log('接收到数据  ', resHex)
                resolve(resHex)
            })
        })
    }

    //发送数据
    send(command, deviceId) {
        const self = this
        // let msg = command // 向蓝牙设备发送一个0x00的16进制数据
        let typedArray = new Uint8Array(
            command.match(/[\da-f]{2}/gi).map(function (h) {
                return parseInt(h, 16)
            })
        )
        let buffer = typedArray.buffer
        // let hexBytes = new Uint8Array(msg.length / 2)
        // for (let i = 0; i < msg.length; i += 2) {
        //     hexBytes[i / 2] = parseInt(msg.substring(i, i + 2), 16)
        // }
        // let buffer = hexBytes.buffer
        // let dataView = new DataView(buffer)
        return new Promise((resolve, reject) => {
            uni.writeBLECharacteristicValue({
                deviceId,
                serviceId: self.serviceId,
                characteristicId: self.sendCharacteristicId,
                value: buffer,
                success(res) {
                    console.log('发送成功', res.errMsg)
                    resolve()
                },
                fail(err) {
                    console.error(err)
                    uni.showToast({
                        title: '发送指令失败',
                        icon: 'error'
                    })
                    reject()
                }
            })
        })
    }

    //读取特征值变化
    readBLECharacteristicValue(deviceId, serviceId, characteristicId) {
        return new Promise((resolve, reject) => {
            uni.readBLECharacteristicValue({
                deviceId,
                serviceId,
                characteristicId,
                success: (res) => resolve(res),
                fail: (err) => reject('读取特征值变化异常')
            })
        })
    }

    // ArrayBuffer转16进制字符串
    ab2hex(buffer) {
        const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
            return ('00' + bit.toString(16)).slice(-2)
        })
        return hexArr.join('')
    }

    //ios下从广播数据中获取设备的mac地址,此处根据业务实际需求来
    convertMac(device) {
        if (device.advertisData) {
            const buffer = device.advertisData.slice(2, 8)
            let deviceMac = Array.prototype.map
                .call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2))
                .reverse()
                .join(':')
            deviceMac = deviceMac.toUpperCase()
            return deviceMac
        }
    }
}

export default BLE
