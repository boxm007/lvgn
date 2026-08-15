async function testApiVerification() {
  console.log('--- Testing API Key Verification Endpoint ---');

  // Test 1: Valid Key
  console.log('\n1. Testing with Valid API Key...');
  try {
    const res = await fetch('http://localhost:3000/api/settings/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'sk-bf130ef5a80f410d8eb1a85b8e1e5840',
        baseURL: 'https://api.deepseek.com',
        model: 'deepseek-chat'
      })
    });
    const data = await res.json();
    console.log('Status Code:', res.status);
    console.log('Response Data:', data);
    if (data.success) {
      console.log('🟢 Test 1 Passed: Connected and received reply (Green status):', data.reply);
    } else {
      console.log('🔴 Test 1 Failed:', data.error);
    }
  } catch (err) {
    console.error('Test 1 Request error:', err.message);
  }

  // Test 2: Invalid Key (should return 401 error with Red status)
  console.log('\n2. Testing with Invalid Key (sk-invalid-fake-key-12345)...');
  try {
    const res2 = await fetch('http://localhost:3000/api/settings/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'sk-invalid-fake-key-12345',
        baseURL: 'https://api.deepseek.com',
        model: 'deepseek-chat'
      })
    });
    const data2 = await res2.json();
    console.log('Status Code:', res2.status);
    console.log('Response Data:', data2);
    if (!data2.success && (res2.status === 401 || data2.error)) {
      console.log('🔴 Test 2 Passed: Correctly reported error (Red status):', data2.error);
    } else {
      console.log('Unexpected response:', data2);
    }
  } catch (err) {
    console.error('Test 2 Request error:', err.message);
  }
}

testApiVerification();
