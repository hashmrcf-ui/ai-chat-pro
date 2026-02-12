
async function testChat() {
    console.log('Testing /api/chat...');
    try {
        const res = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('Status:', res.status);
        if (!res.body) {
            console.log('No body');
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            console.log('Chunk:', chunk);
        }
        console.log('Stream done');
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testChat();
