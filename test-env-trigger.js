// Native fetch in Node 18+

async function testEnv() {
    console.log('Testing /api/test-env...');
    try {
        const res = await fetch('http://localhost:3000/api/test-env');
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testEnv();
