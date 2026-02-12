// Native fetch is available in Node 18+


async function testLocalApi() {
    console.log('Testing local /api/chat...');
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'Hello, are you working?' }
                ]
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Status: ${response.status} ${response.statusText}`);
            console.error('Error body:', text);
            return;
        }

        console.log('Response OK. Reading stream...');
        const buffer = await response.text(); // Read text directly
        console.log('Raw Response Length:', buffer.length);
        console.log('Raw Response Preview:', buffer.substring(0, 500));

    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

testLocalApi();
