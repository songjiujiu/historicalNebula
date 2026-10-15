# 发布与运行包

首个 GitHub Release 使用 `v0.1.0`，对应 `package.json` 的 `0.1.0`。这是当前功能的首次公开版本快照；0.x 版本仍可能调整接口和内容格式。此前开发提交不追记成已经发布过的版本。功能变化记录在 [CHANGELOG](../CHANGELOG.md)。

## 从干净克隆验证

使用 Node.js 24、Python 3.12 与 npm。在仓库根目录运行：

```bash
npm ci
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism --testTimeout=20000
npm run build
python -m pip install -r backend/requirements-dev.txt
python -m pytest -q backend/tests
node scripts/package-release.mjs
```

测试以单 worker 顺序运行；单项超时设为 20 秒，为较慢机器读取语料文件和模块首次加载预留时间，测试断言和覆盖范围不变。`build` 包含 TypeScript 检查。后端现有测试使用测试语料对象，不连接生产 MySQL；通过这些检查不等于验证了生产数据库、整站浏览器交互或全部历史内容。发布前应对准备公开的演示地址另行验证首页、原文、检索与深链接。

脚本在 `artifacts/release/` 写入两个 ZIP、外部 `SHA256SUMS` 和 `RELEASE_NOTES.md`。默认修订值为 `local-build`；需要记录准确来源时，可将 `RELEASE_REVISION` 环境变量设为完整提交 SHA。`RELEASE_TAG` 若非空，必须严格等于 `v` 加上 `package.json` 版本。

## 下载包的边界

| 附件 | 内容 | 运行前提 |
| --- | --- | --- |
| `historical-nebula-<version>-frontend.zip` | Vite 生产构建、许可、来源说明、逐文件校验清单 | Web 静态服务，并将同源 `/api/` 转发至 Flask |
| `historical-nebula-<version>-backend.zip` | Flask 和导入器 Python 源码、`requirements.txt`、部署说明、许可与校验清单 | Python、依赖、MySQL 和另行准备的已审核语料 |
| `SHA256SUMS` | 两个 ZIP 的 SHA-256 | 用于核对下载完整性 |

两个运行包均不包含 `public/data` 语料、数据库或数据库转储、`.env`、凭据、虚拟环境及 `node_modules`。打包脚本采用明确收录清单，拒绝符号链接、隐藏文件和数据库文件；它不会把仓库根目录整体压缩。打包完成后还会解压内存中的最终 ZIP，核对文件清单和哈希。

每个包内都保留 `LICENSE`、`THIRD_PARTY_NOTICES.md`、`docs/licensing.md`，并把四组 `data/*/README.md` 复制至 `docs/sources/`。前端包另外在 `licenses/` 保留实际安装版本的 opencc-js 许可证、第三方声明和 `LICENSES` 全文，以及 three 的许可证。这些来源说明可能链接仓库中的原始快照；需要沿链接追溯时，请使用同一 tag 的完整源码。项目代码许可不替代语料、转录、图谱和第三方软件的原有许可；附带说明也不代表所有内容或媒体的权利状态已核清。

GitHub 自动生成的 **Source code** 附件是 tag 的完整源码快照，与上述运行包不同，可能包含版本化的语料及原始来源文件。使用它们时须遵循 [许可范围](licensing.md) 和各来源说明。公开演示使用的静态语料构建也与这里的生产前端包分开。

下载后，Linux/macOS 可在附件目录运行：

```bash
sha256sum --check SHA256SUMS
```

Windows PowerShell 可用 `Get-FileHash -Algorithm SHA256 <文件名>` 对照 `SHA256SUMS`。ZIP 解压后的内部 `SHA256SUMS` 可用同样方式检查；解压文件时保持目录结构。

## Flask/MySQL 安装

前端 ZIP 不是独立离线阅读器：导读和书目可显示，但原文与正文检索需要 API。把前端包解压到独立网站目录；将后端包解压到网站目录之外，创建 Python 虚拟环境并安装 `backend/requirements.txt`。

从相同 tag 的源码取得已审核的 `public/data`，按各来源说明检查许可与缺录。通过服务器环境设置 `HISTORY_DB_HOST`、`HISTORY_DB_PORT`、`HISTORY_DB_NAME`、`HISTORY_DB_USER`、`HISTORY_DB_PASSWORD`，再运行 `python -m backend.import_corpus --root <语料目录> --release <唯一版本号>`。导入凭据与只读 API 凭据应分开配置。配置示例及服务部署步骤见源码仓库的 [deploy/README.md](../deploy/README.md)；后端 ZIP 内对应文档为 `docs/deployment.md`，其中已有服务器路径和端口须按自己的环境调整。

由 Gunicorn 加载 `backend.app:create_app()`，反向代理同源 `/api/` 请求。启用新版本前检查 `/api/v1/health`，再抽查《史记》、二十四史和清至当代正文。这里的 GitHub 发布流程不会登录服务器、修改数据库或运行 `deploy/activate-release.sh`。

## GitHub Actions 与正式发布

`.github/workflows/ci.yml` 对 `main`、`master`、`codex/**` 分支推送和拉取请求执行上述检查，并上传保留 14 天的构建附件。它也允许手动运行，并可由发布工作流调用。CI 使用只读仓库权限，不需要数据库密码或部署密钥。

发布前先完成以下顺序：

1. 更新 `package.json`、锁文件版本和 `CHANGELOG.md`，检查许可及公开演示链接。
2. 提交变更并等待 CI 成功，记录准备发布的完整提交 SHA。
3. 在该提交上创建注释标签，例如 `git tag -a v0.1.0 <完整提交SHA> -m "Historical Nebula v0.1.0"`，再推送该标签：`git push origin v0.1.0`。
4. 标签触发 `release.yml`，再次运行同一套 CI，校验标签和版本一致。只有验证成功后，独立的发布 job 才取得 `contents: write` 权限，下载本次 CI 产物、核对 ZIP 哈希并创建 GitHub Release。

发布命令使用 `gh release create --verify-tag`，不会自动从默认分支创建标签。不存在匹配标签、检查失败、缺失许可文件或版本不匹配时停止发布。不要移动已经发布的标签来替换文件；修复后增加新版本并创建新标签。已有同名 Release 时自动步骤会报错，不会静默覆盖已下载的版本。

生成的发布说明链接本次 tag 的 changelog、部署和许可文档；记录实际构建修订。GitHub Release 的生成只负责发布附件，不等于生产服务器已更新，也不代表已有用户、下载或第三方采用。
