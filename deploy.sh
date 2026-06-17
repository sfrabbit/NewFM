#!/bin/bash
# 腾讯云部署脚本

echo "=== FM战术引擎部署脚本 ==="
echo ""

# 检查是否在正确目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在 fm-tactical-engine 目录中运行此脚本"
    exit 1
fi

echo "1. 安装依赖..."
npm install

echo ""
echo "2. 构建前端..."
node tools/build.cjs

echo ""
echo "3. 检查关键文件..."
if [ -f "public/fm-engine.js" ]; then
    echo "✅ public/fm-engine.js 已生成"
    ls -lh public/fm-engine.js
else
    echo "❌ public/fm-engine.js 未找到"
    exit 1
fi

echo ""
echo "4. 部署文件清单:"
echo "   - engine/ (目录)"
echo "   - server/ (目录)"
echo "   - public/ (目录)"
echo "   - package.json"
echo ""

echo "=== 部署准备完成 ==="
echo ""
echo "请手动上传到腾讯云:"
echo "  环境ID: newfm-270069-8"
echo "  地址: https://newfm-270069-8-1443065697.sh.run.tcloudbase.com/"
echo ""
echo "或者在腾讯云控制台执行:"
echo "  PORT=8080 node server/index.js"
