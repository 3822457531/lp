# 兰瓶美业连锁店 — 静态 UI

三端静态演示（无后端）：**店长端**、**员工端**、**PC 管理后台**。消费者无独立入口。

## 打开方式

浏览器打开 `index.html`，或：

| 端 | 入口 |
|----|------|
| **店长端** | `manager/login.html` |
| **员工端** | `staff/login.html` |
| **PC 管理后台** | `admin/dashboard.html` |

共用粉系移动样式：`css/mobile-app.css`。

## 店长端（manager/）

| 功能 | 文件 | 说明 |
|------|------|------|
| 登录 / 工作台 | `login.html` `home.html` | 9 宫格 + 今日数据 |
| 客户管理 | `customers.html` | 本店客户，可新增，不可改资料 |
| 员工管理 | `employees.html` | 维护员工，待审核通过/拒绝 |
| 项目管理 | `projects.html` | 总部数据，只读 |
| 核销列表 | `verify.html` | 核销记录，支持补次/退次 |
| 充值开卡 | `recharge.html` | 开卡/充值流水 |
| 出入库 | `inventory.html` | 门店调度 / 系统分发 |
| 预约列表 | `appointments.html` | 改约、取消 |
| 考核情况 | `assessment.html` | 本店员工合格情况 |
| 打卡 | `clockin.html` | Wi‑Fi / 定位 / 人脸 |
| 设置 | `settings.html` | 生日提醒开关与天数 |

## 员工端（staff/）

| 功能 | 文件 | 说明 |
|------|------|------|
| 登录 / 首页 | `login.html` `home.html` | 6 宫格入口 |
| 客户 | `customers.html` | 本店客户列表 |
| 核销三步 | `verify-step1~3.html` | 选项目 → 发短信链接 → 扫码确认 |
| 预约 | `appointments.html` `appointment-list.html` | 新建与维护 |
| 打卡 | `clockin.html` | 出勤打卡 |
| 考核 | `assessment.html` | 个人指标与是否合格 |
| 薪资 | `salary.html` | 本月与历史拆分 |

## PC 管理后台（admin/）

见 `admin/dashboard.html` 侧栏：看板、客户、员工、项目、开卡、核销、预约、审核、薪资、考核、设置、福利。
