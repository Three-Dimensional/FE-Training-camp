# Laicai 股票实时查询服务

运行：

1. 创建虚拟环境并安装依赖：

```
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

2. 启动服务：

```
.venv/bin/uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload
```

示例：

- `GET /quote?symbol=sz000001`
- `GET /limit-status?symbol=600000`
- `WS /ws/quote?symbol=sh600000`

