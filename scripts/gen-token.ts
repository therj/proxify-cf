import { SignJWT, exportJWK, generateKeyPair } from 'jose';

async function main() {
  console.log('Generating test JWT...');
  
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  
  const jwt = await new SignJWT({ email: 'test@example.com' })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-kid-1' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
    
  console.log('JWT Token:');
  console.log(jwt);
  
  const jwk = await exportJWK(publicKey);
  console.log('\nPublic JWK (insert into D1 for testing):');
  console.log(JSON.stringify(jwk, null, 2));
  
  console.log('\nCurl command to test API:');
  console.log(`curl -H "Authorization: Bearer ${jwt}" http://127.0.0.1:8787/some-protected-route`);
}

main().catch(console.error);
