# 服务器部署

目标主机：`82.157.197.102`；SSH 用户：`ubuntu`。密码不写入仓库或部署包。

该站点通过宿主机 Nginx 的 80 端口提供静态资源，现有 8000 端口容器应用独立运行。站点配置见 `nginx.conf`，安装到 `/etc/nginx/sites-available/historical-nebula`，通过 `sites-enabled` 启用。

文件布局：

```text
/srv/historical-nebula/
  releases/<UTC时间>/       # 完整构建版本及 gzip 文件
  current -> releases/...  # 当前发布版本
```

更新前运行 `npm test` 和 `npm run build`，只打包 `dist/`。上传后校验 SHA-256，解压到新版本目录，生成 gzip 副本，再原子切换 `current` 软链接。Nginx 对带哈希的 assets 设置长期缓存，对正文、索引和 HTML 使用协商缓存，避免版本更新后读到旧数据。

配置更新先执行 `sudo nginx -t`，通过后执行 `sudo systemctl reload nginx`。日常状态使用 `sudo systemctl status nginx`；日志在 `/var/log/nginx/historical-nebula.access.log` 和 `.error.log`。

回退时将 `current` 原子切换回一个已核验的旧版本目录，无需覆盖其文件。历史版本保留，清理需单独确认具体目录。所有站点资源，包括 130 卷和数据署名文件，随版本部署。

当前按 IP 提供 HTTP。启用域名 HTTPS 时需配置已解析到此主机的域名及对应证书。

## 本次发布记录

- 发布日期：2026-09-29。
- 当前版本：`20260929-shiji-full-01`。
- 访问地址：`http://82.157.197.102/?topic=shiji&undated=1`。
- 压缩包 SHA-256：`420fd4af4bf0b88a40e5ecb0d83707f6b18135a7ab1f490bc78b53072ed516e7`。
- 服务器 141 个构建文件均与本机 SHA-256 相符；130 卷目录和第 130 卷（152 个段落）通过公网 HTTP 验证。
- 首页、主脚本返回 200，主脚本 gzip 传输约 1.49 MB；Nginx 配置检查通过，服务 active/enabled。
- 发布前 36 项测试及生产构建通过；既有容器维持运行。
- 浏览器自动化连接在本次线上检查时不可用，线上检查使用 HTTP 与完整文件校验；本机浏览器功能验证见开发验收记录。
