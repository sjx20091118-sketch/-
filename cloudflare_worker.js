/**
 * 《拾年》Cloudflare Worker 免费国内直连加速反向代理
 * 部署指引：
 * 1. 登录 https://dash.cloudflare.com/
 * 2. 点击 Workers & Pages -> Create Worker -> 命名如 shinian-api -> Deploy
 * 3. 点击 Edit code，将本文件代码全部粘贴覆盖并 Save and deploy
 * 4. 复制 Worker 分配的域名（或绑定自定义域名），填入《拾年》后台「云端后台 API 地址」即可！
 */

// 目标 Google Cloud 后端服务器地址
const TARGET_HOST = 'ais-pre-cq7pozdu24b5b7weqvtffs-80463223160.asia-northeast1.run.app';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 处理跨域预检请求 (CORS OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 重写目标 URL
    url.hostname = TARGET_HOST;
    url.protocol = 'https:';
    url.port = '';

    // 复制并构造请求头
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', TARGET_HOST);
    newHeaders.set('X-Forwarded-Host', request.headers.get('Host') || TARGET_HOST);
    newHeaders.set('X-Real-IP', request.headers.get('cf-connecting-ip') || '');

    // 转发请求至目标后端
    try {
      const response = await fetch(url.toString(), {
        method: request.method,
        headers: newHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      // 附加跨域头并返回
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
      responseHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Cloudflare Worker 代理转发异常',
          details: err ? err.message : 'Unknown error',
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
