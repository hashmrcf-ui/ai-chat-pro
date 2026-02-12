// Simple test script to verify presentation API
async function testPresentationAPI() {
    console.log('Testing Presentation API...');

    try {
        const response = await fetch('http://localhost:3000/api/presentation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: 'الذكاء الاصطناعي',
                slideCount: 8,
                template: 'professional'
            })
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            console.log('✅ API works! Presentation generated:', data.presentation.title);
        } else {
            console.error('❌ API error:', data.error, data.details);
        }
    } catch (error) {
        console.error('❌ Network error:', error);
    }
}

// Run the test
testPresentationAPI();
