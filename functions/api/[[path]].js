/**
 * Cloudflare Pages Function
 * 用于会议数据的读写操作
 */

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const meetingId = url.searchParams.get('meetingId');

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: '缺少 meetingId 参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 从 KV 读取数据
    const data = await env.MEETING_DATA.get(meetingId, 'json');

    return new Response(
      JSON.stringify({ success: true, data: data || { contents: [], participants: [] } }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('读取数据失败:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { meetingId, content, participant } = body;

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: '缺少 meetingId 参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取现有数据
    const existingData = await env.MEETING_DATA.get(meetingId, 'json') || {
      contents: [],
      participants: [],
      createdAt: new Date().toISOString()
    };

    // 添加新内容
    if (content && participant) {
      existingData.contents.push({
        id: Date.now(),
        content,
        participant,
        timestamp: new Date().toISOString()
      });

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
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('保存数据失败:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
