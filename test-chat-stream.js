async function testStream() {
    console.log('Fetching /api/chat...');
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            body: JSON.stringify({ messages: [{ role: 'user', content: 'Say hello' }] }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            console.error('Error:', await response.text());
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            console.log('CHUNK:', chunk);
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}
testStream();
