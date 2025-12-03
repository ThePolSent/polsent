const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express(); app.use(cors());

const proxyOpts = { changeOrigin: true };
app.use('/api/auth', createProxyMiddleware({ target: 'http://localhost:3001', pathRewrite: {'^/api/auth':''}, ...proxyOpts }));
app.use('/api/academic', createProxyMiddleware({ target: 'http://localhost:3002', pathRewrite: {'^/api/academic':''}, ...proxyOpts }));
app.use('/api/enrollment', createProxyMiddleware({ target: 'http://localhost:3003', pathRewrite: {'^/api/enrollment':''}, ...proxyOpts }));
app.use('/api/payments', createProxyMiddleware({ target: 'http://localhost:3004', pathRewrite: {'^/api/payments':''}, ...proxyOpts }));

app.listen(3000, () => console.log('API GATEWAY UTP PRO corriendo en 3000'));