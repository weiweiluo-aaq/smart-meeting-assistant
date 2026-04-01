/**
 * Cloudflare Pages Function - AI 代理
 * 解决前端调用 AI API 的 CORS 跨域问题
 * 
 * 使用方式：
 * POST /api/ai-proxy
 * Body: { "url": "https://api.deepseek.com/v1/chat/completions", "key": "sk-xxx", "model": "deepseek-chat", "messages": [...] }
 */

// 处理 CORS 预检请求
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { url, key, model, messages, temperature, max_tokens } = body;

    if (!url || !key || !model || !messages) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数: url, key, model, messages' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 构建请求到 AI API
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 2000
      })
    });

    // 获取响应数据
    const responseData = await apiResponse.json();

    // 返回给前端
    return new Response(
      JSON.stringify(responseData),
      { 
        status: apiResponse.status,
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error('AI 代理请求失败:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
