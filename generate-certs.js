const forge = require('node-forge');
const fs = require('fs');

console.log('Building secure cryptographic development certificate...');

try {
  // 1. Generate an RSA Keypair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // 2. Create an X.509 Certificate structure
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1); // 1-year window

  // 3. Define identities matching local lab assignment specs
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'RO' },
    { name: 'organizationName', value: 'Vigil Intelligence' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // 4. Self-sign the newly built certificate using our private key
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // 5. Convert keys to standardized PEM format text blocks
  const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
  const pemCert = forge.pki.certificateToPem(cert);

  // 6. Write out matching physical dependencies
  fs.writeFileSync('server.key', pemKey);
  fs.writeFileSync('server.cert', pemCert);

  console.log('✅ Success! server.key and server.cert created with valid PEM start lines.');
} catch (error) {
  console.error('❌ Generation error:', error.message);
}