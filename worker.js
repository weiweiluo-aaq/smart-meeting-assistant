/**
 * 独立 Worker - 用于会议数据存储
 * 绑定 KV: MEETING_DATA
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    };

    // GET - 读取数据
    if (request.method === 'GET') {
      const meetingId = url.searchParams.get('meetingId');
      if (!meetingId) {
        return new Response(JSON.stringify({ error: '缺少 meetingId' }), { status: 400, headers: corsHeaders });
      }

      try {
        const data = await env.MEETING_DATA.get(meetingId, 'json');
        return new Response(
          JSON.stringify({ success: true, data: data || { contents: [], participants: [] } }),
          { headers: corsHeaders }
        );
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // POST - 写入数据
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const { meetingId, content, participant } = body;

        if (!meetingId) {
          return new Response(JSON.stringify({ error: '缺少 meetingId' }), { status: 400, headers: corsHeaders });
        }

        const existingData = await env.MEETING_DATA.get(meetingId, 'json') || {
          contents: [],
          participants: [],
          createdAt: new Date().toISOString()
        };

        if (content && participant) {
          existingData.contents.push({
            id: Date.now(),
            content,
            participant,
            timestamp: new Date().toISOString()
          });

          if (!existingData.participants.includes(participant)) {
            existingData.participants.push(participant);
          }

          existingData.updatedAt = new Date().toISOString();
        }

        await env.MEETING_DATA.put(meetingId, JSON.stringify(existingData));

        return new Response(JSON.stringify({ success: true, data: existingData }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: '不支持的方法' }), { status: 405, headers: corsHeaders });
  }
};
