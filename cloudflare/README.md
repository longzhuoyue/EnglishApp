# 免费 AI 对话服务

本目录是 WordSpring 的 Cloudflare Worker。GitHub Pages 仍托管原网页，Worker 仅处理 AI 对话和短录音转文字。对话内容和录音会发送至 Cloudflare。访问口令保存为 Worker Secret，不写进公开仓库；手机端仅把口令存在本机 Safari 网站数据中，不随学习进度备份导出。

语音识别模型有时返回繁体字。Worker 使用 OpenCC 在返回识别文字前转换为中国大陆简体中文；部署前在本目录运行 `pnpm install` 安装锁定版本的依赖。

## 免费边界

只使用 **Workers Free** 和 Workers AI 免费额度，不升级 Paid，也不配置付费模型或预付费额度。Cloudflare 当前提供每日 10,000 Neurons 免费额度，超额请求会失败；额度和规则可能调整，部署前应再次核对[官方价格页](https://developers.cloudflare.com/workers-ai/platform/pricing/)。网页会显示“今日免费额度已用完”，不会尝试付费调用。录音识别只是语音转文字，不是发音评测。断网时课程仍可按原有方式学习，AI 对话不可用。

## 部署

1. 用户注册 [Cloudflare 免费账号](https://dash.cloudflare.com/sign-up)，保持 Workers Free 方案。
2. 在本目录执行 `npx wrangler login`，由用户亲自完成浏览器登录和授权。
3. 执行 `npx wrangler deploy`，获得 `https://wordspring-ai.<你的子域>.workers.dev`。
4. 执行 `npx wrangler secret put PASSCODE`，输入一段仅本人知道的随机口令。不要把口令写入文件或发送到聊天中。
5. 用户的 iPhone 无法连接 `workers.dev`，所以网页改用 `https://wordspring-ai-pages.pages.dev`。Pages Function 通过服务绑定在 Cloudflare 内部调用 `wordspring-ai` Worker；同一访问口令继续有效。在 WordSpring 的“AI 自由对话 → 服务设置”中只需填写口令。发布网页后用真机验证文字、录音、朗读及额度错误提示。

本地检查：在仓库根目录运行 `node cloudflare/check.mjs`。该测试使用模拟 AI，不消耗免费额度。真机上的 Safari 录音格式和 Cloudflare 模型联通性仍需部署后验证。

Cloudflare 官方说明，中国大陆访问其全球网络可能出现较高延迟或连接不稳定；免费方案不包含单独的中国网络。因此“手机独立使用”不等于保证在所有网络下 AI 对话都可用，需要在用户常用的移动网络上实际测试。[Cloudflare 中国网络说明](https://developers.cloudflare.com/china-network/)
