/**
 * Cloudflare Pages Function
 * 用于会议数据的读写操作和AI代理
 */

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

// 处理 CORS 预检请求
export async function onRequestOptions({ request }) {
  const url = new URL(request.url);
  
  // 如果是 AI 代理请求，添加额外头
  if (url.pathname.includes('/ai-proxy')) {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }
  
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // AI 代理请求
  if (url.pathname.includes('/ai-proxy')) {
    return handleAIProxy(request, env);
  }

  // 同步请求：获取会议历史或待办事项
  const syncType = url.searchParams.get('syncType');
  if (syncType === 'meetingsHistory') {
    try {
      const data = await env.MEETING_DATA.get('global_meetingsHistory', 'json') || [];
      return new Response(
        JSON.stringify({ success: true, data: data }),
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('读取会议历史失败:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  }
  if (syncType === 'meetingTodos') {
    try {
      const data = await env.MEETING_DATA.get('global_meetingTodos', 'json') || [];
      return new Response(
        JSON.stringify({ success: true, data: data }),
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('读取待办事项失败:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // 会议数据请求
  try {
    const meetingId = url.searchParams.get('meetingId');

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: '缺少 meetingId 参数' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 从 KV 读取数据
    const data = await env.MEETING_DATA.get(meetingId, 'json');

    return new Response(
      JSON.stringify({ success: true, data: data || { contents: [], participants: [] } }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('读取数据失败:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // AI 代理请求
  if (url.pathname.includes('/ai-proxy')) {
    return handleAIProxy(request, env);
  }

  // 同步请求：保存会议历史或待办事项
  const syncType = url.searchParams.get('syncType');
  if (syncType === 'meetingsHistory') {
    try {
      const body = await request.json();
      await env.MEETING_DATA.put('global_meetingsHistory', JSON.stringify(body));
      return new Response(
        JSON.stringify({ success: true }),
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('保存会议历史失败:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  }
  if (syncType === 'meetingTodos') {
    try {
      const body = await request.json();
      await env.MEETING_DATA.put('global_meetingTodos', JSON.stringify(body));
      return new Response(
        JSON.stringify({ success: true }),
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('保存待办事项失败:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // 会议数据请求
  try {
    const body = await request.json();
    const { meetingId, participant, lastWeek, thisWeek, blockers, risks, others } = body;

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: '缺少 meetingId 参数' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 获取现有数据
    const existingData = await env.MEETING_DATA.get(meetingId, 'json') || {
      contents: [],
      participants: [],
      createdAt: new Date().toISOString()
    };

    // 添加新内容（支持新字段格式）
    if (participant) {
      const newContent = {
        id: `CONTENT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        participant: participant,
        lastWeek: lastWeek || '',
        thisWeek: thisWeek || '',
        blockers: blockers || '',
        risks: risks || '',
        others: others || '',
        timestamp: new Date().toISOString()
      };
      existingData.contents.push(newContent);

      // 添加参与者（去重）
      if (!existingData.participants.includes(participant)) {
        existingData.participants.push(participant);
      }

      existingData.updatedAt = new Date().toISOString();
    }

    // 保存到 KV
    await env.MEETING_DATA.put(meetingId, JSON.stringify(existingData));

    return new Response(
      JSON.stringify({ success: true, data: existingData }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('保存数据失败:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// AI 代理处理函数
async function handleAIProxy(request, env) {
  try {
    const body = await request.json();
    const { url, key, model, messages, temperature, max_tokens } = body;

    console.log('AI代理收到请求:', { url, model, hasKey: !!key });

    if (!url || !key || !model || !messages) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数: url, key, model, messages' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 调用实际的 AI API
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

    console.log('AI API响应状态:', apiResponse.status);

    // 获取响应数据
    const responseData = await apiResponse.json();
    console.log('AI API响应:', JSON.stringify(responseData).substring(0, 500));

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
