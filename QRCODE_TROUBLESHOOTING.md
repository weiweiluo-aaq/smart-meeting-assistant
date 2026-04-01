# 二维码显示问题解决方案

## 🐛 问题描述
页面看不到二维码，可能是因为QRCode.js库没有正确加载或初始化。

## 🔧 解决方案

### 方法1：检查网络连接
确保您的网络连接正常，可以访问CDN资源。

### 方法2：手动刷新二维码
点击页面上的"刷新二维码"按钮，尝试重新生成二维码。

### 方法3：使用备用CDN链接
如果当前CDN链接无法访问，可以尝试更换为以下备用链接：

```html
<!-- 备用CDN链接1 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

<!-- 备用CDN链接2 -->
<script src="https://unpkg.com/qrcode@1.5.1/build/qrcode.min.js"></script>

<!-- 备用CDN链接3 -->
<script src="https://cdn.jsdelivr.net/npm/qrcode@latest/build/qrcode.min.js"></script>
```

### 方法4：本地引入库文件
1. 下载QRCode.js库文件到项目目录
2. 在index.html中引入本地文件：

```html
<script src="qrcode.min.js"></script>
```

### 方法5：检查浏览器控制台
按F12打开浏览器控制台，查看是否有错误信息：
- 如果显示"QRCode is not defined"，说明库没有正确加载
- 如果显示其他错误，根据错误信息进行排查

### 方法6：使用纯HTML替代方案
如果二维码库无法正常工作，可以使用在线二维码生成服务：

```javascript
function generateQRCode() {
    const meetingId = this.meetingId;
    const meetingUrl = `${window.location.origin}${window.location.pathname}input.html?meeting=${meetingId}`;
    
    document.getElementById('meeting-id').textContent = meetingId;
    
    // 使用在线API生成二维码
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = `
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(meetingUrl)}" 
             alt="会议二维码" 
             class="border-4 border-gray-200 rounded-lg p-2">
    `;
}
```

### 方法7：手动输入链接
如果二维码无法显示，可以让参会人员手动输入链接：

1. 在主页面查看会议编号（例如：MEET-20260331-ABC123）
2. 参会人员访问输入页面：`input.html?meeting=MEET-20260331-ABC123`
3. 或者直接访问完整URL：`http://your-server/input.html?meeting=MEET-20260331-ABC123`

## 📝 排查步骤

1. **检查浏览器控制台**：按F12打开开发者工具，查看是否有JavaScript错误
2. **检查网络请求**：在"网络"标签页中查看QRCode.js是否成功加载
3. **测试简单示例**：创建一个简单的HTML文件测试二维码生成
4. **尝试不同浏览器**：在Chrome、Firefox、Safari等浏览器中测试
5. **清除浏览器缓存**：清除缓存后重新加载页面

## 🎯 预防措施

1. **添加备用CDN链接**：在页面中添加多个CDN链接，提高可靠性
2. **添加错误处理**：在JavaScript中添加错误处理代码
3. **提供备用方案**：当二维码无法显示时，提供手动输入方式
4. **本地备份库文件**：将库文件下载到本地，作为备用方案

## 📞 技术支持

如果问题仍然无法解决，请提供以下信息：
- 浏览器类型和版本
- 控制台错误信息
- 网络请求截图
- 页面显示截图

我们会尽快为您解决问题！